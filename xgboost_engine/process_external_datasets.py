"""
╔══════════════════════════════════════════════════════════════════════════════╗
║        EXTERNAL DATASET PROCESSOR FOR XGBOOST TRAINING                     ║
║                                                                              ║
║  Accepts any manually downloaded CSV dataset containing news headlines      ║
║  + timestamps, runs FinBERT inference on each headline, fetches the         ║
║  real BTC 3-hour price change from Binance, and outputs a fully             ║
║  labelled training CSV compatible with prepare_news_features.py.            ║
║                                                                              ║
║  SUPPORTED DATASET FORMATS (auto-detected):                                 ║
║    1. CryptoVision (cryptodataset*.csv)                                      ║
║    2. Bitcoin Sentiments 2021-24 (bitcoin_sentiments*.csv)                  ║
║    3. Crypto News + Price (btc_news*.csv / crypto_news*.csv)                ║
║    4. Kaggle Bitcoin Headlines (bitcoin_headlines*.csv)                      ║
║    5. FinancialPhraseBank (Sentences_AllAgree.txt)                           ║
║    6. Generic CSV (auto-detect title/date columns)                           ║
║                                                                              ║
║  HOW TO USE:                                                                 ║
║    1. Download datasets (see README section below)                           ║
║    2. Place CSV files anywhere under FinTrack-main/                         ║
║    3. Run:  python xgboost_engine/process_external_datasets.py               ║
║    4. Then: python xgboost_engine/merge_all_datasets.py                      ║
║    5. Then: python xgboost_engine/prepare_news_features.py                  ║
║    6. Then: python xgboost_engine/train_xgboost.py                          ║
╚══════════════════════════════════════════════════════════════════════════════╝

═══════════════════════════════════════════════════════════════════════════════
 WHERE TO GET DATASETS (all free)
═══════════════════════════════════════════════════════════════════════════════

1. CryptoVision Dataset — Kaggle
   URL  : https://www.kaggle.com/datasets/oliviervha/crypto-news
   File : cryptodataset.csv
   Cols : date, title, text, label(positive/negative/neutral), source
   Size : ~15,000 articles  ← BEST ONE TO START WITH

2. Bitcoin News Sentiment 2021-2024 — Kaggle
   URL  : https://www.kaggle.com/datasets/bitcoinnewssentiment/bitcoin-news
   File : bitcoin_sentiments_21_24.csv
   Cols : Date, Short Description, Accurate Sentiments(-1 to +1)
   Size : ~8,000 articles

3. Crypto News + Bitcoin Price — Kaggle
   URL  : https://www.kaggle.com/datasets/cryptocurrencynews/crypto-news-plus-historical-price
   File : btc_news.csv
   Cols : date, title, label, close_price (BTC price same day)
   Size : ~6,000 articles

4. Cryptocurrency News Headlines — Kaggle
   URL  : https://www.kaggle.com/datasets/armitaraz/coindesk-bitcoin-articles
   File : coindesk_articles.csv
   Cols : datetime, title, category
   Size : ~5,000 articles

5. Bitcoin Historical OHLCV — Binance (auto-fetched)
   The script fetches BTC prices automatically using the Binance API.
   You do NOT need to download price data separately.

6. FinancialPhraseBank — GitHub
   URL  : https://huggingface.co/datasets/financial_phrasebank
   File : Sentences_AllAgree.txt
   Cols : "sentence text@label"
   Size : ~2,800 sentences (financial domain, not crypto-specific)
   Note : Useful for improving FinBERT — NOT ideal for XGBoost price prediction
          because it lacks timestamps for price labelling.
          Use for supplementary NLP training only.

═══════════════════════════════════════════════════════════════════════════════
 MINIMUM REQUIRED COLUMNS IN ANY CSV
═══════════════════════════════════════════════════════════════════════════════

  REQUIRED (one of each):
    • Title/Headline : title | headline | text | Short Description | summary
    • Date/Time      : date | datetime | published_at | timestamp | Date | Time

  OPTIONAL (used if present, skipped if missing):
    • source         : source | publisher | outlet
    • sentiment      : label | sentiment | Accurate Sentiments
    • url            : url | link

═══════════════════════════════════════════════════════════════════════════════
"""

import os
import sys
import time
import json
import re
import requests
import pandas as pd
import numpy as np
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv

# ── Path setup ────────────────────────────────────────────────────────────────
BASE_DIR  = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR  = os.path.abspath(os.path.join(BASE_DIR, ".."))
DATA_DIR  = os.path.join(BASE_DIR, "data")
os.makedirs(DATA_DIR, exist_ok=True)

sys.path.append(os.path.join(ROOT_DIR, "nlp_engine"))

for env_path in [
    os.path.join(ROOT_DIR, "web", ".env.local"),
    os.path.join(ROOT_DIR, "data_pipeline", ".env"),
]:
    if os.path.exists(env_path):
        load_dotenv(env_path)
        break

FINBERT_API_URL = os.getenv("FINBERT_API_URL", "http://localhost:8000/predict")
BINANCE_URL     = "https://api.binance.com/api/v3/klines"

RELEVANCE_WEIGHTS = {
    "Bitcoin-Specific":       1.00,
    "General Cryptocurrency": 0.82,
    "Global Financial Markets": 0.68,
    "Irrelevant Content":     0.45,
}
SOURCE_WEIGHTS = {
    "bloomberg": 1.00, "reuters": 0.95, "coindesk": 0.85,
    "cointelegraph": 0.80, "decrypt": 0.73, "cryptopanic": 0.72,
    "investing.com": 0.75, "yahoo": 0.70, "marketwatch": 0.75,
}
KNOWN_ENTITIES = [
    "Bitcoin", "SEC", "Federal Reserve", "BlackRock", "Binance",
    "Coinbase", "Ethereum", "Solana", "XRP", "Elon Musk", "MicroStrategy"
]
DIRECTION_THRESHOLD  = 0.5   # % → BULLISH if > +0.5%, BEARISH if < -0.5%
HIGH_IMPACT_THRESHOLD = 2.0  # % → HIGH IMPACT if abs(return) > 2%


# ══════════════════════════════════════════════════════════════════════════════
# DATASET LOADERS
# ══════════════════════════════════════════════════════════════════════════════

def _normalize_title_col(df: pd.DataFrame) -> pd.DataFrame:
    for col in ["title", "headline", "text", "Short Description", "summary", "content"]:
        if col in df.columns:
            df = df.rename(columns={col: "title"})
            return df
    raise ValueError(f"Cannot find title column. Found: {list(df.columns)}")


def _normalize_date_col(df: pd.DataFrame) -> pd.DataFrame:
    for col in ["date", "datetime", "published_at", "timestamp", "Date", "Time",
                "published", "pub_date", "created_at"]:
        if col in df.columns:
            df = df.rename(columns={col: "date"})
            return df
    raise ValueError(f"Cannot find date column. Found: {list(df.columns)}")


def _parse_dates(series: pd.Series) -> pd.Series:
    """Robust date parser that handles multiple formats."""
    def _parse_one(val):
        if pd.isna(val):
            return None
        try:
            dt = pd.to_datetime(val, utc=True, infer_datetime_format=True)
            return dt.to_pydatetime()
        except Exception:
            try:
                dt = pd.to_datetime(val, format="%Y-%m-%d", utc=True)
                return dt.to_pydatetime()
            except Exception:
                return None
    return series.apply(_parse_one)


def load_cryptovision(filepath: str) -> pd.DataFrame:
    """
    CryptoVision dataset — https://www.kaggle.com/datasets/oliviervha/crypto-news
    Expected columns: date, title, text, label, source
    """
    print(f"  Loading CryptoVision: {os.path.basename(filepath)}")
    df = pd.read_csv(filepath, low_memory=False)
    df = _normalize_title_col(df)
    df = _normalize_date_col(df)
    if "source" not in df.columns:
        df["source"] = "CryptoVision"
    return df[["title", "date", "source"]].dropna(subset=["title", "date"])


def load_bitcoin_sentiments(filepath: str) -> pd.DataFrame:
    """
    Bitcoin Sentiments 2021-24
    Expected columns: Date, Short Description, Accurate Sentiments
    """
    print(f"  Loading Bitcoin Sentiments: {os.path.basename(filepath)}")
    df = pd.read_csv(filepath, encoding="latin-1", low_memory=False)
    df = _normalize_title_col(df)
    df = _normalize_date_col(df)
    df["source"] = "Bitcoin News"
    return df[["title", "date", "source"]].dropna(subset=["title", "date"])


def load_generic_csv(filepath: str) -> pd.DataFrame:
    """
    Generic CSV loader — auto-detects title and date columns.
    """
    print(f"  Loading generic CSV: {os.path.basename(filepath)}")
    df = pd.read_csv(filepath, low_memory=False, encoding="utf-8",
                     encoding_errors="replace")
    try:
        df = _normalize_title_col(df)
    except ValueError as e:
        print(f"    ✗ Skipping — {e}")
        return pd.DataFrame()
    try:
        df = _normalize_date_col(df)
    except ValueError as e:
        print(f"    ✗ Skipping — {e}")
        return pd.DataFrame()

    src_col = next((c for c in df.columns if c.lower() in
                    ["source", "publisher", "outlet", "publication"]), None)
    df["source"] = df[src_col] if src_col else "External"
    return df[["title", "date", "source"]].dropna(subset=["title", "date"])


def load_financial_phrasebank(filepath: str) -> pd.DataFrame:
    """
    FinancialPhraseBank — only useful if no timestamps (we assign dummy date).
    NOTE: Without real timestamps we cannot fetch 3h BTC price.
    This dataset is only used if --no-price-fetch flag is set.
    """
    print(f"  Loading FinancialPhraseBank: {os.path.basename(filepath)}")
    rows = []
    with open(filepath, "r", encoding="latin-1") as f:
        for line in f:
            parts = line.strip().rsplit("@", 1)
            if len(parts) == 2:
                rows.append({"title": parts[0].strip(), "date": None, "source": "FinancialPhraseBank"})
    return pd.DataFrame(rows)


# ══════════════════════════════════════════════════════════════════════════════
# AUTO-DISCOVER DATASETS
# ══════════════════════════════════════════════════════════════════════════════

DATASET_LOADERS = {
    "cryptovision":          (["cryptovision", "cryptodataset"], load_cryptovision),
    "bitcoin_sentiments":    (["bitcoin_sentiment", "btc_sentiment"], load_bitcoin_sentiments),
    "btc_news":              (["btc_news", "btc.csv", "crypto_news"], load_generic_csv),
    "coindesk":              (["coindesk"], load_generic_csv),
    "bitcoin_headlines":     (["bitcoin_headline", "bitcoin_news"], load_generic_csv),
    "financial_phrasebank":  (["Sentences_AllAgree"], load_financial_phrasebank),
    "generic":               ([], load_generic_csv),   # fallback
}


def discover_datasets(search_root: str) -> list[tuple[str, str, callable]]:
    """Recursively finds CSV/TXT files and matches them to loaders."""
    found = []
    for dirpath, _, files in os.walk(search_root):
        # Skip virtual envs, node_modules, __pycache__
        if any(skip in dirpath for skip in ["node_modules", "__pycache__", ".next", "venv", ".git"]):
            continue
        for fname in files:
            ext = os.path.splitext(fname)[1].lower()
            if ext not in (".csv", ".txt"):
                continue
            fpath = os.path.join(dirpath, fname)
            fname_lower = fname.lower()
            matched = False
            for ds_name, (patterns, loader) in DATASET_LOADERS.items():
                if ds_name == "generic":
                    continue
                if any(p.lower() in fname_lower for p in patterns):
                    found.append((ds_name, fpath, loader))
                    matched = True
                    break
            # Generic CSV fallback — only pick up if has "news" or "crypto" in name
            if not matched and ext == ".csv":
                if any(kw in fname_lower for kw in ["news", "crypto", "bitcoin", "btc", "headline"]):
                    found.append(("generic_" + fname_lower[:20], fpath, load_generic_csv))

    return found


# ══════════════════════════════════════════════════════════════════════════════
# FINBERT INFERENCE
# ══════════════════════════════════════════════════════════════════════════════

_local_finbert_loaded = False
_local_tokenizer = None
_local_model = None
_local_device = None
ID2LABEL_LOCAL = {0: "positive", 1: "negative", 2: "neutral"}


def _load_local_finbert():
    global _local_finbert_loaded, _local_tokenizer, _local_model, _local_device
    if _local_finbert_loaded:
        return _local_model is not None
    try:
        import torch
        from transformers import AutoTokenizer, AutoModelForSequenceClassification
        model_path = os.path.join(ROOT_DIR, "nlp_engine", "finbert_finetuned", "best_model")
        if not os.path.exists(model_path):
            model_path = "ProsusAI/finbert"
        _local_device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        _local_tokenizer = AutoTokenizer.from_pretrained(model_path)
        _local_model = AutoModelForSequenceClassification.from_pretrained(model_path).to(_local_device)
        _local_model.eval()
        _local_finbert_loaded = True
        print(f"  ✓ FinBERT loaded locally ({model_path.split(os.sep)[-1]}) on {_local_device}")
        return True
    except Exception as e:
        print(f"  ✗ Local FinBERT failed ({e})")
        _local_finbert_loaded = True
        return False


def run_finbert_local_batch(texts: list[str]) -> list[dict]:
    import torch, torch.nn.functional as F
    results = []
    batch_size = 32
    for i in range(0, len(texts), batch_size):
        batch = texts[i:i + batch_size]
        inputs = _local_tokenizer(batch, return_tensors="pt", truncation=True,
                                   padding=True, max_length=128)
        inputs = {k: v.to(_local_device) for k, v in inputs.items()}
        with torch.no_grad():
            outputs = _local_model(**inputs)
        probs_batch = F.softmax(outputs.logits, dim=1)
        for j in range(len(batch)):
            probs = probs_batch[j]
            pred_idx = probs.argmax().item()
            results.append({
                "sentiment":  ID2LABEL_LOCAL[pred_idx].upper(),
                "score":      round(float(probs[pred_idx]), 4),
                "probabilities": {
                    "positive": round(float(probs[0]), 4),
                    "negative": round(float(probs[1]), 4),
                    "neutral":  round(float(probs[2]), 4),
                }
            })
    return results


def run_finbert_api_batch(texts: list[str]) -> list[dict] | None:
    try:
        batch_url = FINBERT_API_URL.replace("/predict", "/predict/batch")
        resp = requests.post(batch_url, json={"texts": texts},
                             headers={"Content-Type": "application/json"}, timeout=15)
        if resp.status_code == 200:
            results = resp.json()
            out = []
            for r in results:
                out.append({
                    "sentiment":     r.get("sentiment", "NEUTRAL"),
                    "score":         r.get("score", 0.5),
                    "probabilities": r.get("probabilities", {"positive": 0.33, "negative": 0.33, "neutral": 0.34}),
                })
            return out
    except Exception:
        return None


def run_finbert(texts: list[str]) -> list[dict]:
    """
    Tries FinBERT FastAPI → local PyTorch model → lexicon fallback.
    """
    # Try API first
    result = run_finbert_api_batch(texts)
    if result and len(result) == len(texts):
        return result

    # Try local model
    if _load_local_finbert() and _local_model is not None:
        return run_finbert_local_batch(texts)

    # Lexicon fallback
    sys.path.insert(0, os.path.join(ROOT_DIR, "nlp_engine"))
    try:
        from nlp_processor import build_structured_analysis
        out = []
        for t in texts:
            r = build_structured_analysis(t)
            out.append({
                "sentiment":     r["sentiment"],
                "score":         r["score"],
                "probabilities": r["probabilities"],
            })
        return out
    except Exception:
        # Absolute last resort
        return [{"sentiment": "NEUTRAL", "score": 0.5,
                 "probabilities": {"positive": 0.33, "negative": 0.33, "neutral": 0.34}}
                for _ in texts]


# ══════════════════════════════════════════════════════════════════════════════
# RELEVANCE + ENTITY CLASSIFIERS (reuse from nlp_engine)
# ══════════════════════════════════════════════════════════════════════════════

def get_relevance(text: str) -> str:
    try:
        from nlp_processor import classify_relevance
        return classify_relevance(text)
    except Exception:
        text_l = text.lower()
        if any(k in text_l for k in ["bitcoin", "btc", "satoshi", "halving"]):
            return "Bitcoin-Specific"
        if any(k in text_l for k in ["crypto", "ethereum", "blockchain", "binance"]):
            return "General Cryptocurrency"
        if any(k in text_l for k in ["fed", "interest rate", "inflation", "sec"]):
            return "Global Financial Markets"
        return "Irrelevant Content"


def get_entities(text: str) -> list:
    try:
        from nlp_processor import extract_key_entities
        return extract_key_entities(text)
    except Exception:
        found = []
        t = text.lower()
        entity_map = {
            "Bitcoin": ["bitcoin", "btc"],
            "SEC": ["sec", "securities and exchange"],
            "Federal Reserve": ["federal reserve", "fed ", "fomc"],
            "BlackRock": ["blackrock"],
            "Binance": ["binance"],
            "Coinbase": ["coinbase"],
            "Ethereum": ["ethereum", " eth "],
            "Elon Musk": ["elon musk", "elon"],
        }
        for ent, kws in entity_map.items():
            if any(k in t for k in kws):
                found.append(ent)
        return found


def get_urgency(text: str, score: float) -> bool:
    breaking = ["crash", "plunge", "soar", "hack", "exploit", "bankrupt",
                 "ban", "rate cut", "rate hike", "all-time high", "collapse",
                 "blackrock", "etf approval", "sec sues", "scam", "liquidat"]
    return score >= 0.82 or any(k in text.lower() for k in breaking)


def get_source_weight(source: str) -> float:
    if not source:
        return 0.60
    src_l = str(source).lower()
    for key, w in SOURCE_WEIGHTS.items():
        if key in src_l:
            return w
    return 0.60


# ══════════════════════════════════════════════════════════════════════════════
# BINANCE PRICE FETCHER
# ══════════════════════════════════════════════════════════════════════════════

def fetch_btc_price_at(dt: datetime, offset_hours: int = 0) -> float | None:
    """
    Fetches BTC/USDT close price at (dt + offset_hours).
    offset_hours=0 → price at article time
    offset_hours=3 → price 3h after article
    """
    target = dt + timedelta(hours=offset_hours)
    if target > datetime.now(timezone.utc) - timedelta(minutes=10):
        return None   # future price
    start_ms = int(target.timestamp() * 1000)
    try:
        resp = requests.get(BINANCE_URL,
                            params={"symbol": "BTCUSDT", "interval": "1h",
                                    "startTime": start_ms, "limit": 1},
                            timeout=6)
        if resp.status_code == 200 and resp.json():
            return float(resp.json()[0][4])  # close price
    except Exception:
        pass
    return None


# ══════════════════════════════════════════════════════════════════════════════
# BUILD ENTITY FLAG COLUMNS
# ══════════════════════════════════════════════════════════════════════════════

def entity_flags(entities: list) -> dict:
    flags = {}
    for ent in KNOWN_ENTITIES:
        col = "has_" + ent.lower().replace(" ", "_").replace(".", "")
        flags[col] = 1 if ent in entities else 0
    flags["entity_count"] = len(entities)
    return flags


# ══════════════════════════════════════════════════════════════════════════════
# MAIN PROCESSOR
# ══════════════════════════════════════════════════════════════════════════════

def process_dataset(df_raw: pd.DataFrame, dataset_name: str,
                    fetch_prices: bool = True) -> pd.DataFrame:
    """
    Takes a normalized DataFrame with columns [title, date, source],
    runs FinBERT, fetches prices, builds the full feature row.
    """
    print(f"\n  Processing '{dataset_name}' ({len(df_raw)} rows)...")

    # Parse dates
    df_raw["date_parsed"] = _parse_dates(df_raw["date"].astype(str))
    df_raw = df_raw.dropna(subset=["date_parsed"]).reset_index(drop=True)
    df_raw["title"] = df_raw["title"].astype(str).str.strip()
    df_raw = df_raw[df_raw["title"].str.len() >= 10].reset_index(drop=True)
    print(f"    After date/title filtering: {len(df_raw)} rows")

    if len(df_raw) == 0:
        return pd.DataFrame()

    # ── Run FinBERT in batches ────────────────────────────────────────────────
    print(f"    Running FinBERT inference...")
    titles = df_raw["title"].tolist()
    nlp_results = run_finbert(titles)

    rows = []
    skipped_price = 0

    for idx, (_, row_raw) in enumerate(df_raw.iterrows()):
        title    = str(row_raw["title"])
        pub_dt   = row_raw["date_parsed"]
        source   = str(row_raw.get("source", "External"))
        nlp      = nlp_results[idx]

        sentiment = str(nlp.get("sentiment", "NEUTRAL")).upper()
        score     = float(nlp.get("score", 0.5))
        probs     = nlp.get("probabilities", {})
        pos_prob  = float(probs.get("positive", 0.33))
        neg_prob  = float(probs.get("negative", 0.33))
        neu_prob  = float(probs.get("neutral",  0.34))

        relevance   = get_relevance(title)
        entities    = get_entities(title)
        urgency     = get_urgency(title, score)
        rel_weight  = RELEVANCE_WEIGHTS.get(relevance, 0.45)
        src_weight  = get_source_weight(source)
        ent_f       = entity_flags(entities)

        hour_of_day     = pub_dt.hour
        day_of_week     = pub_dt.weekday()
        title_word_cnt  = len(title.split())
        sent_enc        = 1 if sentiment == "POSITIVE" else (-1 if sentiment == "NEGATIVE" else 0)
        score_x_rel     = round(score * rel_weight, 4)
        bull_bear_spread = round(pos_prob - neg_prob, 4)

        # ── BTC prices ────────────────────────────────────────────────────────
        price_at_news = None
        btc_3h        = None
        ret_pct       = None
        target_dir    = None
        target_impact = None

        if fetch_prices:
            price_at_news = fetch_btc_price_at(pub_dt, offset_hours=0)
            if price_at_news is None:
                skipped_price += 1
                continue
            btc_3h = fetch_btc_price_at(pub_dt, offset_hours=3)
            if btc_3h is None:
                skipped_price += 1
                continue
            ret_pct       = round((btc_3h - price_at_news) / price_at_news * 100, 4)
            target_dir    = 2 if ret_pct > DIRECTION_THRESHOLD else (0 if ret_pct < -DIRECTION_THRESHOLD else 1)
            target_impact = int(abs(ret_pct) > HIGH_IMPACT_THRESHOLD)
            time.sleep(0.06)   # Binance rate limit
        else:
            price_at_news = 80000.0   # placeholder

        feat_row = {
            # FinBERT features
            "finbert_positive_prob": pos_prob,
            "finbert_negative_prob": neg_prob,
            "finbert_neutral_prob":  neu_prob,
            "finbert_confidence":    score,
            "sentiment_encoded":     sent_enc,
            # Context
            "relevance_weight":      rel_weight,
            "urgency_flag":          int(urgency),
            "source_weight":         src_weight,
            # Entities
            **ent_f,
            # Time
            "hour_of_day":           hour_of_day,
            "day_of_week":           day_of_week,
            # Text
            "title_word_count":      title_word_cnt,
            # Derived
            "score_x_relevance":     score_x_rel,
            "bull_bear_spread":      bull_bear_spread,
            # Price
            "price_at_news":         price_at_news,
            # Targets
            "btc_price_3h_after":    btc_3h,
            "actual_return_3h_pct":  ret_pct,
            "target_direction":      target_dir,
            "target_high_impact":    target_impact,
            # Debug
            "_dataset":              dataset_name,
            "_published_at":         pub_dt.isoformat(),
            "_title":                title[:120],
            "_sentiment":            sentiment,
        }
        rows.append(feat_row)

    print(f"    ✓ Built {len(rows)} feature rows | "
          f"Skipped (price unavailable): {skipped_price}")
    return pd.DataFrame(rows)


# ══════════════════════════════════════════════════════════════════════════════
# ENTRY POINT
# ══════════════════════════════════════════════════════════════════════════════

def main():
    import argparse
    parser = argparse.ArgumentParser(description="Process external datasets for XGBoost training")
    parser.add_argument("--dir",   default=ROOT_DIR, help="Root directory to scan for CSVs")
    parser.add_argument("--file",  default=None, help="Process a single specific CSV file")
    parser.add_argument("--no-price", action="store_true",
                        help="Skip Binance price fetch (features only, no labels)")
    parser.add_argument("--out",   default=None, help="Output CSV filename")
    args = parser.parse_args()

    fetch_prices = not args.no_price
    print("=" * 70)
    print("PROCESSING EXTERNAL DATASETS FOR XGBOOST TRAINING")
    print("=" * 70)

    if fetch_prices:
        print("\n✓ Price fetching: ON  (Binance API will be called)")
        print("  ℹ Only articles >3h old will get labels (future prices unavailable)")
    else:
        print("\n⚠ Price fetching: OFF (--no-price flag set)")
        print("  Features will be built but target labels will be missing.")

    # ── Discover datasets ─────────────────────────────────────────────────────
    if args.file:
        # Single file mode
        fp = os.path.abspath(args.file)
        datasets_to_process = [("custom", fp, load_generic_csv)]
    else:
        scan_dir = os.path.abspath(args.dir)
        print(f"\nScanning for datasets under: {scan_dir}")
        datasets_to_process = discover_datasets(scan_dir)
        if not datasets_to_process:
            print("\n⚠ No compatible datasets found!")
            print("  Place any CSV with 'title' and 'date' columns in the project folder.")
            print("  Or specify a single file: --file path/to/your_dataset.csv")
            return

    print(f"\nFound {len(datasets_to_process)} dataset(s):")
    for name, path, _ in datasets_to_process:
        print(f"  [{name}] {os.path.relpath(path, ROOT_DIR)}")

    # ── Load and process each dataset ─────────────────────────────────────────
    all_dfs = []
    sys.path.insert(0, os.path.join(ROOT_DIR, "nlp_engine"))

    for ds_name, fpath, loader in datasets_to_process:
        print(f"\n{'─'*60}")
        print(f"Dataset: {ds_name}")
        try:
            df_raw = loader(fpath)
            if df_raw.empty:
                print(f"  ✗ Empty after loading")
                continue
            df_feat = process_dataset(df_raw, ds_name, fetch_prices=fetch_prices)
            if not df_feat.empty:
                all_dfs.append(df_feat)
        except Exception as e:
            print(f"  ✗ Error processing {ds_name}: {e}")

    if not all_dfs:
        print("\n✗ No data processed. Check dataset formats.")
        return

    # ── Combine and deduplicate ───────────────────────────────────────────────
    combined = pd.concat(all_dfs, ignore_index=True)
    before = len(combined)
    combined = combined.drop_duplicates(subset=["_title", "_published_at"]).reset_index(drop=True)
    print(f"\n{'='*70}")
    print(f"Total rows: {before} → {len(combined)} after deduplication")

    if fetch_prices:
        labelled = combined.dropna(subset=["target_direction"])
        print(f"Fully labelled rows: {len(labelled)} / {len(combined)}")
        dist = labelled["target_direction"].value_counts().sort_index()
        print(f"  BEARISH(0): {dist.get(0,0)}  NEUTRAL(1): {dist.get(1,0)}  BULLISH(2): {dist.get(2,0)}")

    # ── Save output ───────────────────────────────────────────────────────────
    out_fname = args.out or "external_training_dataset.csv"
    out_path  = os.path.join(DATA_DIR, out_fname)
    combined.to_csv(out_path, index=False)
    print(f"\n✓ Saved to: {out_path}")
    print(f"  Rows: {len(combined)} | Columns: {len(combined.columns)}")
    print(f"\nNext step → run: python xgboost_engine/merge_all_datasets.py")
    print("=" * 70)


if __name__ == "__main__":
    main()
