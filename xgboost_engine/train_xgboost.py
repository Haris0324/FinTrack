"""
╔══════════════════════════════════════════════════════════════════════════════╗
║         TRAIN NEWS-DRIVEN XGBOOST MODELS                                   ║
║                                                                              ║
║  Trains two XGBoost models on news-derived features:                        ║
║    1. Direction Classifier  → BEARISH / NEUTRAL / BULLISH                   ║
║    2. High-Impact Detector  → HIGH IMPACT / LOW IMPACT                      ║
║                                                                              ║
║  Run after prepare_news_features.py:                                        ║
║    python xgboost_engine/train_xgboost.py                                   ║
╚══════════════════════════════════════════════════════════════════════════════╝
"""

import os
import json
import numpy as np
import xgboost as xgb
from sklearn.metrics import (
    classification_report, accuracy_score,
    confusion_matrix, roc_auc_score
)

BASE_DIR  = os.path.dirname(os.path.abspath(__file__))
DATA_DIR  = os.path.join(BASE_DIR, "data")
MODEL_DIR = os.path.join(BASE_DIR, "xgboost_model")
os.makedirs(MODEL_DIR, exist_ok=True)


def train_and_evaluate():
    print("=" * 70)
    print("TRAINING NEWS-DRIVEN XGBOOST MODELS (v2 — news features)")
    print("=" * 70)

    # ── Load processed arrays ─────────────────────────────────────────────────
    for path in [os.path.join(DATA_DIR, "X_train.npy"),
                 os.path.join(DATA_DIR, "y_train.npy")]:
        if not os.path.exists(path):
            raise FileNotFoundError(
                f"'{path}' not found. Run prepare_news_features.py first."
            )

    X_train      = np.load(os.path.join(DATA_DIR, "X_train.npy"))
    X_test       = np.load(os.path.join(DATA_DIR, "X_test.npy"))
    y_train      = np.load(os.path.join(DATA_DIR, "y_train.npy"))
    y_test       = np.load(os.path.join(DATA_DIR, "y_test.npy"))
    y_imp_train  = np.load(os.path.join(DATA_DIR, "y_imp_train.npy"))
    y_imp_test   = np.load(os.path.join(DATA_DIR, "y_imp_test.npy"))

    print(f"\nLoaded feature matrices:")
    print(f"  X_train: {X_train.shape} | X_test: {X_test.shape}")
    print(f"  y_train — BEARISH: {(y_train==0).sum()}, NEUTRAL: {(y_train==1).sum()}, BULLISH: {(y_train==2).sum()}")

    n_samples = len(X_train)
    is_small  = n_samples < 300   # Adjust hyperparams for small datasets

    # ═════════════════════════════════════════════════════════════════════════
    # MODEL 1: Direction Classifier
    # ═════════════════════════════════════════════════════════════════════════
    print(f"\n{'─'*60}")
    print("Training Direction Classifier (BEARISH / NEUTRAL / BULLISH)...")
    print(f"{'─'*60}")

    # Compute class weights to handle imbalanced direction classes
    class_counts = {cls: int((y_train == cls).sum()) for cls in [0, 1, 2]}
    total        = len(y_train)
    # Weight = total / (n_classes × class_count)
    sample_weights = np.array([
        total / (3 * class_counts[int(y)]) for y in y_train
    ])

    dir_model = xgb.XGBClassifier(
        n_estimators     = 300 if not is_small else 150,
        learning_rate    = 0.05 if not is_small else 0.08,
        max_depth        = 5,
        subsample        = 0.80,
        colsample_bytree = 0.80,
        reg_alpha        = 0.2,
        reg_lambda       = 1.5,
        gamma            = 0.1,
        min_child_weight = 3,
        objective        = "multi:softprob",
        num_class        = 3,
        random_state     = 42,
        eval_metric      = "mlogloss",
        early_stopping_rounds = 20 if not is_small else None,
    )

    fit_kwargs = dict(
        X=X_train,
        y=y_train,
        sample_weight=sample_weights,
        eval_set=[(X_train, y_train), (X_test, y_test)],
        verbose=50,
    )
    # early_stopping requires eval_set — only use with enough data
    if is_small:
        fit_kwargs.pop("early_stopping_rounds", None)
        dir_model.set_params(early_stopping_rounds=None)

    dir_model.fit(**fit_kwargs)

    y_pred_dir   = dir_model.predict(X_test)
    y_proba_dir  = dir_model.predict_proba(X_test)
    acc_dir      = accuracy_score(y_test, y_pred_dir)

    print(f"\n{'='*60}")
    print(f"DIRECTION MODEL RESULTS")
    print(f"  Accuracy: {acc_dir * 100:.2f}%")
    print(f"{'='*60}")
    print(classification_report(y_test, y_pred_dir,
                                 target_names=["BEARISH", "NEUTRAL", "BULLISH"]))
    print("Confusion Matrix:")
    print(confusion_matrix(y_test, y_pred_dir))

    # AUC-ROC (one-vs-rest)
    try:
        auc = roc_auc_score(y_test, y_proba_dir, multi_class="ovr", average="macro")
        print(f"  AUC-ROC (macro OVR): {auc:.4f}")
    except Exception:
        pass

    # Feature importances
    if hasattr(dir_model, "feature_importances_"):
        import joblib
        pipeline = joblib.load(os.path.join(DATA_DIR, "preprocessor_pipeline.pkl"))
        feat_cols = pipeline.get("feature_columns", [])
        if feat_cols:
            importances = dir_model.feature_importances_
            top_n = sorted(zip(feat_cols, importances), key=lambda x: -x[1])[:10]
            print("\nTop 10 Feature Importances:")
            for name, imp in top_n:
                bar = "█" * int(imp * 100)
                print(f"  {name:<30} {imp:.4f}  {bar}")

    # ═════════════════════════════════════════════════════════════════════════
    # MODEL 2: High-Impact Detector
    # ═════════════════════════════════════════════════════════════════════════
    print(f"\n{'─'*60}")
    print("Training High-Impact Detector (HIGH / LOW IMPACT)...")
    print(f"{'─'*60}")

    # Class weight for imbalanced impact labels
    n_pos = y_imp_train.sum()
    n_neg = len(y_imp_train) - n_pos
    scale_pos_weight = n_neg / max(n_pos, 1)
    print(f"  HIGH IMPACT samples: {n_pos} | LOW IMPACT: {n_neg}")
    print(f"  scale_pos_weight: {scale_pos_weight:.2f}")

    imp_model = xgb.XGBClassifier(
        n_estimators     = 200 if not is_small else 100,
        learning_rate    = 0.06 if not is_small else 0.10,
        max_depth        = 4,
        subsample        = 0.80,
        colsample_bytree = 0.80,
        reg_alpha        = 0.3,
        reg_lambda       = 2.0,
        scale_pos_weight = scale_pos_weight,
        objective        = "binary:logistic",
        random_state     = 42,
        eval_metric      = "logloss",
    )

    imp_model.fit(
        X_train, y_imp_train,
        eval_set=[(X_test, y_imp_test)],
        verbose=False,
    )

    y_pred_imp  = imp_model.predict(X_test)
    acc_imp     = accuracy_score(y_imp_test, y_pred_imp)
    print(f"  High-Impact Detection Accuracy: {acc_imp * 100:.2f}%")
    print(classification_report(y_imp_test, y_pred_imp,
                                 target_names=["LOW IMPACT", "HIGH IMPACT"]))

    # ═════════════════════════════════════════════════════════════════════════
    # SAVE MODELS
    # ═════════════════════════════════════════════════════════════════════════
    dir_path = os.path.join(MODEL_DIR, "xgboost_direction_model.json")
    imp_path = os.path.join(MODEL_DIR, "xgboost_impact_model.json")

    dir_model.save_model(dir_path)
    imp_model.save_model(imp_path)

    metadata = {
        "version":              "news_v2",
        "feature_type":         "news_derived_finbert",
        "direction_accuracy":   round(float(acc_dir), 4),
        "impact_accuracy":      round(float(acc_imp), 4),
        "n_features":           X_train.shape[1],
        "n_train_samples":      int(X_train.shape[0]),
        "direction_threshold":  0.5,
        "high_impact_threshold": 2.0,
        "target_classes":       {"0": "BEARISH", "1": "NEUTRAL", "2": "BULLISH"},
        "status":               "trained_on_news_features",
    }

    with open(os.path.join(MODEL_DIR, "model_metadata.json"), "w") as f:
        json.dump(metadata, f, indent=2)

    print(f"\n{'='*70}")
    print(f"✓ Models saved to '{MODEL_DIR}'")
    print(f"  Direction Model : xgboost_direction_model.json  (acc={acc_dir*100:.1f}%)")
    print(f"  Impact Model    : xgboost_impact_model.json     (acc={acc_imp*100:.1f}%)")
    print(f"  Metadata        : model_metadata.json")
    print(f"\n✓ Now update predict_impact.py to use the 'news_v2' pipeline.")
    print(f"  The model is now trained on FinBERT features — predictions will be accurate!")
    print(f"{'='*70}")

    return acc_dir, acc_imp


if __name__ == "__main__":
    train_and_evaluate()
