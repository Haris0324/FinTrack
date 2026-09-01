import pandas as pd
import numpy as np
import re
from sklearn.model_selection import train_test_split
import os

# ─────────────────────────────────────────────────────────────
# LABEL MAPPING
# FinBERT integer labels: positive=0, negative=1, neutral=2
# ─────────────────────────────────────────────────────────────
LABEL2ID = {'positive': 0, 'negative': 1, 'neutral': 2}
ID2LABEL = {0: 'positive', 1: 'negative', 2: 'neutral'}


# ─────────────────────────────────────────────────────────────
# TEXT CLEANING FUNCTION
# Retain key financial markers: $, %, numbers, punctuation
# ─────────────────────────────────────────────────────────────
def clean_text(text):
    if not isinstance(text, str):
        return ""
    
    # Remove URLs
    text = re.sub(r'http\S+|www\S+', '', text)
    
    # Remove @mentions and format hashtags (keep hashtag word: #Bitcoin -> Bitcoin)
    text = re.sub(r'@\w+', '', text)
    text = re.sub(r'#(\w+)', r'\1', text)
    
    # Remove special characters but KEEP: . , $ % - numbers letters spaces
    text = re.sub(r'[^\w\s$%.,\-]', ' ', text)
    
    # Remove extra whitespace
    text = re.sub(r'\s+', ' ', text).strip()
    
    # Drop extremely short snippets (<10 characters)
    if len(text) < 10:
        return ""
    
    return text


# ─────────────────────────────────────────────────────────────
# DATASET 1: bitcoin_sentiments_21_24.csv
# Continuous sentiment scores (-1.0 to +1.0)
# Unlabeled rows (score == 0.0) are filtered out
# ─────────────────────────────────────────────────────────────
def load_bitcoin_sentiments(filepath):
    print(f"Loading {filepath}...")
    if not os.path.exists(filepath):
        print(f"  Warning: {filepath} not found.")
        return pd.DataFrame(columns=['text', 'label', 'source'])

    df = pd.read_csv(filepath, encoding='latin-1')
    
    # Drop rows where score is exactly 0.0 (unlabeled)
    if 'Accurate Sentiments' in df.columns:
        df = df[df['Accurate Sentiments'] != 0.0].copy()
        
        def score_to_label(score):
            if score > 0.1:
                return 'positive'
            elif score < -0.1:
                return 'negative'
            else:
                return 'neutral'
        
        df['label'] = df['Accurate Sentiments'].apply(score_to_label)
    
    text_col = 'Short Description' if 'Short Description' in df.columns else 'text'
    df['text'] = df[text_col].apply(clean_text)
    
    # Drop empty texts
    df = df[df['text'] != ''].copy()
    
    result = df[['text', 'label']].copy()
    result['source'] = 'bitcoin_sentiments'
    
    print(f"  Processed {len(result)} rows from Bitcoin Sentiments.")
    print("  Label distribution:")
    print(result['label'].value_counts().to_string())
    return result


# ─────────────────────────────────────────────────────────────
# DATASET 2: FinancialPhraseBank/Sentences_AllAgree.txt
# High quality expert-annotated financial sentences
# Format: "sentence text@label"
# ─────────────────────────────────────────────────────────────
def load_financial_phrasebank(filepath):
    print(f"\nLoading {filepath}...")
    if not os.path.exists(filepath):
        print(f"  Warning: {filepath} not found.")
        return pd.DataFrame(columns=['text', 'label', 'source'])

    rows = []
    with open(filepath, 'r', encoding='latin-1') as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            parts = line.rsplit('@', 1)
            if len(parts) == 2:
                text = clean_text(parts[0].strip())
                label = parts[1].strip().lower()
                if text and label in LABEL2ID:
                    rows.append({'text': text, 'label': label})
    
    df = pd.DataFrame(rows)
    df['source'] = 'financial_phrasebank'
    
    print(f"  Processed {len(df)} rows from FinancialPhraseBank.")
    print("  Label distribution:")
    print(df['label'].value_counts().to_string())
    return df


# ─────────────────────────────────────────────────────────────
# DATASET 3: tweets.csv
# Crypto/Bitcoin tweets (2022-2024)
# Undersample neutral class to prevent class imbalance skew
# ─────────────────────────────────────────────────────────────
def load_tweets(filepath, max_neutral=8000):
    print(f"\nLoading {filepath}...")
    if not os.path.exists(filepath):
        print(f"  Warning: {filepath} not found.")
        return pd.DataFrame(columns=['text', 'label', 'source'])

    df = pd.read_csv(filepath, encoding='latin-1')
    
    df['label'] = df['sentiment_label'].astype(str).str.lower().str.strip()
    df['text'] = df['text'].apply(clean_text)
    
    df = df[df['text'] != ''].copy()
    df = df[df['label'].isin(LABEL2ID.keys())].copy()
    
    # Undersample neutral class if needed
    neutral = df[df['label'] == 'neutral']
    if len(neutral) > max_neutral:
        neutral = neutral.sample(n=max_neutral, random_state=42)
        
    non_neutral = df[df['label'] != 'neutral']
    df = pd.concat([neutral, non_neutral]).reset_index(drop=True)
    
    result = df[['text', 'label']].copy()
    result['source'] = 'tweets'
    
    print(f"  Processed {len(result)} rows from Tweets.")
    print("  Label distribution:")
    print(result['label'].value_counts().to_string())
    return result


# ─────────────────────────────────────────────────────────────
# COMBINE DATASETS & CREATE STRATIFIED SPLITS
# ─────────────────────────────────────────────────────────────
def combine_and_split():
    # Detect dataset paths handling directory spaces
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    
    path_btc = os.path.join(base_dir, 'archive 3', 'bitcoin_sentiments_21_24.csv')
    if not os.path.exists(path_btc):
        path_btc = os.path.join(base_dir, 'archive_3', 'bitcoin_sentiments_21_24.csv')

    path_fpb = os.path.join(base_dir, 'archive 4', 'FinancialPhraseBank', 'Sentences_AllAgree.txt')
    if not os.path.exists(path_fpb):
        path_fpb = os.path.join(base_dir, 'archive_4', 'FinancialPhraseBank', 'Sentences_AllAgree.txt')

    path_tweets = os.path.join(base_dir, 'archive', 'tweets.csv')
    
    df1 = load_bitcoin_sentiments(path_btc)
    df2 = load_financial_phrasebank(path_fpb)
    df3 = load_tweets(path_tweets, max_neutral=8000)
    
    combined = pd.concat([df1, df2, df3], ignore_index=True)
    
    if len(combined) == 0:
        raise ValueError("No data loaded! Please check dataset paths.")

    # Deduplicate exact text entries
    before = len(combined)
    combined = combined.drop_duplicates(subset='text').reset_index(drop=True)
    print(f"\nRemoved {before - len(combined)} duplicate text entries.")
    
    # Map label text to integer ID
    combined['label_id'] = combined['label'].map(LABEL2ID)
    combined = combined.dropna(subset=['label_id'])
    combined['label_id'] = combined['label_id'].astype(int)
    
    print("\n=== COMBINED DATASET SUMMARY ===")
    print(f"Total Rows: {len(combined)}")
    print("Class Distribution:")
    print(combined['label'].value_counts().to_string())
    print("\nSource Distribution:")
    print(combined['source'].value_counts().to_string())
    
    # Stratified split: 80% train, 10% val, 10% test
    train, temp = train_test_split(
        combined,
        test_size=0.2,
        random_state=42,
        stratify=combined['label_id']
    )
    val, test = train_test_split(
        temp,
        test_size=0.5,
        random_state=42,
        stratify=temp['label_id']
    )
    
    print("\n=== DATASET SPLITS ===")
    print(f"Train set: {len(train)} rows")
    print(f"Val set:   {len(val)} rows")
    print(f"Test set:  {len(test)} rows")
    
    out_dir = os.path.join(os.path.dirname(__file__), 'data')
    os.makedirs(out_dir, exist_ok=True)
    
    train.to_csv(os.path.join(out_dir, 'train.csv'), index=False)
    val.to_csv(os.path.join(out_dir, 'val.csv'), index=False)
    test.to_csv(os.path.join(out_dir, 'test.csv'), index=False)
    
    print(f"\nDatasets saved to {out_dir}/: train.csv, val.csv, test.csv")
    return train, val, test


if __name__ == "__main__":
    combine_and_split()
