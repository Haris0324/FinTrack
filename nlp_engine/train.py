import torch
import torch.nn.functional as F
from torch.utils.data import DataLoader
from transformers import BertTokenizer, BertForSequenceClassification
from transformers import get_linear_schedule_with_warmup
from torch.optim import AdamW
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score
import numpy as np
import os
import json
import time

from dataset import FinBERTDataset

# ─────────────────────────────────────────────────────────────
# TRAINING CONFIGURATION
# ─────────────────────────────────────────────────────────────
BASE_DIR = os.path.dirname(__file__)

CONFIG = {
    'model_path': os.path.join(BASE_DIR, 'finbert_base'),
    'train_csv': os.path.join(BASE_DIR, 'data', 'train.csv'),
    'val_csv': os.path.join(BASE_DIR, 'data', 'val.csv'),
    'test_csv': os.path.join(BASE_DIR, 'data', 'test.csv'),
    'output_dir': os.path.join(BASE_DIR, 'finbert_finetuned'),
    
    'max_length': 128,
    'batch_size': 16,
    'num_epochs': 4,
    'learning_rate': 2e-5,
    'warmup_ratio': 0.1,
    'weight_decay': 0.01,
    
    'label2id': {'positive': 0, 'negative': 1, 'neutral': 2},
    'id2label': {0: 'positive', 1: 'negative', 2: 'neutral'},
}


def run_training():
    # ── Device Setup ──
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print("=" * 60)
    print(f"FINBERT FINE-TUNING PIPELINE")
    print(f"Device: {device}")
    if device.type == 'cuda':
        print(f"GPU: {torch.cuda.get_device_name(0)}")
        print(f"GPU Memory: {torch.cuda.get_device_properties(0).total_memory / 1e9:.2f} GB")
    print("=" * 60)

    # ── Model & Tokenizer ──
    model_source = CONFIG['model_path'] if os.path.exists(CONFIG['model_path']) else 'yiyanghkust/finbert-tone'
    print(f"\nLoading model & tokenizer from '{model_source}'...")
    
    tokenizer = BertTokenizer.from_pretrained(model_source)
    model = BertForSequenceClassification.from_pretrained(
        model_source,
        num_labels=3,
        id2label=CONFIG['id2label'],
        label2id=CONFIG['label2id'],
        ignore_mismatched_sizes=True
    )
    model.to(device)

    # ── Datasets & Loaders ──
    print("\nInitializing datasets...")
    train_dataset = FinBERTDataset(CONFIG['train_csv'], tokenizer, CONFIG['max_length'])
    val_dataset = FinBERTDataset(CONFIG['val_csv'], tokenizer, CONFIG['max_length'])
    test_dataset = FinBERTDataset(CONFIG['test_csv'], tokenizer, CONFIG['max_length'])

    print(f"  Train samples: {len(train_dataset)}")
    print(f"  Val samples:   {len(val_dataset)}")
    print(f"  Test samples:  {len(test_dataset)}")

    train_loader = DataLoader(train_dataset, batch_size=CONFIG['batch_size'], shuffle=True, num_workers=0)
    val_loader = DataLoader(val_dataset, batch_size=CONFIG['batch_size'], shuffle=False, num_workers=0)
    test_loader = DataLoader(test_dataset, batch_size=CONFIG['batch_size'], shuffle=False, num_workers=0)

    # ── Optimizer & Scheduler ──
    optimizer = AdamW([
        {'params': model.bert.parameters(), 'lr': CONFIG['learning_rate']},
        {'params': model.classifier.parameters(), 'lr': CONFIG['learning_rate'] * 5}
    ], weight_decay=CONFIG['weight_decay'])

    total_steps = len(train_loader) * CONFIG['num_epochs']
    warmup_steps = int(total_steps * CONFIG['warmup_ratio'])

    scheduler = get_linear_schedule_with_warmup(
        optimizer,
        num_warmup_steps=warmup_steps,
        num_training_steps=total_steps
    )

    print(f"Total training steps: {total_steps} | Warmup steps: {warmup_steps}")

    # ── Helper Functions ──
    def train_epoch(model, loader):
        model.train()
        total_loss = 0.0
        all_preds, all_labels = [], []
        
        for batch_idx, batch in enumerate(loader):
            input_ids = batch['input_ids'].to(device)
            attention_mask = batch['attention_mask'].to(device)
            token_type_ids = batch['token_type_ids'].to(device)
            labels = batch['labels'].to(device)
            
            optimizer.zero_grad()
            outputs = model(
                input_ids=input_ids,
                attention_mask=attention_mask,
                token_type_ids=token_type_ids,
                labels=labels
            )
            
            loss = outputs.loss
            logits = outputs.logits
            
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
            optimizer.step()
            scheduler.step()
            
            total_loss += loss.item()
            preds = torch.argmax(logits, dim=1).cpu().numpy()
            all_preds.extend(preds)
            all_labels.extend(labels.cpu().numpy())
            
            if (batch_idx + 1) % 100 == 0:
                print(f"    Batch {batch_idx+1}/{len(loader)} | Loss: {loss.item():.4f}")
                
        avg_loss = total_loss / len(loader)
        acc = accuracy_score(all_labels, all_preds)
        return avg_loss, acc

    def evaluate(model, loader):
        model.eval()
        total_loss = 0.0
        all_preds, all_labels, all_probs = [], [], []
        
        with torch.no_grad():
            for batch in loader:
                input_ids = batch['input_ids'].to(device)
                attention_mask = batch['attention_mask'].to(device)
                token_type_ids = batch['token_type_ids'].to(device)
                labels = batch['labels'].to(device)
                
                outputs = model(
                    input_ids=input_ids,
                    attention_mask=attention_mask,
                    token_type_ids=token_type_ids,
                    labels=labels
                )
                
                loss = outputs.loss
                logits = outputs.logits
                probs = F.softmax(logits, dim=1)
                
                total_loss += loss.item()
                preds = torch.argmax(logits, dim=1).cpu().numpy()
                all_preds.extend(preds)
                all_labels.extend(labels.cpu().numpy())
                all_probs.extend(probs.cpu().numpy())
                
        avg_loss = total_loss / len(loader)
        acc = accuracy_score(all_labels, all_preds)
        return avg_loss, acc, all_labels, all_preds, all_probs

    # ── Training Loop ──
    os.makedirs(CONFIG['output_dir'], exist_ok=True)
    history = {'train_loss': [], 'train_acc': [], 'val_loss': [], 'val_acc': []}
    best_val_acc = 0.0
    best_epoch = 0

    print("\nStarting Training Loop...")
    for epoch in range(1, CONFIG['num_epochs'] + 1):
        start_time = time.time()
        print(f"\n--- Epoch {epoch}/{CONFIG['num_epochs']} ---")
        
        train_loss, train_acc = train_epoch(model, train_loader)
        val_loss, val_acc, _, _, _ = evaluate(model, val_loader)
        elapsed = time.time() - start_time
        
        print(f"  Epoch {epoch} Summary ({elapsed:.1f}s):")
        print(f"    Train Loss: {train_loss:.4f} | Train Acc: {train_acc:.4f}")
        print(f"    Val Loss:   {val_loss:.4f} | Val Acc:   {val_acc:.4f}")
        
        history['train_loss'].append(train_loss)
        history['train_acc'].append(train_acc)
        history['val_loss'].append(val_loss)
        history['val_acc'].append(val_acc)
        
        if val_acc > best_val_acc:
            best_val_acc = val_acc
            best_epoch = epoch
            best_save_path = os.path.join(CONFIG['output_dir'], 'best_model')
            model.save_pretrained(best_save_path)
            tokenizer.save_pretrained(best_save_path)
            print(f"  [✓] Best model checkpoint saved to '{best_save_path}' (Val Acc: {val_acc:.4f})")

    # ── Final Test Evaluation ──
    print("\n" + "=" * 60)
    print("FINAL TEST EVALUATION")
    print("=" * 60)
    best_model_path = os.path.join(CONFIG['output_dir'], 'best_model')
    best_model = BertForSequenceClassification.from_pretrained(best_model_path).to(device)
    
    test_loss, test_acc, test_labels, test_preds, test_probs = evaluate(best_model, test_loader)
    
    print(f"Test Loss: {test_loss:.4f}")
    print(f"Test Accuracy: {test_acc:.4f}")
    
    report = classification_report(test_labels, test_preds, target_names=['positive', 'negative', 'neutral'], output_dict=True)
    print("\nClassification Report:")
    print(classification_report(test_labels, test_preds, target_names=['positive', 'negative', 'neutral']))

    # ── Save Plots & Results JSON ──
    try:
        import matplotlib.pyplot as plt
        import seaborn as sns
        
        # Plot Loss & Acc curves
        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 4))
        epochs_range = range(1, CONFIG['num_epochs'] + 1)
        
        ax1.plot(epochs_range, history['train_loss'], 'b-o', label='Train Loss')
        ax1.plot(epochs_range, history['val_loss'], 'r-o', label='Val Loss')
        ax1.set_title('Loss per Epoch')
        ax1.set_xlabel('Epoch'); ax1.set_ylabel('Loss')
        ax1.legend(); ax1.grid(True)

        ax2.plot(epochs_range, history['train_acc'], 'b-o', label='Train Acc')
        ax2.plot(epochs_range, history['val_acc'], 'r-o', label='Val Acc')
        ax2.set_title('Accuracy per Epoch')
        ax2.set_xlabel('Epoch'); ax2.set_ylabel('Accuracy')
        ax2.legend(); ax2.grid(True)

        plt.tight_layout()
        plt.savefig(os.path.join(CONFIG['output_dir'], 'training_curves.png'), dpi=150)
        plt.close()

        # Plot Confusion Matrix
        cm = confusion_matrix(test_labels, test_preds)
        plt.figure(figsize=(6, 5))
        sns.heatmap(cm, annot=True, fmt='d', cmap='Blues',
                    xticklabels=['positive', 'negative', 'neutral'],
                    yticklabels=['positive', 'negative', 'neutral'])
        plt.title('Confusion Matrix — Test Set')
        plt.ylabel('True Label')
        plt.xlabel('Predicted Label')
        plt.tight_layout()
        plt.savefig(os.path.join(CONFIG['output_dir'], 'confusion_matrix.png'), dpi=150)
        plt.close()
        print("Saved training curves & confusion matrix plots.")
    except Exception as e:
        print(f"Skipped plotting: {e}")

    results = {
        'best_epoch': best_epoch,
        'best_val_acc': float(best_val_acc),
        'test_accuracy': float(test_acc),
        'test_loss': float(test_loss),
        'classification_report': report
    }
    with open(os.path.join(CONFIG['output_dir'], 'results.json'), 'w') as f:
        json.dump(results, f, indent=2)

    print(f"\nAll outputs saved to '{CONFIG['output_dir']}'")
    print("FinBERT fine-tuning pipeline completed successfully!")


if __name__ == "__main__":
    run_training()
