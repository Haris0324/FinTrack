import torch
from torch.utils.data import Dataset
import pandas as pd
import os

class FinBERTDataset(Dataset):
    """
    Custom PyTorch Dataset for FinBERT fine-tuning.
    Converts raw text & sentiment label into PyTorch token tensors.
    """
    
    def __init__(self, csv_path, tokenizer, max_length=128):
        if not os.path.exists(csv_path):
            raise FileNotFoundError(f"Dataset CSV not found at '{csv_path}'")

        self.df = pd.read_csv(csv_path)
        self.tokenizer = tokenizer
        self.max_length = max_length
        
        # Clean null values
        self.df = self.df.dropna(subset=['text', 'label_id']).reset_index(drop=True)
    
    def __len__(self):
        return len(self.df)
    
    def __getitem__(self, idx):
        text = str(self.df.loc[idx, 'text'])
        label = int(self.df.loc[idx, 'label_id'])
        
        # Tokenization & Encoding
        encoding = self.tokenizer(
            text,
            return_tensors='pt',
            truncation=True,
            padding='max_length',
            max_length=self.max_length
        )
        
        return {
            'input_ids': encoding['input_ids'].squeeze(0),
            'attention_mask': encoding['attention_mask'].squeeze(0),
            'token_type_ids': encoding['token_type_ids'].squeeze(0),
            'labels': torch.tensor(label, dtype=torch.long)
        }
