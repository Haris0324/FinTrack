import pandas as pd
import numpy as np
import os
import json

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

def find_file_broad(patterns, search_dir):
    if isinstance(patterns, str):
        patterns = [patterns]
    for root, dirs, files in os.walk(search_dir):
        for f in files:
            f_lower = f.lower()
            if any(p.lower() in f_lower for p in patterns) and f_lower.endswith('.csv'):
                return os.path.join(root, f)
    return None

def profile_all_datasets():
    print("=" * 70)
    print("DATASET PROFILING & EDA SUMMARY REPORT (MODULE 4 & 5)")
    print("=" * 70)

    target_files = {
        "merged_daily": ["merged_daily"],
        "btc_news_prices": ["btc.csv", "btc_news"],
        "cryptovision": ["cryptodataset", "cryptovision"],
        "historic_1min": ["btcusd_1-min", "1-min", "historic"]
    }
    
    report_data = {}
    
    for name, patterns in target_files.items():
        print(f"\n--- Profiling Dataset: {name} ---")
        found_path = find_file_broad(patterns, BASE_DIR)
        
        if not found_path or not os.path.exists(found_path):
            print(f"  [!] Notice: Patterns {patterns} not found under '{BASE_DIR}'. Make sure folder is uploaded.")
            continue
            
        print(f"  Found File Path: {found_path}")
        try:
            df = pd.read_csv(found_path, nrows=5000, low_memory=False)
            
            missing_series = df.isnull().sum()
            num_cols = df.select_dtypes(include=[np.number]).columns.tolist()
            cat_cols = df.select_dtypes(include=['object', 'category']).columns.tolist()
            
            info = {
                "file_path": found_path,
                "total_rows_sampled": len(df),
                "total_columns": len(df.columns),
                "numerical_features_count": len(num_cols),
                "categorical_features_count": len(cat_cols),
                "numerical_columns": num_cols[:10],
                "categorical_columns": cat_cols[:10],
                "missing_values_summary": {col: int(cnt) for col, cnt in missing_series.items() if cnt > 0}
            }
            
            report_data[name] = info
            
            print(f"  Total Rows (sampled): {len(df):,}")
            print(f"  Total Columns: {len(df.columns)}")
            print(f"  Numerical Features: {len(num_cols)} | Categorical Features: {len(cat_cols)}")
            if info["missing_values_summary"]:
                print(f"  Columns with missing values: {len(info['missing_values_summary'])}")
            else:
                print("  No missing values detected in sample.")
                
        except Exception as e:
            print(f"  Error profiling {name}: {e}")

    out_json = os.path.join(os.path.dirname(__file__), "dataset_profiling_report.json")
    with open(out_json, "w") as f:
        json.dump(report_data, f, indent=2)
        
    print(f"\n[✓] Fast profiling complete! Report saved to: {out_json}")
    print("=" * 70)

if __name__ == "__main__":
    profile_all_datasets()
