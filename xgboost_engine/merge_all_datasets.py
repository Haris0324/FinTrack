"""
MERGE ALL DATASETS INTO ONE MASTER TRAINING CSV

Merges:
  1. news_training_dataset.csv     (from MongoDB live articles)
  2. external_training_dataset.csv (from process_desktop/external scripts)
  3. historic_training_dataset.csv (from build_historic_dataset.py - best labels)

Deduplicates, validates, balances, and saves:
  -> master_training_dataset.csv

Run: python xgboost_engine/merge_all_datasets.py
"""

import os
import pandas as pd
import numpy as np

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
os.makedirs(DATA_DIR, exist_ok=True)

# ── Feature columns (must match prepare_news_features.py exactly) ─────────────
FEATURE_COLUMNS = [
    "finbert_positive_prob", "finbert_negative_prob", "finbert_neutral_prob",
    "finbert_confidence", "sentiment_encoded", "relevance_weight",
    "urgency_flag", "source_weight",
    "has_bitcoin", "has_sec", "has_federal_reserve", "has_blackrock",
    "has_binance", "has_coinbase", "has_ethereum", "has_solana",
    "has_xrp", "has_elon_musk", "has_microstrategy", "entity_count",
    "hour_of_day", "day_of_week", "title_word_count",
    "score_x_relevance", "bull_bear_spread", "price_at_news",
]
TARGET_COLS = ["btc_price_3h_after", "actual_return_3h_pct",
               "target_direction", "target_high_impact"]


def load_if_exists(path: str, name: str) -> pd.DataFrame:
    if os.path.exists(path):
        df = pd.read_csv(path, low_memory=False)
        print(f"  ✓ {name}: {len(df):,} rows from {os.path.basename(path)}")
        return df
    else:
        print(f"  ✗ {name}: not found at {path}")
        return pd.DataFrame()


def merge_datasets():
    print("=" * 70)
    print("MERGING ALL DATASETS → MASTER TRAINING CSV")
    print("=" * 70)

    sources = {
        "Historic dataset (best 3h labels)": os.path.join(DATA_DIR, "historic_training_dataset.csv"),
        "MongoDB (live articles)":            os.path.join(DATA_DIR, "news_training_dataset.csv"),
        "External datasets":                  os.path.join(DATA_DIR, "external_training_dataset.csv"),
    }

    frames = []
    for name, path in sources.items():
        df = load_if_exists(path, name)
        if not df.empty:
            frames.append(df)

    if not frames:
        print("\nNo datasets found. Run at least one of:")
        print("  python xgboost_engine/build_historic_dataset.py")
        print("  python xgboost_engine/build_news_dataset.py")
        print("  python xgboost_engine/process_desktop_datasets.py")
        return

    # ── Concatenate ───────────────────────────────────────────────────────────
    combined = pd.concat(frames, ignore_index=True)
    print(f"\nTotal rows before cleaning: {len(combined):,}")

    # ── Keep only rows with valid target labels ───────────────────────────────
    combined = combined.dropna(subset=["target_direction", "actual_return_3h_pct"])
    combined["target_direction"]   = combined["target_direction"].astype(int)
    combined["target_high_impact"] = combined["target_high_impact"].fillna(0).astype(int)
    print(f"Rows with valid price labels: {len(combined):,}")

    # ── Ensure all feature columns present ───────────────────────────────────
    for col in FEATURE_COLUMNS:
        if col not in combined.columns:
            print(f"  ⚠ Missing column '{col}' — filling with 0")
            combined[col] = 0

    # ── Deduplicate on title + date ───────────────────────────────────────────
    dedup_cols = ["_title", "_published_at"] if "_title" in combined.columns else ["finbert_confidence", "price_at_news"]
    before = len(combined)
    combined = combined.drop_duplicates(subset=dedup_cols).reset_index(drop=True)
    print(f"After deduplication: {len(combined):,} rows (removed {before - len(combined):,} duplicates)")

    # ── Class distribution ────────────────────────────────────────────────────
    dist = combined["target_direction"].value_counts().sort_index()
    print(f"\nRaw direction class distribution:")
    for cls, name in [(0, "BEARISH"), (1, "NEUTRAL"), (2, "BULLISH")]:
        cnt = dist.get(cls, 0)
        pct = 100 * cnt / max(len(combined), 1)
        bar = "█" * int(pct / 2)
        print(f"  {name} ({cls}): {cnt:5d}  ({pct:5.1f}%)  {bar}")
    print(f"  HIGH IMPACT:    {combined['target_high_impact'].sum():5d}  ({100*combined['target_high_impact'].mean():.1f}%)")

    # ── Optional: cap NEUTRAL class if massively overrepresented ─────────────
    neutral_count  = dist.get(1, 0)
    bullish_count  = dist.get(2, 0)
    bearish_count  = dist.get(0, 0)
    minority_count = max(min(bullish_count, bearish_count), 50)
    max_neutral    = min(neutral_count, minority_count * 3)   # max 3× minority

    if neutral_count > max_neutral:
        print(f"\nBalancing: capping NEUTRAL from {neutral_count} to {max_neutral}")
        neutral_rows     = combined[combined["target_direction"] == 1].sample(n=max_neutral, random_state=42)
        non_neutral_rows = combined[combined["target_direction"] != 1]
        combined = pd.concat([neutral_rows, non_neutral_rows]).reset_index(drop=True)
        print(f"After balancing: {len(combined):,} rows")

    # ── Shuffle ───────────────────────────────────────────────────────────────
    combined = combined.sample(frac=1, random_state=42).reset_index(drop=True)

    # ── Save master dataset ───────────────────────────────────────────────────
    out_path = os.path.join(DATA_DIR, "master_training_dataset.csv")
    combined.to_csv(out_path, index=False)

    print(f"\n{'='*70}")
    print(f"✓ Master dataset saved: {out_path}")
    print(f"  Total rows : {len(combined):,}")
    print(f"  Features   : {len(FEATURE_COLUMNS)}")
    final_dist = combined["target_direction"].value_counts().sort_index()
    for cls, name in [(0, "BEARISH"), (1, "NEUTRAL"), (2, "BULLISH")]:
        print(f"  {name:8}: {final_dist.get(cls, 0):5d}")

    # ── Readiness assessment ──────────────────────────────────────────────────
    total = len(combined)
    print(f"\n{'─'*40}")
    if total < 200:
        print(f"⚠ {total} rows — too few. Continue collecting (need 200+ minimum).")
    elif total < 500:
        print(f"⚠ {total} rows — minimal. Training will work but accuracy ~55-65%.")
    elif total < 1000:
        print(f"✓ {total} rows — good. Expected accuracy 65-72%.")
    else:
        print(f"✓✓ {total} rows — excellent. Expected accuracy 75-85%.")

    print(f"\nNext step → run: python xgboost_engine/prepare_news_features.py --dataset master_training_dataset.csv")
    print("=" * 70)


if __name__ == "__main__":
    merge_datasets()
