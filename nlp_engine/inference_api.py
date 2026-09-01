from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from transformers import BertTokenizer, BertForSequenceClassification
import torch
import torch.nn.functional as F
import re
import os
from typing import List

from nlp_processor import build_structured_analysis, clean_text, log_filepath

app = FastAPI(
    title="FinTrack FinBERT Sentiment & NLP Analysis API",
    description="Module 3: NLP and Sentiment Analysis Engine for FinTrack",
    version="1.0.0"
)

# ─────────────────────────────────────────────────────────────
# LOAD MODEL & TOKENIZER
# ─────────────────────────────────────────────────────────────
BASE_DIR = os.path.dirname(__file__)
FINE_TUNED_MODEL_DIR = os.path.join(BASE_DIR, "finbert_finetuned", "best_model")
BASE_MODEL_DIR = os.path.join(BASE_DIR, "finbert_base")

ID2LABEL = {0: 'positive', 1: 'negative', 2: 'neutral'}

device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

if os.path.exists(FINE_TUNED_MODEL_DIR):
    model_path = FINE_TUNED_MODEL_DIR
    print(f"Loading Fine-Tuned FinBERT model from '{model_path}'...")
elif os.path.exists(BASE_MODEL_DIR):
    model_path = BASE_MODEL_DIR
    print(f"Loading Base FinBERT model from '{model_path}'...")
else:
    model_path = "yiyanghkust/finbert-tone"
    print(f"Downloading FinBERT model from HuggingFace '{model_path}'...")

tokenizer = BertTokenizer.from_pretrained(model_path)
model = BertForSequenceClassification.from_pretrained(model_path)
model.to(device)
model.eval()

print(f"FinBERT NLP Inference Engine initialized on device: {device}")


# ─────────────────────────────────────────────────────────────
# REQUEST & RESPONSE SCHEMAS
# ─────────────────────────────────────────────────────────────
class PredictRequest(BaseModel):
    text: str

class Probabilities(BaseModel):
    positive: float
    negative: float
    neutral: float

class PredictResponse(BaseModel):
    text: str
    sentiment: str
    score: float
    probabilities: Probabilities
    relevance: str
    urgency: bool
    impact: str
    entities: List[str]
    analyzed_at: str

class BatchPredictRequest(BaseModel):
    texts: List[str]


# ─────────────────────────────────────────────────────────────
# FE-1 & FE-5: SINGLE INFERENCE ENDPOINT
# ─────────────────────────────────────────────────────────────
@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest):
    if not req.text or len(req.text.strip()) < 5:
        raise HTTPException(status_code=400, detail="Input text must be at least 5 characters long.")
    
    cleaned = clean_text(req.text)
    
    inputs = tokenizer(
        cleaned,
        return_tensors='pt',
        truncation=True,
        padding='max_length',
        max_length=128
    )
    inputs = {k: v.to(device) for k, v in inputs.items()}
    
    with torch.no_grad():
        outputs = model(**inputs)
        
    probs = F.softmax(outputs.logits, dim=1)[0]
    pred_idx = probs.argmax().item()
    pred_label = ID2LABEL[pred_idx]
    pred_score = probs[pred_idx].item()
    
    probs_dict = {
        'positive': probs[0].item(),
        'negative': probs[1].item(),
        'neutral': probs[2].item(),
    }
    
    structured_result = build_structured_analysis(req.text, pred_label, pred_score, probs_dict)
    return structured_result


# ─────────────────────────────────────────────────────────────
# FE-2: BATCH INFERENCE ENDPOINT FOR MINIMAL LATENCY
# ─────────────────────────────────────────────────────────────
@app.post("/predict/batch", response_model=List[PredictResponse])
def predict_batch(req: BatchPredictRequest):
    if not req.texts:
        return []

    cleaned_texts = [clean_text(t) for t in req.texts]

    # Batch tokenization
    inputs = tokenizer(
        cleaned_texts,
        return_tensors='pt',
        truncation=True,
        padding=True,
        max_length=128
    )
    inputs = {k: v.to(device) for k, v in inputs.items()}

    with torch.no_grad():
        outputs = model(**inputs)

    probs_batch = F.softmax(outputs.logits, dim=1)

    results = []
    for i, original_text in enumerate(req.texts):
        probs = probs_batch[i]
        pred_idx = probs.argmax().item()
        pred_label = ID2LABEL[pred_idx]
        pred_score = probs[pred_idx].item()

        probs_dict = {
            'positive': probs[0].item(),
            'negative': probs[1].item(),
            'neutral': probs[2].item(),
        }

        structured_result = build_structured_analysis(original_text, pred_label, pred_score, probs_dict)
        results.append(structured_result)

    return results


# ─────────────────────────────────────────────────────────────
# HEALTH CHECK & SYSTEM MONITORING (FE-5)
# ─────────────────────────────────────────────────────────────
@app.get("/health")
def health_check():
    return {
        "status": "online",
        "engine": "FinBERT Module 3 Engine",
        "loaded_model": model_path,
        "device": str(device),
        "log_filepath": log_filepath
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
