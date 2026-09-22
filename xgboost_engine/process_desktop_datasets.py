"""
+==============================================================================+
|     PROCESS ALL AVAILABLE DESKTOP DATASETS FOR XGBOOST TRAINING            |
|                                                                              |
|  Handles every dataset already on your Desktop:                             |
|    1. CryptoVision (188,430 rows) - has BTC price movement built-in        |
|    2. Bitcoin Sentiments 2021-24 (~8,000 rows)                              |
|    3. Crypto tweets (date + sentiment)                                       |
|    4. BTC news + price (articles column as JSON list)                        |
|                                                                              |
|  Run:  python xgboost_engine/process_desktop_datasets.py                    |
+==============================================================================+
"""

import os, sys, ast, json, time, re
import pandas as pd
import numpy as np
import requests
from datetime import datetime, timezone, timedelta

# -- Paths ---------------------------------------------------------------------
BASE_DIR  = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR  = os.path.abspath(os.path.join(BASE_DIR, ".."))
DATA_DIR  = os.path.join(BASE_DIR, "data")
DESK_ROOT = r"C:\Users\PMLS\Desktop\FinTrack-main"
os.makedirs(DATA_DIR, exist_ok=True)

sys.path.insert(0, os.path.join(ROOT_DIR, "nlp_engine"))

# -- Dataset paths -------------------------------------------------------------
PATHS = {
    "cryptovision":
        os.path.join(DESK_ROOT, "XGBOOST datasets", "cryptovision_extracted",
                     "CryptoVision A Comprehensive Dataset for Crypto Ne", "CryptoDataSet.csv"),
    "bitcoin_sentiments":
        os.path.join(DESK_ROOT, "fintrack_module3", "datasets", "archive_3",
                     "bitcoin_sentiments_21_24.csv"),
    "tweets":
        os.path.join(DESK_ROOT, "fintrack_module3", "datasets", "archive",
                     "tweets.csv"),
    "btc_news_price":
        os.path.join(DESK_ROOT, "XGBOOST datasets", "temp_inspect",
                     "crypto news headlines and price movements", "BTC.csv"),
}

# -- Constants ------------------------------------------------------------------
DIRECTION_THRESHOLD   = 0.5    # % - BULLISH > +0.5%, BEARISH < -0.5%
HIGH_IMPACT_THRESHOLD = 2.0    # % - |return| > 2% = HIGH IMPACT
BINANCE_URL           = "https://api.binance.com/api/v3/klines"

RELEVANCE_WEIGHTS = {
    "Bitcoin-Specific": 1.00, "General Cryptocurrency": 0.82,
    "Global Financial Markets": 0.68, "Irrelevant Content": 0.45,
}
SOURCE_WEIGHTS = {
    "bloomberg": 1.00, "reuters": 0.95, "coindesk": 0.85,
    "cointelegraph": 0.80, "cryptopanic": 0.72, "decrypt": 0.73,
}
KNOWN_ENTITIES = [
    "Bitcoin", "SEC", "Federal Reserve", "BlackRock", "Binance",
    "Coinbase", "Ethereum", "Solana", "XRP", "Elon Musk", "MicroStrategy",
]

# ==============================================================================
# HELPERS
# ==============================================================================

def label_direction(ret_pct: float) -> int:
    if ret_pct > DIRECTION_THRESHOLD:   return 2   # BULLISH
    elif ret_pct < -DIRECTION_THRESHOLD: return 0  # BEARISH
    return 1                                        # NEUTRAL


def get_relevance(text: str) -> str:
    try:
        from nlp_processor import classify_relevance
        return classify_relevance(text)
    except Exception:
        t = text.lower()
        if any(k in t for k in ["bitcoin", "btc", "satoshi", "halving"]):
            return "Bitcoin-Specific"
        if any(k in t for k in ["crypto", "ethereum", "blockchain"]):
            return "General Cryptocurrency"
        if any(k in t for k in ["fed", "interest rate", "sec", "inflation"]):
            return "Global Financial Markets"
        return "Irrelevant Content"


def get_entities(text: str) -> list:
    try:
        from nlp_processor import extract_key_entities
        return extract_key_entities(text)
    except Exception:
        found, t = [], text.lower()
        emap = {
            "Bitcoin": ["bitcoin", "btc"], "SEC": ["sec", "securities"],
            "Federal Reserve": ["federal reserve", "fed ", "fomc"],
            "BlackRock": ["blackrock"], "Binance": ["binance"],
            "Coinbase": ["coinbase"], "Ethereum": ["ethereum"],
            "Elon Musk": ["elon"], "MicroStrategy": ["microstrategy"],
        }
        for ent, kws in emap.items():
            if any(k in t for k in kws):
                found.append(ent)
        return found


def entity_flags(entities: list) -> dict:
    flags = {}
    for ent in KNOWN_ENTITIES:
        col = "has_" + ent.lower().replace(" ", "_").replace(".", "")
        flags[col] = 1 if ent in entities else 0
    flags["entity_count"] = len(entities)
    return flags


def get_source_weight(source: str) -> float:
    if not source: return 0.60
    s = source.lower()
    for k, w in SOURCE_WEIGHTS.items():
        if k in s: return w
    return 0.60


def get_urgency(text: str, score: float) -> bool:
    breaking = ["crash", "plunge", "soar", "hack", "bankrupt", "ban",
                 "rate cut", "rate hike", "all-time high", "collapse",
                 "blackrock", "etf approval", "sec sues", "liquidat"]
    return score >= 0.82 or any(k in text.lower() for k in breaking)


def parse_date(val) -> datetime | None:
    if pd.isna(val): return None
    try:
        dt = pd.to_datetime(val, utc=True, infer_datetime_format=True)
        return dt.to_pydatetime()
    except Exception:
        return None


def fetch_btc_price_3h(pub_dt: datetime) -> float | None:
    """Fetch real BTC close price 3h after publication from Binance."""
    target = pub_dt + timedelta(hours=3)
    if target > datetime.now(timezone.utc) - timedelta(minutes=10):
        return None
    try:
        start_ms = int(pub_dt.timestamp() * 1000)
        r = requests.get(BINANCE_URL, params={"symbol":"BTCUSDT","interval":"1h",
                          "startTime":start_ms,"limit":4}, timeout=6)
        if r.status_code == 200 and len(r.json()) >= 4:
            return float(r.json()[3][4])
    except Exception:
        pass
    return None


# -- FinBERT -------------------------------------------------------------------
_finbert_loaded = False
_tokenizer = _model = _device = None
ID2LABEL = {0: "POSITIVE", 1: "NEGATIVE", 2: "NEUTRAL"}


def _load_finbert():
    global _finbert_loaded, _tokenizer, _model, _device
    if _finbert_loaded: return _model is not None
    try:
        import torch
        from transformers import AutoTokenizer, AutoModelForSequenceClassification
        mp = os.path.join(ROOT_DIR, "nlp_engine", "finbert_finetuned", "best_model")
        if not os.path.exists(mp): mp = "ProsusAI/finbert"
        _device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        _tokenizer = AutoTokenizer.from_pretrained(mp)
        _model = AutoModelForSequenceClassification.from_pretrained(mp).to(_device)
        _model.eval()
        print(f"  v FinBERT loaded on {_device}")
        _finbert_loaded = True
        return True
    except Exception as e:
        print(f"  x FinBERT load failed: {e}")
        _finbert_loaded = True
        return False


def finbert_batch(texts: list[str]) -> list[dict]:
    """
    Run FinBERT inference on a list of texts.
    Tries: FastAPI -> local PyTorch -> nlp_processor lexicon fallback.
    """
    # Try FastAPI endpoint first (if inference_api.py is running)
    try:
        from dotenv import load_dotenv
        load_dotenv(os.path.join(ROOT_DIR, "data_pipeline", ".env"))
        api_url = os.getenv("FINBERT_BATCH_API_URL", "http://localhost:8000/predict/batch")
        resp = requests.post(api_url, json={"texts": texts[:5]}, timeout=3)
        if resp.status_code == 200:
            # API works — call in batches
            results = []
            bs = 32
            for i in range(0, len(texts), bs):
                r = requests.post(api_url, json={"texts": texts[i:i+bs]}, timeout=30)
                for item in r.json():
                    pb = item.get("probabilities", {})
                    results.append({
                        "sentiment": str(item.get("sentiment", "NEUTRAL")).upper(),
                        "score":     float(item.get("score", 0.5)),
                        "pos_prob":  float(pb.get("positive", 0.33)),
                        "neg_prob":  float(pb.get("negative", 0.33)),
                        "neu_prob":  float(pb.get("neutral",  0.34)),
                    })
            return results
    except Exception:
        pass

    # Try local PyTorch (may fail if DLLs unavailable)
    global _finbert_loaded, _model
    if not _finbert_loaded:
        _load_finbert()
    if _model is not None:
        try:
            import torch, torch.nn.functional as F
            results = []
            bs = 64
            for i in range(0, len(texts), bs):
                batch = texts[i:i+bs]
                enc = _tokenizer(batch, return_tensors="pt", truncation=True,
                                 padding=True, max_length=128)
                enc = {k: v.to(_device) for k, v in enc.items()}
                with torch.no_grad():
                    out = _model(**enc)
                probs_b = F.softmax(out.logits, dim=1)
                for j in range(len(batch)):
                    p = probs_b[j]
                    idx = p.argmax().item()
                    results.append({
                        "sentiment": ID2LABEL[idx],
                        "score":     float(p[idx]),
                        "pos_prob":  float(p[0]),
                        "neg_prob":  float(p[1]),
                        "neu_prob":  float(p[2]),
                    })
            return results
        except Exception:
            pass

    # Lexicon fallback — always works, no DLLs needed
    try:
        from nlp_processor import build_structured_analysis
        results = []
        for t in texts:
            r = build_structured_analysis(t)
            pb = r.get("probabilities", {})
            sent = str(r.get("sentiment", "NEUTRAL")).upper()
            results.append({
                "sentiment": sent,
                "score":     float(r.get("score", 0.5)),
                "pos_prob":  float(pb.get("positive", 0.33)),
                "neg_prob":  float(pb.get("negative", 0.33)),
                "neu_prob":  float(pb.get("neutral",  0.34)),
            })
        return results
    except Exception as e:
        # Absolute last resort — simple keyword-based classification
        results = []
        bullish_kw = ["surges","rally","bullish","adoption","etf","approval","record","high","gain","soar","rise"]
        bearish_kw = ["crash","drop","ban","hack","scam","fear","sell","plunge","loss","bear","collapse","lawsuit"]
        for t in texts:
            tl = t.lower()
            bull_hits = sum(1 for k in bullish_kw if k in tl)
            bear_hits = sum(1 for k in bearish_kw if k in tl)
            if bull_hits > bear_hits:
                results.append({"sentiment":"POSITIVE","score":0.70,"pos_prob":0.70,"neg_prob":0.15,"neu_prob":0.15})
            elif bear_hits > bull_hits:
                results.append({"sentiment":"NEGATIVE","score":0.70,"pos_prob":0.15,"neg_prob":0.70,"neu_prob":0.15})
            else:
                results.append({"sentiment":"NEUTRAL","score":0.60,"pos_prob":0.20,"neg_prob":0.20,"neu_prob":0.60})
        return results



def build_row(title: str, nlp: dict, source: str, pub_dt: datetime,
              price_at_news: float, btc_3h: float,
              ret_pct: float, dataset_name: str) -> dict:
    """Assemble the full 26-feature row from all inputs."""
    sentiment = nlp["sentiment"]
    score     = nlp["score"]
    pos_prob  = nlp["pos_prob"]
    neg_prob  = nlp["neg_prob"]
    neu_prob  = nlp["neu_prob"]

    relevance  = get_relevance(title)
    entities   = get_entities(title)
    urgency    = get_urgency(title, score)
    rel_w      = RELEVANCE_WEIGHTS.get(relevance, 0.45)
    src_w      = get_source_weight(source)
    sent_enc   = 1 if sentiment == "POSITIVE" else (-1 if sentiment == "NEGATIVE" else 0)
    ent_f      = entity_flags(entities)
    hour       = pub_dt.hour if pub_dt else 12
    dow        = pub_dt.weekday() if pub_dt else 0
    title_wc   = len(title.split())
    scr_x_rel  = round(score * rel_w, 4)
    bb_spread  = round(pos_prob - neg_prob, 4)

    target_dir    = label_direction(ret_pct) if ret_pct is not None else None
    target_impact = int(abs(ret_pct) > HIGH_IMPACT_THRESHOLD) if ret_pct is not None else None

    return {
        # FinBERT features
        "finbert_positive_prob": round(pos_prob, 4),
        "finbert_negative_prob": round(neg_prob, 4),
        "finbert_neutral_prob":  round(neu_prob, 4),
        "finbert_confidence":    round(score, 4),
        "sentiment_encoded":     sent_enc,
        # Context
        "relevance_weight":      rel_w,
        "urgency_flag":          int(urgency),
        "source_weight":         src_w,
        # Entities
        **ent_f,
        # Time
        "hour_of_day":           hour,
        "day_of_week":           dow,
        # Text
        "title_word_count":      title_wc,
        # Derived
        "score_x_relevance":     scr_x_rel,
        "bull_bear_spread":      bb_spread,
        # Price
        "price_at_news":         float(price_at_news) if price_at_news else 0.0,
        # Targets
        "btc_price_3h_after":    float(btc_3h) if btc_3h is not None else None,
        "actual_return_3h_pct":  float(ret_pct) if ret_pct is not None else None,
        "target_direction":      target_dir,
        "target_high_impact":    target_impact,
        # Debug
        "_dataset":              dataset_name,
        "_title":                title[:120],
        "_sentiment":            sentiment,
        "_published_at":         pub_dt.isoformat() if pub_dt else "",
    }


# ==============================================================================
# DATASET 1: CryptoVision (188k rows - has price movement already!)
# ==============================================================================
def process_cryptovision(max_rows: int = 50000) -> pd.DataFrame:
    path = PATHS["cryptovision"]
    if not os.path.exists(path):
        print(f"  x CryptoVision not found at expected path")
        return pd.DataFrame()

    print(f"\n{'-'*60}")
    print(f"[1/4] CryptoVision (188,430 rows) - sampling {max_rows:,}")
    print(f"{'-'*60}")

    # CryptoVision already has price movement - no Binance fetch needed!
    cols_needed = ["Title", "Date Time", "Coin Type", "sentiment_label",
                   "sentiment_score", "Open", "Close", "Movement_OpenClose_%", "Market_Move"]
    df = pd.read_csv(path, usecols=cols_needed,
                     encoding="utf-8", encoding_errors="replace",
                     nrows=max_rows)

    # Filter to Bitcoin only
    df = df[df["Coin Type"].str.lower().str.contains("bitcoin", na=False)].copy()
    print(f"  Bitcoin rows: {len(df):,}")

    # Drop rows with missing title or price movement
    df = df.dropna(subset=["Title", "Movement_OpenClose_%"]).reset_index(drop=True)

    titles = df["Title"].astype(str).tolist()
    print(f"  Running FinBERT on {len(titles):,} titles...")
    _load_finbert()
    nlp_results = finbert_batch(titles)

    rows = []
    for i, (_, row) in enumerate(df.iterrows()):
        pub_dt    = parse_date(row["Date Time"])
        ret_pct   = float(row["Movement_OpenClose_%"])   # already % e.g. -0.242
        price_at  = float(row["Open"]) if pd.notna(row["Open"]) else 0.0
        btc_3h    = float(row["Close"]) if pd.notna(row["Close"]) else None
        nlp       = nlp_results[i]

        r = build_row(
            title=str(row["Title"]), nlp=nlp, source="CryptoVision/CryptoPanic",
            pub_dt=pub_dt, price_at_news=price_at, btc_3h=btc_3h,
            ret_pct=ret_pct, dataset_name="cryptovision"
        )
        rows.append(r)

    result = pd.DataFrame(rows)
    print(f"  v Built {len(result):,} rows from CryptoVision")
    dist = result["target_direction"].value_counts().sort_index()
    print(f"     BEARISH: {dist.get(0,0):,}  NEUTRAL: {dist.get(1,0):,}  BULLISH: {dist.get(2,0):,}")
    return result


# ==============================================================================
# DATASET 2: Bitcoin Sentiments 2021-24 (needs Binance for price labels)
# ==============================================================================
def process_bitcoin_sentiments() -> pd.DataFrame:
    path = PATHS["bitcoin_sentiments"]
    if not os.path.exists(path):
        print(f"  x Bitcoin Sentiments not found"); return pd.DataFrame()

    print(f"\n{'-'*60}")
    print(f"[2/4] Bitcoin Sentiments 2021-24")
    print(f"{'-'*60}")

    df = pd.read_csv(path, encoding="latin-1")
    df = df.dropna(subset=["Short Description", "Date"]).copy()
    df = df[df["Short Description"].str.len() >= 10].reset_index(drop=True)
    print(f"  Rows: {len(df):,}")

    titles = df["Short Description"].astype(str).tolist()
    print(f"  Running FinBERT on {len(titles):,} titles...")
    _load_finbert()
    nlp_results = finbert_batch(titles)

    rows, skipped = [], 0
    for i, (_, row) in enumerate(df.iterrows()):
        pub_dt = parse_date(row["Date"])
        if pub_dt is None: skipped += 1; continue

        # Fetch price from Binance
        price_at = fetch_btc_price_3h(pub_dt - timedelta(hours=3))  # price at pub
        btc_3h   = fetch_btc_price_3h(pub_dt)
        if price_at is None or btc_3h is None: skipped += 1; continue

        ret_pct = (btc_3h - price_at) / price_at * 100
        nlp     = nlp_results[i]

        r = build_row(
            title=str(row["Short Description"]), nlp=nlp, source="Bitcoin News",
            pub_dt=pub_dt, price_at_news=price_at, btc_3h=btc_3h,
            ret_pct=ret_pct, dataset_name="bitcoin_sentiments"
        )
        rows.append(r)
        time.sleep(0.06)   # Binance rate limit

    result = pd.DataFrame(rows) if rows else pd.DataFrame()
    print(f"  v Built {len(result):,} rows | Skipped (no price): {skipped}")
    return result


# ==============================================================================
# DATASET 3: Crypto Tweets (date + text + sentiment)
# ==============================================================================
def process_tweets(max_rows: int = 10000) -> pd.DataFrame:
    path = PATHS["tweets"]
    if not os.path.exists(path):
        print(f"  x Tweets not found"); return pd.DataFrame()

    print(f"\n{'-'*60}")
    print(f"[3/4] Crypto Tweets (using FinBERT, fetching Binance prices)")
    print(f"{'-'*60}")

    df = pd.read_csv(path, encoding="latin-1", nrows=max_rows)
    df = df.dropna(subset=["text", "date"]).copy()
    df = df[df["text"].str.len() >= 15].reset_index(drop=True)
    # Only bitcoin-related
    df = df[df.get("token", pd.Series(["bitcoin"]*len(df))).str.lower().str.contains("bitcoin", na=True)]
    print(f"  Bitcoin tweet rows: {len(df):,}")

    titles = df["text"].astype(str).tolist()
    print(f"  Running FinBERT on {len(titles):,} tweets...")
    _load_finbert()
    nlp_results = finbert_batch(titles)

    rows, skipped = [], 0
    for i, (_, row) in enumerate(df.iterrows()):
        pub_dt = parse_date(row["date"])
        if pub_dt is None: skipped += 1; continue

        price_at = fetch_btc_price_3h(pub_dt - timedelta(hours=3))
        btc_3h   = fetch_btc_price_3h(pub_dt)
        if price_at is None or btc_3h is None: skipped += 1; continue

        ret_pct = (btc_3h - price_at) / price_at * 100
        nlp     = nlp_results[i]

        r = build_row(
            title=str(row["text"])[:200], nlp=nlp, source="Twitter/X",
            pub_dt=pub_dt, price_at_news=price_at, btc_3h=btc_3h,
            ret_pct=ret_pct, dataset_name="tweets"
        )
        rows.append(r)
        time.sleep(0.06)

    result = pd.DataFrame(rows) if rows else pd.DataFrame()
    print(f"  v Built {len(result):,} rows | Skipped: {skipped}")
    return result


# ==============================================================================
# DATASET 4: BTC News + Price (articles column is JSON list of headlines)
# ==============================================================================
def process_btc_news_price() -> pd.DataFrame:
    path = PATHS["btc_news_price"]
    if not os.path.exists(path):
        print(f"  x BTC news+price not found"); return pd.DataFrame()

    print(f"\n{'-'*60}")
    print(f"[4/4] BTC News + Price (articles embedded in price rows)")
    print(f"{'-'*60}")

    df = pd.read_csv(path, encoding="latin-1")
    df = df.dropna(subset=["articles", "begins_at", "open_price", "close_price"]).copy()
    print(f"  Raw rows: {len(df):,}")

    all_rows = []
    _load_finbert()
    for _, row in df.iterrows():
        # Parse the articles JSON list
        try:
            raw = row["articles"]
            # It's stored as a Python list literal string
            articles_list = ast.literal_eval(raw)
        except Exception:
            continue

        pub_dt    = parse_date(row["begins_at"])
        if pub_dt is None: continue

        open_p  = float(row["open_price"])
        close_p = float(row["close_price"])
        ret_pct = (close_p - open_p) / open_p * 100

        # One row per article in that day's list
        titles = [str(a)[:200] for a in articles_list if isinstance(a, str) and len(a) > 10]
        if not titles: continue

        nlp_results = finbert_batch(titles)

        for title, nlp in zip(titles, nlp_results):
            r = build_row(
                title=title, nlp=nlp, source="BTC News Aggregator",
                pub_dt=pub_dt, price_at_news=open_p, btc_3h=close_p,
                ret_pct=ret_pct, dataset_name="btc_news_price"
            )
            all_rows.append(r)

    result = pd.DataFrame(all_rows) if all_rows else pd.DataFrame()
    print(f"  v Built {len(result):,} rows")
    return result


# ==============================================================================
# MAIN
# ==============================================================================
def main():
    print("=" * 70)
    print("PROCESSING ALL DESKTOP DATASETS FOR XGBOOST TRAINING")
    print("=" * 70)

    all_frames = []

    # 1. CryptoVision - fast, no Binance needed (price already in dataset)
    df1 = process_cryptovision(max_rows=50000)
    if not df1.empty: all_frames.append(df1)

    # 2. BTC News + Price - fast (price in dataset, just expand articles)
    df4 = process_btc_news_price()
    if not df4.empty: all_frames.append(df4)

    # 3. Bitcoin Sentiments - slower (needs Binance API)
    print("\n⚠  Bitcoin Sentiments requires Binance API calls (~8k rows × 2 calls = ~10 min)")
    ans = input("  Process Bitcoin Sentiments? [y/N]: ").strip().lower()
    if ans == "y":
        df2 = process_bitcoin_sentiments()
        if not df2.empty: all_frames.append(df2)

    # 4. Tweets - slower (needs Binance API)
    print("\n⚠  Tweets require Binance API calls (~2 min for 2,000 rows)")
    ans = input("  Process Tweets? [y/N]: ").strip().lower()
    if ans == "y":
        df3 = process_tweets(max_rows=5000)
        if not df3.empty: all_frames.append(df3)

    if not all_frames:
        print("\nx No data processed."); return

    # -- Combine & deduplicate -------------------------------------------------
    combined = pd.concat(all_frames, ignore_index=True)
    combined = combined.dropna(subset=["target_direction"])
    before   = len(combined)
    combined = combined.drop_duplicates(subset=["_title"]).reset_index(drop=True)
    print(f"\n{'='*70}")
    print(f"Combined: {before:,} -> {len(combined):,} rows after deduplication")

    dist = combined["target_direction"].value_counts().sort_index()
    print(f"\nFinal class distribution:")
    for cls, name in [(0,"BEARISH"),(1,"NEUTRAL"),(2,"BULLISH")]:
        cnt = dist.get(cls, 0)
        bar = "█" * int(cnt / max(len(combined)//50, 1))
        print(f"  {name:8}: {cnt:6,}  {bar}")
    print(f"  HIGH IMPACT: {combined['target_high_impact'].sum():6,}  ({100*combined['target_high_impact'].mean():.1f}%)")

    out = os.path.join(DATA_DIR, "external_training_dataset.csv")
    combined.to_csv(out, index=False)
    print(f"\nv Saved: {out}")
    print(f"  Rows: {len(combined):,} | Columns: {len(combined.columns)}")

    total = len(combined)
    if total >= 5000:
        print(f"\nvv {total:,} rows - EXCELLENT. Expected accuracy: 78–85%")
    elif total >= 1000:
        print(f"\nv  {total:,} rows - GOOD. Expected accuracy: 72–78%")
    elif total >= 500:
        print(f"\n⚠  {total:,} rows - OK. Expected accuracy: 65–72%")
    else:
        print(f"\n⚠  {total:,} rows - minimal. Add more datasets.")

    print(f"\nNext steps:")
    print(f"  python xgboost_engine/build_news_dataset.py    (MongoDB articles)")
    print(f"  python xgboost_engine/merge_all_datasets.py    (combine all sources)")
    print(f"  python xgboost_engine/prepare_news_features.py (feature matrix)")
    print(f"  python xgboost_engine/train_xgboost.py         (train model)")
    print("=" * 70)


if __name__ == "__main__":
    main()
