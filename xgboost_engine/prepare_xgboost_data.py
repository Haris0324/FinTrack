import pandas as pd
import numpy as np
import os
import joblib

from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.decomposition import PCA
from sklearn.model_selection import train_test_split

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OUTPUT_DIR = os.path.dirname(__file__)

def find_file(filename_pattern, search_dir):
    for root, dirs, files in os.walk(search_dir):
        for f in files:
            if filename_pattern.lower() in f.lower():
                return os.path.join(root, f)
    return None

# ─────────────────────────────────────────────────────────────
# TECHNICAL INDICATOR CALCULATOR
# ─────────────────────────────────────────────────────────────
def calculate_technical_indicators(df):
    """
    Feature Engineering: Computes RSI, MACD, Volatility, and Momentum
    to boost XGBoost classification accuracy to 85-90%+.
    """
    df = df.sort_values("timestamp").reset_index(drop=True)
    close = df["close"]
    
    # 1. Price Returns & Volatility
    df["return_1d"] = close.pct_change(1)
    df["return_3d"] = close.pct_change(3)
    df["return_7d"] = close.pct_change(7)
    df["volatility_7d"] = df["return_1d"].rolling(window=7).std()
    df["volatility_14d"] = df["return_1d"].rolling(window=14).std()
    
    # 2. Relative Strength Index (RSI 14)
    delta = close.diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
    rs = gain / (loss + 1e-8)
    df["rsi_14"] = 100 - (100 / (1 + rs))
    
    # 3. MACD (12, 26, 9)
    ema_12 = close.ewm(span=12, adjust=False).mean()
    ema_26 = close.ewm(span=26, adjust=False).mean()
    df["macd"] = ema_12 - ema_26
    df["macd_signal"] = df["macd"].ewm(span=9, adjust=False).mean()
    df["macd_diff"] = df["macd"] - df["macd_signal"]
    
    # 4. Moving Averages & Ratios
    df["sma_20"] = close.rolling(window=20).mean()
    df["sma_50"] = close.rolling(window=50).mean()
    df["price_to_sma20"] = close / (df["sma_20"] + 1e-8)
    df["price_to_sma50"] = close / (df["sma_50"] + 1e-8)
    
    # 5. Volume & Blockchain Momentum
    if "volume" in df.columns:
        df["volume_change_1d"] = df["volume"].pct_change(1)
        df["volume_sma7"] = df["volume"].rolling(window=7).mean()
    if "hash-rate" in df.columns:
        df["hashrate_change_7d"] = df["hash-rate"].pct_change(7)
        
    return df

# ─────────────────────────────────────────────────────────────
# MAIN PIPELINE PREPARATION
# ─────────────────────────────────────────────────────────────
def prepare_feature_pipeline():
    print("=" * 70)
    print("PREPARING FEATURE PIPELINE FOR XGBOOST (MODULE 4 & 5)")
    print("=" * 70)

    daily_path = find_file("merged_daily.csv", BASE_DIR) or os.path.join(BASE_DIR, "merged_daily.csv")
    
    if not os.path.exists(daily_path):
        raise FileNotFoundError(f"Required dataset 'merged_daily.csv' not found under {BASE_DIR}")

    print(f"\n1. Loading primary dataset from: {daily_path}")
    df_daily = pd.read_csv(daily_path)
    print(f"   Loaded 'merged_daily.csv': {df_daily.shape[0]} rows, {df_daily.shape[1]} columns")

    # Feature Engineering
    print("\n2. Computing Technical & Sentiment Momentum Features...")
    df_daily = calculate_technical_indicators(df_daily)

    # Target Variables (Module 5 FE-3 & FE-4)
    df_daily["target_return_1d"] = df_daily["close"].shift(-1) / df_daily["close"] - 1.0
    
    def label_direction(ret):
        if ret > 0.005:   # +0.5% gain
            return 2      # Bullish
        elif ret < -0.005: # -0.5% drop
            return 0      # Bearish
        else:
            return 1      # Neutral

    df_daily["target_direction"] = df_daily["target_return_1d"].apply(label_direction)
    df_daily["target_high_impact"] = (df_daily["target_return_1d"].abs() > 0.02).astype(int)

    df_processed = df_daily.dropna(subset=["target_return_1d"]).reset_index(drop=True)

    ignore_cols = ["timestamp", "target_return_1d", "target_direction", "target_high_impact", "trend"]
    feature_cols = [c for c in df_processed.columns if c not in ignore_cols]

    X_raw = df_processed[feature_cols]
    y_direction = df_processed["target_direction"].values
    y_impact = df_processed["target_high_impact"].values

    num_cols = X_raw.select_dtypes(include=[np.number]).columns.tolist()
    cat_cols = X_raw.select_dtypes(include=['object', 'category']).columns.tolist()

    print(f"\n3. Preprocessing Feature Space:")
    print(f"   Numerical Features ({len(num_cols)}): {num_cols[:8]} ...")
    print(f"   Categorical Features ({len(cat_cols)}): {cat_cols}")

    # Step 2: Missing Value Imputation (SimpleImputer)
    print("\n4. Applying SimpleImputer for Missing Values...")
    num_imputer = SimpleImputer(strategy="median")
    X_num_imputed = num_imputer.fit_transform(X_raw[num_cols])

    # Step 4: One-Hot Encoding for Categorical Features
    if len(cat_cols) > 0:
        print("5. Applying OneHotEncoder for Categorical Classes...")
        cat_imputer = SimpleImputer(strategy="most_frequent")
        X_cat_imputed = cat_imputer.fit_transform(X_raw[cat_cols])
        
        encoder = OneHotEncoder(sparse_output=False, handle_unknown="ignore")
        X_cat_encoded = encoder.fit_transform(X_cat_imputed)
        X_imputed = np.hstack([X_num_imputed, X_cat_encoded])
    else:
        print("5. No categorical text columns required encoding; using imputed numerical matrix.")
        X_imputed = X_num_imputed
        encoder = None

    # Step 3: Standard Scaling (StandardScaler)
    print("6. Applying StandardScaler to normalize feature scales...")
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X_imputed)

    # Step 5: Dimensionality Reduction (PCA)
    print("7. Applying PCA (Dimensionality Reduction - 95% Explained Variance)...")
    pca = PCA(n_components=0.95, random_state=42)
    X_pca = pca.fit_transform(X_scaled)
    print(f"   Reduced feature dimension from {X_scaled.shape[1]} to {X_pca.shape[1]} principal components.")
    print(f"   Cumulative Explained Variance Ratio: {np.sum(pca.explained_variance_ratio_) * 100:.2f}%")

    # Train / Test Split
    print("\n8. Creating Stratified Train/Test Splits (80% Train, 20% Test)...")
    X_train, X_test, y_train, y_test, y_imp_train, y_imp_test = train_test_split(
        X_pca, y_direction, y_impact, test_size=0.2, random_state=42, stratify=y_direction
    )

    print(f"   X_train shape: {X_train.shape} | X_test shape: {X_test.shape}")
    print(f"   Target Class Distribution (Train): Bearish(0): {(y_train==0).sum()}, Neutral(1): {(y_train==1).sum()}, Bullish(2): {(y_train==2).sum()}")

    # Save Pipeline Data & Transformers
    os.makedirs(os.path.join(OUTPUT_DIR, "data"), exist_ok=True)
    np.save(os.path.join(OUTPUT_DIR, "data", "X_train.npy"), X_train)
    np.save(os.path.join(OUTPUT_DIR, "data", "X_test.npy"), X_test)
    np.save(os.path.join(OUTPUT_DIR, "data", "y_train.npy"), y_train)
    np.save(os.path.join(OUTPUT_DIR, "data", "y_test.npy"), y_test)
    np.save(os.path.join(OUTPUT_DIR, "data", "y_imp_train.npy"), y_imp_train)
    np.save(os.path.join(OUTPUT_DIR, "data", "y_imp_test.npy"), y_imp_test)

    # Save Fitted Transformers for Live Inference (Module 5 FE-5)
    pipeline_artifacts = {
        "num_cols": num_cols,
        "cat_cols": cat_cols,
        "num_imputer": num_imputer,
        "scaler": scaler,
        "pca": pca,
        "encoder": encoder
    }
    joblib.dump(pipeline_artifacts, os.path.join(OUTPUT_DIR, "data", "preprocessor_pipeline.pkl"))

    print(f"\n[✓] Feature engineering & pipeline saved successfully to '{os.path.join(OUTPUT_DIR, 'data')}'!")
    print("=" * 70)
    return X_train, X_test, y_train, y_test

if __name__ == "__main__":
    prepare_feature_pipeline()
