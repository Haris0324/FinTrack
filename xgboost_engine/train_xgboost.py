import numpy as np
import os
import json
import xgboost as xgb
from sklearn.metrics import classification_report, accuracy_score, confusion_matrix, roc_auc_score

BASE_DIR = os.path.dirname(__file__)
DATA_DIR = os.path.join(BASE_DIR, "data")
MODEL_DIR = os.path.join(BASE_DIR, "xgboost_model")

def train_and_evaluate_xgboost():
    print("=" * 70)
    print("TRAINING OPTIMIZED XGBOOST IMPACT & DIRECTION ENGINE (MODULE 4 & 5)")
    print("=" * 70)

    # 1. Load Processed Arrays
    X_train_path = os.path.join(DATA_DIR, "X_train.npy")
    X_test_path = os.path.join(DATA_DIR, "X_test.npy")
    y_train_path = os.path.join(DATA_DIR, "y_train.npy")
    y_test_path = os.path.join(DATA_DIR, "y_test.npy")
    y_imp_train_path = os.path.join(DATA_DIR, "y_imp_train.npy")
    y_imp_test_path = os.path.join(DATA_DIR, "y_imp_test.npy")

    if not os.path.exists(X_train_path):
        raise FileNotFoundError(f"Processed feature matrix not found at '{X_train_path}'. Please run prepare_xgboost_data.py first.")

    X_train = np.load(X_train_path)
    X_test = np.load(X_test_path)
    y_train = np.load(y_train_path)
    y_test = np.load(y_test_path)
    y_imp_train = np.load(y_imp_train_path)
    y_imp_test = np.load(y_imp_test_path)

    print(f"\nLoaded PCA Feature Matrices:")
    print(f"  X_train: {X_train.shape} | X_test: {X_test.shape}")
    print(f"  y_train direction distribution: Bearish(0): {(y_train==0).sum()}, Neutral(1): {(y_train==1).sum()}, Bullish(2): {(y_train==2).sum()}")

    # 2. Train Optimized Direction Classifier (Bullish / Neutral / Bearish)
    print("\nTraining Multi-Class Market Movement Direction XGBoost Model...")
    
    dir_model = xgb.XGBClassifier(
        n_estimators=400,
        learning_rate=0.03,
        max_depth=6,
        subsample=0.8,
        colsample_bytree=0.8,
        reg_alpha=0.1,
        reg_lambda=1.0,
        gamma=0.1,
        objective="multi:softprob",
        num_class=3,
        random_state=42,
        eval_metric="mlogloss"
    )

    dir_model.fit(
        X_train, y_train,
        eval_set=[(X_train, y_train), (X_test, y_test)],
        verbose=100
    )

    # Predictions & Evaluation
    y_pred_dir = dir_model.predict(X_test)
    y_proba_dir = dir_model.predict_proba(X_test)
    acc_dir = accuracy_score(y_test, y_pred_dir)

    print("\n" + "=" * 60)
    print(f"MARKET DIRECTION PREDICTION RESULTS")
    print(f"ACCURACY: {acc_dir * 100:.2f}%")
    print("=" * 60)
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred_dir, target_names=["Bearish (-)", "Neutral (=)", "Bullish (+)"]))

    print("Confusion Matrix:")
    print(confusion_matrix(y_test, y_pred_dir))

    # 3. Train High-Impact Classifier (HIGH IMPACT vs LOW IMPACT)
    print("\nTraining High-Impact Event XGBoost Classifier...")
    imp_model = xgb.XGBClassifier(
        n_estimators=300,
        learning_rate=0.04,
        max_depth=5,
        subsample=0.8,
        colsample_bytree=0.8,
        reg_alpha=0.2,
        reg_lambda=1.5,
        objective="binary:logistic",
        random_state=42,
        eval_metric="logloss"
    )

    imp_model.fit(X_train, y_imp_train, eval_set=[(X_test, y_imp_test)], verbose=False)
    y_pred_imp = imp_model.predict(X_test)
    acc_imp = accuracy_score(y_imp_test, y_pred_imp)

    print(f"\nHigh-Impact Detection Accuracy: {acc_imp * 100:.2f}%")

    # 4. Save Trained Models & Metadata
    os.makedirs(MODEL_DIR, exist_ok=True)
    dir_model_path = os.path.join(MODEL_DIR, "xgboost_direction_model.json")
    imp_model_path = os.path.join(MODEL_DIR, "xgboost_impact_model.json")
    
    dir_model.save_model(dir_model_path)
    imp_model.save_model(imp_model_path)

    metadata = {
        "direction_accuracy": round(float(acc_dir), 4),
        "impact_accuracy": round(float(acc_imp), 4),
        "num_features_pca": X_train.shape[1],
        "n_estimators": 400,
        "max_depth": 6,
        "learning_rate": 0.03,
        "target_classes": {"0": "Bearish", "1": "Neutral", "2": "Bullish"},
        "status": "trained_and_verified"
    }

    with open(os.path.join(MODEL_DIR, "model_metadata.json"), "w") as f:
        json.dump(metadata, f, indent=2)

    print(f"\n[✓] Models successfully saved to '{MODEL_DIR}'!")
    print(f"    - Direction Model: xgboost_direction_model.json")
    print(f"    - Impact Model:    xgboost_impact_model.json")
    print(f"    - Metadata:        model_metadata.json")
    print("=" * 70)

if __name__ == "__main__":
    train_and_evaluate_xgboost()
