"""
╔══════════════════════════════════════════════════════════════════════════════╗
║         PREPARE NEWS FEATURES FOR XGBOOST TRAINING                         ║
║                                                                              ║
║  Reads news_training_dataset.csv, applies preprocessing,                    ║
║  and saves train/test splits + fitted pipeline for consistent inference.    ║
║                                                                              ║
║  Run after build_news_dataset.py:                                           ║
║    python xgboost_engine/prepare_news_features.py                           ║
╚══════════════════════════════════════════════════════════════════════════════╝
"""

import os
import numpy as np
import pandas as pd
import joblib
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.impute import SimpleImputer

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
os.makedirs(DATA_DIR, exist_ok=True)

# ── Columns that are purely metadata / target — excluded from features ────────
META_COLS    = ["_published_at", "_title", "_sentiment"]
TARGET_COLS  = ["btc_price_3h_after", "actual_return_3h_pct", "target_direction", "target_high_impact"]
PRICE_COLS   = ["price_at_news"]   # kept as feature, not dropped

# ── The exact ordered feature list the model will train and infer on ──────────
#    This list MUST stay in sync with predict_impact.py's feature construction.
FEATURE_COLUMNS = [
    # FinBERT core (from FinBERT output)
    "finbert_positive_prob",
    "finbert_negative_prob",
    "finbert_neutral_prob",
    "finbert_confidence",
    "sentiment_encoded",
    # Context
    "relevance_weight",
    "urgency_flag",
    "source_weight",
    # Entities
    "has_bitcoin",
    "has_sec",
    "has_federal_reserve",
    "has_blackrock",
    "has_binance",
    "has_coinbase",
    "has_ethereum",
    "has_solana",
    "has_xrp",
    "has_elon_musk",
    "has_microstrategy",
    "entity_count",
    # Time
    "hour_of_day",
    "day_of_week",
    # Text
    "title_word_count",
    # Interaction / derived
    "score_x_relevance",
    "bull_bear_spread",
    # Price context
    "price_at_news",
]


def prepare_news_features(dataset_filename: str = None):
    print("=" * 70)
    print("PREPARING NEWS FEATURE MATRIX FOR XGBOOST")
    print("=" * 70)

    # Priority: master > external > mongodb-only
    candidates = [
        dataset_filename,
        "master_training_dataset.csv",
        "external_training_dataset.csv",
        "news_training_dataset.csv",
    ]
    dataset_path = None
    for cand in candidates:
        if cand:
            p = os.path.join(DATA_DIR, cand)
            if os.path.exists(p):
                dataset_path = p
                break

    if dataset_path is None:
        raise FileNotFoundError(
            "No training dataset found in xgboost_engine/data/.\n"
            "Run one of:\n"
            "  python xgboost_engine/build_news_dataset.py\n"
            "  python xgboost_engine/process_external_datasets.py\n"
            "  python xgboost_engine/merge_all_datasets.py"
        )
    print(f"\nUsing dataset: {os.path.basename(dataset_path)}")

    df = pd.read_csv(dataset_path)
    print(f"\n✓ Loaded dataset: {df.shape[0]} rows × {df.shape[1]} columns")

    # Check minimum dataset size
    if len(df) < 100:
        print(f"\n⚠ Only {len(df)} rows — recommended minimum is 200+ for reliable training.")
        print("  Continue running the pipeline to collect more articles, then re-run.")
        if len(df) < 30:
            raise ValueError("Too few rows (<30) — training would be meaningless.")

    # ── Add any missing feature columns with 0 ────────────────────────────────
    for col in FEATURE_COLUMNS:
        if col not in df.columns:
            print(f"  ⚠ Missing column '{col}' — filling with 0")
            df[col] = 0

    # ── Extract X and y ───────────────────────────────────────────────────────
    X = df[FEATURE_COLUMNS].copy()
    y_direction   = df["target_direction"].values.astype(int)
    y_high_impact = df["target_high_impact"].values.astype(int)

    print(f"\nFeature matrix shape: {X.shape}")
    print(f"Feature columns ({len(FEATURE_COLUMNS)}): {FEATURE_COLUMNS}")

    print(f"\nClass distribution:")
    for cls, name in [(0, "BEARISH"), (1, "NEUTRAL"), (2, "BULLISH")]:
        count = (y_direction == cls).sum()
        pct   = 100 * count / len(y_direction)
        print(f"  {name} ({cls}): {count}  ({pct:.1f}%)")
    print(f"  HIGH IMPACT: {y_high_impact.sum()}  ({100*y_high_impact.mean():.1f}%)")

    # ── Impute missing values ─────────────────────────────────────────────────
    print("\nApplying median imputation for missing values...")
    imputer = SimpleImputer(strategy="median")
    X_imputed = imputer.fit_transform(X)

    # ── Scale features ────────────────────────────────────────────────────────
    print("Applying StandardScaler...")
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X_imputed)

    # NOTE: We do NOT apply PCA here.
    # The feature space is already small (26 features) and meaningful.
    # PCA would destroy interpretability of FinBERT features.

    # ── Train / test split ────────────────────────────────────────────────────
    print("\nSplitting 80% train / 20% test (stratified)...")
    try:
        X_train, X_test, y_train, y_test, y_imp_train, y_imp_test = train_test_split(
            X_scaled, y_direction, y_high_impact,
            test_size=0.20, random_state=42, stratify=y_direction
        )
    except ValueError:
        # Fallback if a class has too few samples for stratification
        X_train, X_test, y_train, y_test, y_imp_train, y_imp_test = train_test_split(
            X_scaled, y_direction, y_high_impact,
            test_size=0.20, random_state=42
        )

    print(f"  Train: {X_train.shape} | Test: {X_test.shape}")

    # ── Save arrays ───────────────────────────────────────────────────────────
    np.save(os.path.join(DATA_DIR, "X_train.npy"),       X_train)
    np.save(os.path.join(DATA_DIR, "X_test.npy"),        X_test)
    np.save(os.path.join(DATA_DIR, "y_train.npy"),       y_train)
    np.save(os.path.join(DATA_DIR, "y_test.npy"),        y_test)
    np.save(os.path.join(DATA_DIR, "y_imp_train.npy"),   y_imp_train)
    np.save(os.path.join(DATA_DIR, "y_imp_test.npy"),    y_imp_test)

    # ── Save pipeline (used at inference time in predict_impact.py) ───────────
    pipeline = {
        "feature_columns": FEATURE_COLUMNS,
        "imputer":         imputer,
        "scaler":          scaler,
        "pca":             None,   # No PCA — but keep key for compatibility
        "version":         "news_v2",
    }
    pipeline_path = os.path.join(DATA_DIR, "preprocessor_pipeline.pkl")
    joblib.dump(pipeline, pipeline_path)

    print(f"\n✓ Saved feature arrays and preprocessor pipeline to '{DATA_DIR}'")
    print(f"  pipeline version: news_v2 ({len(FEATURE_COLUMNS)} news features, no PCA)")
    print(f"\nNext step → run: python xgboost_engine/train_xgboost.py")
    print("=" * 70)



if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset", default=None,
                        help="Dataset filename inside xgboost_engine/data/ (e.g. master_training_dataset.csv)")
    args = parser.parse_args()
    prepare_news_features(dataset_filename=args.dataset)
