"""
AUTO-LABEL & RETRAIN — FinTrack XGBoost Continuous Learning System
====================================================================

What this does (run daily via Task Scheduler):

  1. LABEL STEP:
     - Finds MongoDB articles that are >3h old and not yet price-labelled
     - Fetches real BTC price 3h after each article from Binance API
     - Computes actual_return_3h_pct and target_direction
     - Saves label back to MongoDB (marks article as labelled)
     - Appends to live_training_dataset.csv

  2. RETRAIN STEP (triggers when enough new rows):
     - Merges live data with historic dataset
     - Retrains all 3 XGBoost models
     - Saves new models (overwriting old ones)
     - Logs accuracy to retrain_log.json

  3. REPORT:
     - Prints summary of how many articles labelled, current accuracy

Run manually:
  python xgboost_engine/auto_label_and_retrain.py

Schedule (Windows Task Scheduler):
  Action: python xgboost_engine/auto_label_and_retrain.py
  Trigger: Daily at 3:00 AM
  (see setup instructions at bottom of this file)

Config:
  RETRAIN_AFTER_N_ROWS = 100   retrain when 100+ new live rows collected
  RETRAIN_AFTER_N_DAYS = 7     also retrain if 7+ days since last retrain
"""

import os, sys, json, time, logging
import requests
import pandas as pd
import numpy as np
from datetime import datetime, timezone, timedelta
from pymongo import MongoClient
from dotenv import load_dotenv

# ── Paths ─────────────────────────────────────────────────────────────────────
BASE_DIR  = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR  = os.path.abspath(os.path.join(BASE_DIR, ".."))
DATA_DIR  = os.path.join(BASE_DIR, "data")
MODEL_DIR = os.path.join(BASE_DIR, "xgboost_model")
LOG_DIR   = os.path.join(ROOT_DIR, "logs")
os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(LOG_DIR,  exist_ok=True)

LIVE_CSV      = os.path.join(DATA_DIR, "live_training_dataset.csv")
RETRAIN_LOG   = os.path.join(MODEL_DIR, "retrain_log.json")
META_PATH     = os.path.join(MODEL_DIR, "model_metadata.json")

sys.path.insert(0, ROOT_DIR)
sys.path.insert(0, os.path.join(ROOT_DIR, "nlp_engine"))

load_dotenv(os.path.join(ROOT_DIR, "web", ".env.local"))
load_dotenv(os.path.join(ROOT_DIR, "data_pipeline", ".env"))

# ── Config ────────────────────────────────────────────────────────────────────
RETRAIN_AFTER_N_ROWS = int(os.getenv("RETRAIN_AFTER_N_ROWS", "100"))
RETRAIN_AFTER_N_DAYS = int(os.getenv("RETRAIN_AFTER_N_DAYS", "7"))
LABEL_LOOKBACK_DAYS  = int(os.getenv("LABEL_LOOKBACK_DAYS",  "30"))
DIRECTION_THRESHOLD  = 0.5    # % — BULLISH > +0.5%, BEARISH < -0.5%
HIGH_IMPACT_THRESH   = 2.0    # % — |return| > 2% = HIGH IMPACT
BINANCE_API          = "https://api.binance.com/api/v3/klines"

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler(os.path.join(LOG_DIR, "auto_retrain.log")),
        logging.StreamHandler(sys.stdout),
    ]
)
log = logging.getLogger(__name__)


# ══════════════════════════════════════════════════════════════════════════════
# STEP 1 — FETCH 3H BTC PRICE FROM BINANCE
# ══════════════════════════════════════════════════════════════════════════════

def fetch_btc_price_at(dt: datetime, retries: int = 3) -> float | None:
    """
    Fetches BTC/USDT open price at the nearest 1h candle to `dt`.
    Uses Binance REST API — no API key needed for public klines.
    """
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)

    # Floor to nearest hour
    dt_h = dt.replace(minute=0, second=0, microsecond=0)
    start_ms = int(dt_h.timestamp() * 1000)

    for attempt in range(retries):
        try:
            resp = requests.get(BINANCE_API, params={
                "symbol":    "BTCUSDT",
                "interval":  "1h",
                "startTime": start_ms,
                "limit":     1,
            }, timeout=10)
            resp.raise_for_status()
            data = resp.json()
            if data:
                return float(data[0][1])   # index 1 = open price
        except Exception as e:
            if attempt < retries - 1:
                time.sleep(2 ** attempt)
            else:
                log.warning(f"Binance API failed for {dt}: {e}")
    return None


def get_3h_return(pub_dt: datetime) -> tuple[float, float, float] | None:
    """Returns (price_at, price_3h_after, return_pct) or None."""
    p0 = fetch_btc_price_at(pub_dt, retries=2)
    p3 = fetch_btc_price_at(pub_dt + timedelta(hours=3), retries=2)
    if p0 is None or p3 is None or p0 == 0:
        return None
    ret = round((p3 - p0) / p0 * 100, 4)
    return (p0, p3, ret)


# ══════════════════════════════════════════════════════════════════════════════
# STEP 2 — LABEL ARTICLES FROM MONGODB
# ══════════════════════════════════════════════════════════════════════════════

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


def get_entity_flags(entities: list) -> dict:
    flags = {}
    for ent in KNOWN_ENTITIES:
        col = "has_" + ent.lower().replace(" ", "_").replace(".", "")
        flags[col] = 1 if ent in entities else 0
    flags["entity_count"] = len(entities)
    return flags


def build_feature_row(doc: dict, p0: float, p3: float, ret: float) -> dict:
    """Build a training row from a MongoDB article document."""
    title    = doc.get("title", "")
    source   = str(doc.get("source", "")).lower()
    pub_dt   = doc.get("published_at") or doc.get("created_at") or datetime.now(timezone.utc)
    if isinstance(pub_dt, str):
        pub_dt = pd.to_datetime(pub_dt, utc=True).to_pydatetime()
    if pub_dt.tzinfo is None:
        pub_dt = pub_dt.replace(tzinfo=timezone.utc)

    # FinBERT probabilities (stored in MongoDB by the pipeline)
    probs    = doc.get("probabilities", {})
    pos_p    = float(probs.get("positive", 0.33))
    neg_p    = float(probs.get("negative", 0.33))
    neu_p    = float(probs.get("neutral",  0.34))
    conf     = float(doc.get("score", max(pos_p, neg_p, neu_p)))
    sent_raw = str(doc.get("sentiment", "NEUTRAL")).upper()
    sent_enc = 1 if sent_raw in ("POSITIVE","BULLISH") else (-1 if sent_raw in ("NEGATIVE","BEARISH") else 0)

    # Context
    relevance = doc.get("relevance", "Bitcoin-Specific")
    entities  = doc.get("entities", [])
    urgency   = doc.get("urgency", False)
    rel_w     = RELEVANCE_WEIGHTS.get(relevance, 0.68)
    src_w     = SOURCE_WEIGHTS.get(source, 0.60)
    urgency_f = int(urgency) if isinstance(urgency, bool) else (1 if urgency else 0)

    direction = 2 if ret >  DIRECTION_THRESHOLD else (0 if ret < -DIRECTION_THRESHOLD else 1)

    return {
        "finbert_positive_prob": round(pos_p, 4),
        "finbert_negative_prob": round(neg_p, 4),
        "finbert_neutral_prob":  round(neu_p, 4),
        "finbert_confidence":    round(conf, 4),
        "sentiment_encoded":     sent_enc,
        "relevance_weight":      rel_w,
        "urgency_flag":          urgency_f,
        "source_weight":         src_w,
        **get_entity_flags(entities if isinstance(entities, list) else []),
        "hour_of_day":           pub_dt.hour,
        "day_of_week":           pub_dt.weekday(),
        "title_word_count":      len(title.split()),
        "score_x_relevance":     round(conf * rel_w, 4),
        "bull_bear_spread":      round(pos_p - neg_p, 4),
        "price_at_news":         round(p0, 2),
        "btc_price_3h_after":    round(p3, 2),
        "actual_return_3h_pct":  ret,
        "target_direction":      direction,
        "target_high_impact":    int(abs(ret) > HIGH_IMPACT_THRESH),
        "_dataset":              "live_mongodb",
        "_title":                title[:120],
        "_published_at":         pub_dt.isoformat(),
        "_sentiment":            sent_raw,
    }


def label_new_articles() -> int:
    """
    Scans MongoDB for articles >3h old without price labels.
    Fetches real Binance 3h prices and saves labelled rows to CSV.
    Returns number of new rows labelled.
    """
    mongo_uri = os.getenv("MONGODB_URI") or os.getenv("MONGO_URI")
    db_name   = os.getenv("MONGODB_DB", "fintrack")
    coll_name = os.getenv("MONGODB_COLLECTION", "news_articles")

    if not mongo_uri:
        log.error("MONGODB_URI not set in environment. Skipping label step.")
        return 0

    client  = MongoClient(mongo_uri, serverSelectionTimeoutMS=8000)
    db      = client[db_name]
    coll    = db[coll_name]

    cutoff_time = datetime.now(timezone.utc) - timedelta(hours=3)
    lookback    = datetime.now(timezone.utc) - timedelta(days=LABEL_LOOKBACK_DAYS)

    # Find articles that: exist, have price_at_news, NOT yet labelled (btc_3h_labelled != True)
    query = {
        "published_at":    {"$gte": lookback, "$lte": cutoff_time},
        "price_at_news":   {"$exists": True, "$ne": None},
        "btc_3h_labelled": {"$ne": True},
    }

    articles = list(coll.find(query, {
        "title": 1, "published_at": 1, "source": 1, "price_at_news": 1,
        "sentiment": 1, "score": 1, "probabilities": 1,
        "relevance": 1, "entities": 1, "urgency": 1,
    }).limit(500))

    log.info(f"Found {len(articles)} unlabelled articles (>{3}h old)")

    if not articles:
        client.close()
        return 0

    new_rows    = []
    labelled_ids = []
    failed       = 0

    for i, doc in enumerate(articles):
        pub_dt = doc.get("published_at")
        if not pub_dt:
            continue
        if isinstance(pub_dt, str):
            pub_dt = pd.to_datetime(pub_dt, utc=True).to_pydatetime()
        if pub_dt.tzinfo is None:
            pub_dt = pub_dt.replace(tzinfo=timezone.utc)

        # Use stored price_at_news if available, else fetch from Binance
        p0_stored = doc.get("price_at_news")
        if p0_stored:
            p3 = fetch_btc_price_at(pub_dt + timedelta(hours=3), retries=2)
            if p3 is None:
                failed += 1; continue
            p0  = float(p0_stored)
            ret = round((p3 - p0) / p0 * 100, 4)
        else:
            result = get_3h_return(pub_dt)
            if result is None:
                failed += 1; continue
            p0, p3, ret = result

        row = build_feature_row(doc, p0, p3, ret)
        new_rows.append(row)
        labelled_ids.append(doc["_id"])

        if (i + 1) % 10 == 0:
            log.info(f"  Labelled {i+1}/{len(articles)} articles...")
        time.sleep(0.15)   # ~7 req/sec — well within Binance 1200/min limit

    # Mark articles as labelled in MongoDB
    if labelled_ids:
        coll.update_many(
            {"_id": {"$in": labelled_ids}},
            {"$set": {"btc_3h_labelled": True}}
        )

    client.close()
    log.info(f"Labelled {len(new_rows)} articles ({failed} failed price lookup)")

    if not new_rows:
        return 0

    # Append to live_training_dataset.csv
    df_new = pd.DataFrame(new_rows)
    if os.path.exists(LIVE_CSV):
        df_existing = pd.read_csv(LIVE_CSV, low_memory=False)
        df_combined = pd.concat([df_existing, df_new], ignore_index=True)
        df_combined = df_combined.drop_duplicates(subset=["_title"]).reset_index(drop=True)
    else:
        df_combined = df_new

    df_combined.to_csv(LIVE_CSV, index=False)
    log.info(f"Live CSV: {len(df_combined):,} total rows saved to {LIVE_CSV}")
    return len(new_rows)


# ══════════════════════════════════════════════════════════════════════════════
# STEP 3 — RETRAIN CHECK AND TRIGGER
# ══════════════════════════════════════════════════════════════════════════════

def should_retrain() -> tuple[bool, str]:
    """Returns (True/False, reason string)."""

    # Check how many new live rows since last retrain
    if not os.path.exists(LIVE_CSV):
        return False, "No live CSV yet"

    df_live = pd.read_csv(LIVE_CSV, low_memory=False)

    # Load retrain log
    retrain_log = {}
    if os.path.exists(RETRAIN_LOG):
        with open(RETRAIN_LOG) as f:
            retrain_log = json.load(f)

    last_retrain_ts = retrain_log.get("last_retrain_timestamp")
    rows_at_last    = int(retrain_log.get("rows_at_last_retrain", 0))
    new_rows        = len(df_live) - rows_at_last

    if new_rows >= RETRAIN_AFTER_N_ROWS:
        return True, f"{new_rows} new labelled rows (threshold: {RETRAIN_AFTER_N_ROWS})"

    if last_retrain_ts:
        last_dt  = datetime.fromisoformat(last_retrain_ts)
        days_ago = (datetime.now(timezone.utc) - last_dt).days
        if days_ago >= RETRAIN_AFTER_N_DAYS and new_rows >= 20:
            return True, f"{days_ago} days since last retrain + {new_rows} new rows"

    return False, f"Only {new_rows} new rows (need {RETRAIN_AFTER_N_ROWS})"


def retrain_models():
    """Runs the full merge → prepare → train pipeline."""
    log.info("=" * 60)
    log.info("RETRAINING ALL XGBOOST MODELS")
    log.info("=" * 60)

    import subprocess
    python = sys.executable

    steps = [
        ([python, "xgboost_engine/merge_all_datasets.py"],    "Merging datasets"),
        ([python, "xgboost_engine/prepare_news_features.py"], "Preparing features"),
        ([python, "xgboost_engine/train_xgboost.py"],         "Training models"),
    ]

    for cmd, label in steps:
        log.info(f"Running: {label}...")
        result = subprocess.run(cmd, cwd=ROOT_DIR, capture_output=True, text=True)
        if result.returncode != 0:
            log.error(f"{label} FAILED:\n{result.stderr}")
            return False
        log.info(result.stdout[-500:] if len(result.stdout) > 500 else result.stdout)

    # Read accuracy from model_metadata.json
    accuracy = "unknown"
    if os.path.exists(META_PATH):
        with open(META_PATH) as f:
            meta = json.load(f)
        accuracy = meta.get("direction_accuracy", "unknown")

    # Update retrain log
    live_rows = len(pd.read_csv(LIVE_CSV)) if os.path.exists(LIVE_CSV) else 0
    log_entry = {
        "last_retrain_timestamp": datetime.now(timezone.utc).isoformat(),
        "rows_at_last_retrain":   live_rows,
        "direction_accuracy":     accuracy,
        "history": []
    }

    if os.path.exists(RETRAIN_LOG):
        with open(RETRAIN_LOG) as f:
            old = json.load(f)
        log_entry["history"] = old.get("history", [])

    log_entry["history"].append({
        "timestamp": log_entry["last_retrain_timestamp"],
        "accuracy":  accuracy,
        "live_rows": live_rows,
    })

    with open(RETRAIN_LOG, "w") as f:
        json.dump(log_entry, f, indent=2)

    log.info(f"Retrain complete. Accuracy: {accuracy}")
    return True


# ══════════════════════════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════════════════════════

def main():
    log.info("=" * 60)
    log.info("AUTO-LABEL & RETRAIN — FinTrack XGBoost")
    log.info(f"Time: {datetime.now(timezone.utc).isoformat()}")
    log.info("=" * 60)

    # Step 1: Label new articles
    log.info("\n[STEP 1] Labelling new articles from MongoDB...")
    new_count = label_new_articles()
    log.info(f"  New rows labelled: {new_count}")

    # Step 2: Check if retrain needed
    log.info("\n[STEP 2] Checking retrain threshold...")
    do_retrain, reason = should_retrain()
    log.info(f"  Retrain: {'YES' if do_retrain else 'NO'} — {reason}")

    # Step 3: Retrain if needed
    if do_retrain:
        log.info("\n[STEP 3] Retraining models...")
        success = retrain_models()
        if success:
            log.info("Models updated successfully.")
        else:
            log.error("Retrain failed. Old models still active.")
    else:
        log.info("\n[STEP 3] Skipped — not enough new data yet.")
        if os.path.exists(LIVE_CSV):
            df = pd.read_csv(LIVE_CSV)
            need = RETRAIN_AFTER_N_ROWS
            log.info(f"  Live rows: {len(df):,} | Need {need} new rows to retrain")

    # Summary
    log.info("\n[SUMMARY]")
    if os.path.exists(RETRAIN_LOG):
        with open(RETRAIN_LOG) as f:
            retrain_log = json.load(f)
        last_ts  = retrain_log.get("last_retrain_timestamp", "never")
        last_acc = retrain_log.get("direction_accuracy", "unknown")
        log.info(f"  Last retrain : {last_ts}")
        log.info(f"  Last accuracy: {last_acc}")
    if os.path.exists(LIVE_CSV):
        df = pd.read_csv(LIVE_CSV)
        dist = df["target_direction"].value_counts().sort_index()
        log.info(f"  Live CSV rows: {len(df):,}")
        log.info(f"  BEARISH: {dist.get(0,0)}  NEUTRAL: {dist.get(1,0)}  BULLISH: {dist.get(2,0)}")
    log.info("Done.")


if __name__ == "__main__":
    main()


# ══════════════════════════════════════════════════════════════════════════════
# WINDOWS TASK SCHEDULER SETUP (run once to register the daily task)
# ══════════════════════════════════════════════════════════════════════════════
#
# Run this in PowerShell as Administrator:
#
# $action  = New-ScheduledTaskAction `
#     -Execute "C:\Users\PMLS\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe" `
#     -Argument "xgboost_engine\auto_label_and_retrain.py" `
#     -WorkingDirectory "C:\Users\PMLS\Downloads\FinTrack-main"
#
# $trigger = New-ScheduledTaskTrigger -Daily -At 3:00AM
#
# Register-ScheduledTask `
#     -TaskName "FinTrack-XGBoost-AutoRetrain" `
#     -Action $action `
#     -Trigger $trigger `
#     -Description "Labels live BTC news and retrains XGBoost when enough data accumulates"
#
# To check it registered:
#   Get-ScheduledTask -TaskName "FinTrack-XGBoost-AutoRetrain"
#
# To run it immediately (test):
#   Start-ScheduledTask -TaskName "FinTrack-XGBoost-AutoRetrain"
#
# To remove it:
#   Unregister-ScheduledTask -TaskName "FinTrack-XGBoost-AutoRetrain" -Confirm:$false
# ══════════════════════════════════════════════════════════════════════════════
