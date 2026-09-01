from transformers import BertTokenizer, BertForSequenceClassification
import torch
import torch.nn.functional as F
import os

MODEL_NAME = "yiyanghkust/finbert-tone"
SAVE_DIR = os.path.join(os.path.dirname(__file__), "finbert_base")

def download_and_verify():
    print(f"Downloading base FinBERT model '{MODEL_NAME}' from HuggingFace...")
    tokenizer = BertTokenizer.from_pretrained(MODEL_NAME)
    
    model = BertForSequenceClassification.from_pretrained(
        MODEL_NAME,
        num_labels=3,
        ignore_mismatched_sizes=True
    )

    os.makedirs(SAVE_DIR, exist_ok=True)
    tokenizer.save_pretrained(SAVE_DIR)
    model.save_pretrained(SAVE_DIR)

    print(f"Saved base model & tokenizer to '{SAVE_DIR}'")

    # Sanity verification
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    model.to(device)
    model.eval()

    sample_text = "Bitcoin hits new record high as institutional adoption surges"
    inputs = tokenizer(sample_text, return_tensors='pt', truncation=True, max_length=128).to(device)

    with torch.no_grad():
        outputs = model(**inputs)
        probs = F.softmax(outputs.logits, dim=1)[0]

    labels = ['positive', 'negative', 'neutral']
    print("\nSanity Check Prediction:")
    print(f"  Input text: \"{sample_text}\"")
    for label, prob in zip(labels, probs):
        print(f"  {label}: {prob.item():.4f}")
    
    pred_idx = probs.argmax().item()
    print(f"  Predicted Label: {labels[pred_idx]}")

if __name__ == "__main__":
    download_and_verify()
