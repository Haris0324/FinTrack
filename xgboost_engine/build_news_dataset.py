"""
╔══════════════════════════════════════════════════════════════════════════════╗
║          BUILD NEWS-DRIVEN XGBOOST TRAINING DATASET                        ║
║                                                                              ║
║  This script pulls every article from MongoDB, fetches the real BTC price   ║
║  3 hours after publication from Binance historical API, and builds a        ║
║  fully-labelled CSV ready for XGBoost training.                             ║
║                                                                              ║
║  Output: xgboost_engine/data/news_training_dataset.csv                      ║
║                                                                              ║
║  Run once (or periodically to grow the dataset):                            ║
║    python xgboost_engine/build_news_dataset.py                              ║
╚══════════════════════════════════════════════════════════════════════════════╝

DATASET SCHEMA — every row is ONE news article:

  INPUT FEATURES (what the model learns from):
  ─────────────────────────────────────────────
  finbert_positive_prob    float  0.0–1.0   FinBERT P(positive)
  finbert_negative_prob    float  0.0–1.0   FinBERT P(negative)
  finbert_neutral_prob     float  0.0–1.0   FinBERT P(neutral)
  finbert_confidence       float  0.0–1.0   FinBERT max-class confidence score
  sentiment_encoded        int    -1/0/1    NEGATIVE=-1, NEUTRAL=0, POSITIVE=1
  relevance_weight         float  0.45–1.0  Bitcoin=1.0, GenCrypto=0.82, Macro=0.68, Irrelevant=0.45
  urgency_flag             int    0/1       1 if article flagged as urgent/breaking
  entity_count             int    0–12      Number of named entities detected
  has_bitcoin              int    0/1       1 if Bitcoin entity present
  has_sec                  int    0/1       1 if SEC entity present
  has_fed                  int    0/1       1 if Federal Reserve entity present
  has_blackrock            int    0/1       1 if BlackRock entity present
  has_binance              int    0/1       1 if Binance entity present
  has_elon                 int    0/1       1 if Elon Musk entity present
  source_weight            float  0.5–1.0   Bloomberg=1.0, Reuters=0.95, CoinDesk=0.85, CT=0.80, Other=0.60
  hour_of_day              int    0–23      UTC hour of publication (market sessions matter)
  day_of_week              int    0–6       0=Monday, 6=Sunday
  title_word_count         int    3–30      Number of words in headline
  score_x_relevance        float  derived   finbert_confidence × relevance_weight (interaction feature)
  bull_bear_spread         float  derived   positive_prob − negative_prob
  price_at_news            float            BTC price (USD) at article publication time

  TARGET LABELS (what the model predicts):
  ─────────────────────────────────────────
  btc_price_3h_after       float            BTC close price 3h after publication (from Binance)
  actual_return_3h_pct     float            (price_3h - price_at_news) / price_at_news × 100
  target_direction         int    0/1/2     0=BEARISH(<-0.5%), 1=NEUTRAL, 2=BULLISH(>+0.5%)
  target_high_impact       int    0/1       1 if abs(return) > 2.0%
"""

import os
import sys
import time
import json
import requests
import pandas as pd
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv

# ── Path setup ────────────────────────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.abspath(os.path.join(BASE_DIR, ".."))
OUTPUT_DIR = os.path.join(BASE_DIR, "data")
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Load .env from web or data_pipeline
for env_path in [
    os.path.join(ROOT_DIR, "web", ".env.local"),
    os.path.join(ROOT_DIR, "data_pipeline", ".env"),
    os.path.join(ROOT_DIR, ".env"),
]:
    if os.path.exists(env_path):
        load_dotenv(env_path)
        break

MONGO_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017/fintrack")

# ── Constants ─────────────────────────────────────────────────────────────────
BINANCE_KLINES_URL = "https://api.binance.com/api/v3/klines"
DIRECTION_THRESHOLD = 0.5   # % — returns > +0.5% = BULLISH, < -0.5% = BEARISH
HIGH_IMPACT_THRESHOLD = 2.0  # % — abs return > 2% = HIGH IMPACT

SOURCE_WEIGHTS = {
    "bloomberg": 1.00,
    "reuters": 0.95,
    "coindesk": 0.85,
    "cointelegraph": 0.80,
    "cryptopanic": 0.72,
    "investing.com": 0.75,
    "decrypt": 0.73,
}

RELEVANCE_WEIGHTS = {
    "Bitcoin-Specific": 1.00,
    "General Cryptocurrency": 0.82,
    "Global Financial Markets": 0.68,
    "Irrelevant Content": 0.45,
}

KNOWN_ENTITIES = ["Bitcoin", "SEC", "Federal Reserve", "BlackRock", "Binance",
                  "Coinbase", "Ethereum", "Solana", "XRP", "Elon Musk", "MicroStrategy"]


# ── Binance 3-hour price fetcher ──────────────────────────────────────────────
def fetch_btc_price_3h_after(published_at: datetime, retries: int = 3) -> float | None:
    """
    Fetches the BTC/USDT close price ~3 hours after the article was published.
    Uses Binance 1-hour klines: fetches 4 candles starting from publication time,
    and returns the close of candle index 3 (= 3h after).
    Returns None if data unavailable (article too recent or API failure).
    """
    target_time = published_at + timedelta(hours=3)

    # Cannot fetch future prices — article too recent
    if target_time > datetime.now(timezone.utc) - timedelta(minutes=5):
        return None

    start_ms = int(published_at.timestamp() * 1000)

    for attempt in range(retries):
        try:
            params = {
                "symbol": "BTCUSDT",
                "interval": "1h",
                "startTime": start_ms,
                "limit": 4,
            }
            resp = requests.get(BINANCE_KLINES_URL, params=params, timeout=8)
            if resp.status_code == 200:
                klines = resp.json()
                if len(klines) >= 4:
                    # klines[3] = [open_time, open, high, low, close, ...]
                    return float(klines[3][4])   # close of 3rd hourly candle
                elif klines:
                    return float(klines[-1][4])  # best available
            time.sleep(0.5 * (attempt + 1))
        except Exception as e:
            print(f"  Binance API warning (attempt {attempt+1}): {e}")
            time.sleep(1)

    return None


# ── Feature engineering ───────────────────────────────────────────────────────
def get_source_weight(source: str) -> float:
    if not source:
        return 0.60
    source_lower = source.lower()
    for key, weight in SOURCE_WEIGHTS.items():
        if key in source_lower:
            return weight
    return 0.60


def extract_entity_flags(entities: list) -> dict:
    flags = {}
    for ent in KNOWN_ENTITIES:
        col = "has_" + ent.lower().replace(" ", "_").replace(".", "")
        flags[col] = 1 if ent in entities else 0
    flags["entity_count"] = len(entities) if entities else 0
    return flags


def build_features(article: dict) -> dict | None:
    """
    Converts a raw MongoDB article document into the feature row.
    Returns None if critical fields are missing.
    """
    # ── Required fields ──────────────────────────────────────────────────────
    price_at_news = article.get("price_at_news")
    if not price_at_news or price_at_news == 0:
        return None

    sentiment = str(article.get("sentiment", "NEUTRAL")).upper()
    score = float(article.get("score", 0.5))
    probs = article.get("probabilities", {})
    relevance = article.get("relevance", "Irrelevant Content")
    urgency = int(bool(article.get("urgency", False)))
    entities = article.get("entities", [])
    source = article.get("source", "")
    title = article.get("title", "")

    # ── Parse publication time ───────────────────────────────────────────────
    pub_raw = article.get("published_at") or article.get("scraped_at") or article.get("createdAt")
    if pub_raw is None:
        return None
    if isinstance(pub_raw, str):
        try:
            pub_raw = datetime.fromisoformat(pub_raw.replace("Z", "+00:00"))
        except Exception:
            return None
    if not pub_raw.tzinfo:
        pub_raw = pub_raw.replace(tzinfo=timezone.utc)

    # ── FinBERT probability features ─────────────────────────────────────────
    pos_prob  = float(probs.get("positive", 0.15))
    neg_prob  = float(probs.get("negative", 0.15))
    neu_prob  = float(probs.get("neutral", 0.70))

    # ── Encode sentiment ─────────────────────────────────────────────────────
    sent_enc = 1 if sentiment == "POSITIVE" else (-1 if sentiment == "NEGATIVE" else 0)

    # ── Relevance + source weights ───────────────────────────────────────────
    rel_weight = RELEVANCE_WEIGHTS.get(relevance, 0.45)
    src_weight = get_source_weight(source)

    # ── Time features ────────────────────────────────────────────────────────
    hour_of_day  = pub_raw.hour
    day_of_week  = pub_raw.weekday()

    # ── Interaction features ─────────────────────────────────────────────────
    score_x_rel    = round(score * rel_weight, 4)
    bull_bear_spread = round(pos_prob - neg_prob, 4)

    # ── Entity flags ─────────────────────────────────────────────────────────
    entity_flags = extract_entity_flags(entities)

    row = {
        # FinBERT features
        "finbert_positive_prob": round(pos_prob, 4),
        "finbert_negative_prob": round(neg_prob, 4),
        "finbert_neutral_prob":  round(neu_prob, 4),
        "finbert_confidence":    round(score, 4),
        "sentiment_encoded":     sent_enc,
        # Context features
        "relevance_weight":      rel_weight,
        "urgency_flag":          urgency,
        "source_weight":         src_weight,
        # Entity features
        **entity_flags,
        # Time features
        "hour_of_day":           hour_of_day,
        "day_of_week":           day_of_week,
        # Text features
        "title_word_count":      len(title.split()),
        # Interaction / derived features
        "score_x_relevance":     score_x_rel,
        "bull_bear_spread":      bull_bear_spread,
        # Price at publication
        "price_at_news":         float(price_at_news),
        # Metadata (not used as features, kept for debugging)
        "_published_at":         pub_raw.isoformat(),
        "_title":                title[:120],
        "_sentiment":            sentiment,
    }
    return row


# ── Target labelling ──────────────────────────────────────────────────────────
def label_direction(ret_pct: float) -> int:
    if ret_pct > DIRECTION_THRESHOLD:
        return 2   # BULLISH
    elif ret_pct < -DIRECTION_THRESHOLD:
        return 0   # BEARISH
    else:
        return 1   # NEUTRAL


# ── Main builder ──────────────────────────────────────────────────────────────
def build_dataset():
    print("=" * 70)
    print("BUILDING NEWS-DRIVEN XGBOOST TRAINING DATASET")
    print("=" * 70)

    # Connect to MongoDB
    try:
        from pymongo import MongoClient
        client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=8000)
        db = client["fintrack"]
        collection = db["news"]
        total = collection.count_documents({})
        print(f"\n✓ Connected to MongoDB. Total articles: {total}")
    except Exception as e:
        print(f"✗ MongoDB connection failed: {e}")
        print("  Make sure MONGODB_URI is set in your .env file.")
        return

    articles = list(collection.find(
        {"price_at_news": {"$exists": True, "$gt": 0}},
        {
            "title": 1, "source": 1, "published_at": 1, "scraped_at": 1, "createdAt": 1,
            "sentiment": 1, "score": 1, "probabilities": 1, "relevance": 1,
            "urgency": 1, "entities": 1, "price_at_news": 1
        }
    ))

    print(f"  Articles with price_at_news: {len(articles)}")
    print(f"\nBuilding features + fetching Binance 3h prices...")
    print(f"(This may take a few minutes due to Binance API rate limits)\n")

    rows = []
    skipped_no_features   = 0
    skipped_no_btc_price  = 0
    skipped_too_recent    = 0
    processed             = 0

    for i, article in enumerate(articles):
        if (i + 1) % 50 == 0:
            print(f"  Progress: {i+1}/{len(articles)} | Valid rows so far: {len(rows)}")

        feat_row = build_features(article)
        if feat_row is None:
            skipped_no_features += 1
            continue

        # Parse publication time for Binance fetch
        pub_str = feat_row["_published_at"]
        pub_dt  = datetime.fromisoformat(pub_str)

        # Fetch 3h BTC price from Binance
        btc_3h = fetch_btc_price_3h_after(pub_dt)
        if btc_3h is None:
            skipped_too_recent += 1
            continue

        # Compute target
        price_at = feat_row["price_at_news"]
        ret_pct   = round((btc_3h - price_at) / price_at * 100, 4)

        feat_row["btc_price_3h_after"]   = btc_3h
        feat_row["actual_return_3h_pct"] = ret_pct
        feat_row["target_direction"]     = label_direction(ret_pct)
        feat_row["target_high_impact"]   = int(abs(ret_pct) > HIGH_IMPACT_THRESHOLD)

        rows.append(feat_row)
        processed += 1

        # Respect Binance rate limit (~1200 req/min)
        time.sleep(0.06)

    print(f"\n{'='*70}")
    print(f"Dataset Build Complete:")
    print(f"  ✓ Valid labelled rows : {len(rows)}")
    print(f"  ✗ Missing features    : {skipped_no_features}")
    print(f"  ✗ Too recent (<3h old): {skipped_too_recent}")
    print(f"{'='*70}")

    if not rows:
        print("\n⚠ No data rows collected.")
        print("  Your MongoDB may not have enough articles with price_at_news yet.")
        print("  Run the pipeline for a few days to accumulate data, then re-run this script.")
        return

    df = pd.DataFrame(rows)

    # Class distribution
    dir_counts = df["target_direction"].value_counts().sort_index()
    print(f"\nDirection class distribution:")
    print(f"  BEARISH (0): {dir_counts.get(0, 0)}")
    print(f"  NEUTRAL (1): {dir_counts.get(1, 0)}")
    print(f"  BULLISH (2): {dir_counts.get(2, 0)}")
    print(f"\nHigh-Impact events: {df['target_high_impact'].sum()} / {len(df)}")

    out_path = os.path.join(OUTPUT_DIR, "news_training_dataset.csv")
    df.to_csv(out_path, index=False)
    print(f"\n✓ Dataset saved to: {out_path}")
    print(f"  Rows: {len(df)} | Columns: {len(df.columns)}")
    print(f"\nNext step → run: python xgboost_engine/prepare_news_features.py")


if __name__ == "__main__":
    build_dataset()
