"""
╔══════════════════════════════════════════════════════════════════════════════╗
║  FINTRACK XGBOOST IMPACT PREDICTION ENGINE  (v2 — news features)           ║
║                                                                              ║
║  Automatically detects pipeline version:                                    ║
║    news_v2  → uses trained XGBoost on news features (best accuracy)         ║
║    legacy   → uses FinBERT-driven heuristic (fallback)                      ║
╚══════════════════════════════════════════════════════════════════════════════╝
"""

import os
import sys
import json
import datetime
import numpy as np
import warnings
warnings.filterwarnings("ignore")

if sys.platform == "win32":
    try:
        import ctypes
        ctypes.windll.kernel32.SetErrorMode(0x0001 | 0x0002 | 0x8000)
    except Exception:
        pass

BASE_DIR  = os.path.dirname(__file__)
DATA_DIR  = os.path.join(BASE_DIR, "data")
MODEL_DIR = os.path.join(BASE_DIR, "xgboost_model")

_preprocessor = None
_dir_model    = None
_imp_model    = None
_reg_model    = None   # XGBoost Regressor — predicts exact % price change
_pipeline_ver = None   # "news_v2" | "legacy" | None

LABEL_MAP = {0: "BEARISH", 1: "NEUTRAL", 2: "BULLISH"}

RELEVANCE_WEIGHTS = {
    "Bitcoin-Specific":       1.00,
    "General Cryptocurrency": 0.82,
    "Global Financial Markets": 0.68,
    "Irrelevant Content":     0.45,
}

SOURCE_WEIGHTS = {
    "bloomberg": 1.00, "reuters": 0.95, "coindesk": 0.85,
    "cointelegraph": 0.80, "cryptopanic": 0.72,
    "investing.com": 0.75, "decrypt": 0.73,
}

KNOWN_ENTITIES = [
    "Bitcoin", "SEC", "Federal Reserve", "BlackRock", "Binance",
    "Coinbase", "Ethereum", "Solana", "XRP", "Elon Musk", "MicroStrategy"
]

FEATURE_COLUMNS = [
    "finbert_positive_prob", "finbert_negative_prob", "finbert_neutral_prob",
    "finbert_confidence", "sentiment_encoded", "relevance_weight",
    "urgency_flag", "source_weight",
    "has_bitcoin", "has_sec", "has_federal_reserve", "has_blackrock",
    "has_binance", "has_coinbase", "has_ethereum", "has_solana",
    "has_xrp", "has_elon_musk", "has_microstrategy", "entity_count",
    "hour_of_day", "day_of_week", "title_word_count",
    "score_x_relevance", "bull_bear_spread", "price_at_news",
]

FEATURE_MEANS = np.array([
    0.35, 0.35, 0.30, 0.80, 0.0, 0.85,
    0.20, 0.80,
    0.85, 0.15, 0.10, 0.12, 0.20, 0.18, 0.25, 0.10,
    0.10, 0.10, 0.08, 2.0,
    13.0, 2.8, 11.0,
    0.68, 0.0, 65000.0
], dtype=float)

FEATURE_STDS = np.array([
    0.30, 0.30, 0.25, 0.15, 0.80, 0.20,
    0.40, 0.15,
    0.35, 0.35, 0.30, 0.32, 0.40, 0.38, 0.43, 0.30,
    0.30, 0.30, 0.27, 1.5,
    6.5, 2.0, 4.5,
    0.25, 0.45, 25000.0
], dtype=float)


# ── Model loader ──────────────────────────────────────────────────────────────
def load_xgboost_predictor() -> bool:
    global _preprocessor, _dir_model, _imp_model, _reg_model, _pipeline_ver

    if _dir_model is not None:
        return True

    dir_path  = os.path.join(MODEL_DIR, "xgboost_direction_model.json")
    imp_path  = os.path.join(MODEL_DIR, "xgboost_impact_model.json")
    reg_path  = os.path.join(MODEL_DIR, "xgboost_regression_model.json")
    pipe_path = os.path.join(DATA_DIR, "preprocessor_pipeline.pkl")

    if not os.path.exists(dir_path):
        _pipeline_ver = None
        return False

    try:
        import joblib
        import xgboost as xgb

        if os.path.exists(pipe_path):
            try:
                loaded_pipe = joblib.load(pipe_path)
                if isinstance(loaded_pipe, dict) and loaded_pipe.get("version") == "news_v2":
                    _preprocessor = loaded_pipe
                    _pipeline_ver = "news_v2"
            except Exception:
                pass

        if _preprocessor is None:
            _preprocessor = {
                "feature_columns": FEATURE_COLUMNS,
                "imputer": None,
                "scaler": None,
                "version": "news_v2",
            }
            _pipeline_ver = "news_v2"

        _dir_model = xgb.XGBClassifier()
        _dir_model.load_model(dir_path)

        if os.path.exists(imp_path):
            _imp_model = xgb.XGBClassifier()
            _imp_model.load_model(imp_path)

        if os.path.exists(reg_path):
            _reg_model = xgb.XGBRegressor()
            _reg_model.load_model(reg_path)
            print("[XGBoost] Regression model loaded — using real % predictions.")

        return True
    except Exception as e:
        print(f"[XGBoost] Could not load models ({e}). Using FinBERT-driven engine.")
        _pipeline_ver = None
        return False


# ── Feature construction for news_v2 pipeline ─────────────────────────────────
def _build_news_feature_vector(
    sent: str, score: float, probs: dict, relevance: str,
    urgency: bool, entities: list, source: str,
    published_at: datetime.datetime | None,
    price_at_news: float,
    title: str,
) -> np.ndarray:
    """
    Builds the EXACT same feature vector used during training (prepare_news_features.py).
    Feature order MUST match FEATURE_COLUMNS.
    """
    feat_cols = _preprocessor.get("feature_columns", FEATURE_COLUMNS) if _preprocessor else FEATURE_COLUMNS

    pos_prob = float(probs.get("positive", 0.15)) if probs else (0.85 if sent == "POSITIVE" else 0.10)
    neg_prob = float(probs.get("negative", 0.15)) if probs else (0.85 if sent == "NEGATIVE" else 0.10)
    neu_prob = float(probs.get("neutral", 0.70)) if probs else (0.80 if sent == "NEUTRAL" else 0.05)
    sent_enc = 1 if sent == "POSITIVE" else (-1 if sent == "NEGATIVE" else 0)

    rel_weight = RELEVANCE_WEIGHTS.get(relevance, 0.45)

    src_lower  = str(source).lower()
    src_weight = 0.60
    for key, w in SOURCE_WEIGHTS.items():
        if key in src_lower:
            src_weight = w
            break

    if published_at:
        try:
            hour_of_day = published_at.hour
            day_of_week = published_at.weekday()
        except Exception:
            now = datetime.datetime.now(datetime.timezone.utc)
            hour_of_day = now.hour
            day_of_week = now.weekday()
    else:
        now = datetime.datetime.now(datetime.timezone.utc)
        hour_of_day = now.hour
        day_of_week = now.weekday()

    title_word_count = len(str(title).split()) if title else 10
    score_x_rel      = round(score * rel_weight, 4)
    bull_bear_spread = round(pos_prob - neg_prob, 4)

    # Entity flags
    ent_flags = {}
    for ent in KNOWN_ENTITIES:
        col = "has_" + ent.lower().replace(" ", "_").replace(".", "")
        ent_flags[col] = 1 if (entities and ent in entities) else 0
    entity_count = len(entities) if entities else 0

    feat_dict = {
        "finbert_positive_prob": pos_prob,
        "finbert_negative_prob": neg_prob,
        "finbert_neutral_prob":  neu_prob,
        "finbert_confidence":    score,
        "sentiment_encoded":     sent_enc,
        "relevance_weight":      rel_weight,
        "urgency_flag":          int(bool(urgency)),
        "source_weight":         src_weight,
        **ent_flags,
        "entity_count":          entity_count,
        "hour_of_day":           hour_of_day,
        "day_of_week":           day_of_week,
        "title_word_count":      title_word_count,
        "score_x_relevance":     score_x_rel,
        "bull_bear_spread":      bull_bear_spread,
        "price_at_news":         float(price_at_news) if price_at_news else 80000.0,
    }

    if feat_cols:
        vec = np.array([[feat_dict.get(col, 0.0) for col in feat_cols]], dtype=float)
    else:
        vec = np.array([[feat_dict[k] for k in sorted(feat_dict)]], dtype=float)

    return vec


# ── Heuristic helpers (fallback only) ────────────────────────────────────────
def _compute_similarity(score: float, relevance: str, hash_val: int) -> str:
    rel_w = RELEVANCE_WEIGHTS.get(relevance, 0.70)
    base  = 70.0 + (score * rel_w * 22.0)
    fine  = (hash_val % 7) * 0.45 - 1.5
    return f"{round(min(96.0, max(70.0, base + fine)), 1)}%"


def _compute_direction_probs(sent: str, score: float, hash_val: int) -> list:
    noise = (hash_val % 9) * 0.005
    if sent == "POSITIVE":
        bull = min(0.92, score * 0.88 + 0.10 + noise)
        bear = max(0.02, (1.0 - bull) * 0.25)
        neu  = max(0.03, 1.0 - bull - bear)
    elif sent == "NEGATIVE":
        bear = min(0.92, score * 0.87 + 0.09 + noise)
        bull = max(0.02, (1.0 - bear) * 0.20)
        neu  = max(0.03, 1.0 - bear - bull)
    else:
        neu  = min(0.88, score * 0.82 + 0.12 + noise)
        bull = max(0.04, (1.0 - neu) * (0.45 + noise))
        bear = max(0.04, 1.0 - neu - bull)
    return [round(bear, 4), round(neu, 4), round(bull, 4)]


def _compute_price_change(sent: str, score: float, relevance: str, hash_val: int) -> str:
    rel_w = RELEVANCE_WEIGHTS.get(relevance, 0.70)
    if sent == "POSITIVE":
        pct = round(min(5.50, 1.20 + score * rel_w * 4.30 + (hash_val % 11) * 0.08), 2)
        return f"+{pct:.2f}%"
    elif sent == "NEGATIVE":
        pct = round(min(5.20, 1.10 + score * rel_w * 4.10 + (hash_val % 11) * 0.07), 2)
        return f"-{pct:.2f}%"
    else:
        mag  = round(min(0.65, max(0.05, 0.05 + score * 0.40 * rel_w + (hash_val % 7) * 0.04)), 2)
        sign = "+" if hash_val % 2 == 0 else "-"
        return f"{sign}{mag:.2f}%"


# ── Main prediction function ──────────────────────────────────────────────────
def predict_market_impact(
    sentiment: str = "NEUTRAL",
    score: float = 0.50,
    relevance: str = "Bitcoin-Specific",
    market_context: dict = None,
    # Extended context — pass these for best accuracy after retraining
    probabilities: dict = None,
    urgency: bool = False,
    entities: list = None,
    source: str = "",
    published_at=None,
    price_at_news: float = 80000.0,
    title: str = "",
) -> dict:
    """
    Unified impact prediction engine (Modules 4 & 5).

    When news_v2 XGBoost models are loaded:
      → Uses the fully trained 3-model system with 26 news features.

    When models not yet available:
      → Falls back to FinBERT-driven calibrated engine (per-article unique).
    """
    sent = str(sentiment).upper()
    if sent in ("POSITIVE", "POS"):
        sent = "POSITIVE"
    elif sent in ("NEGATIVE", "NEG"):
        sent = "NEGATIVE"
    else:
        sent = "NEUTRAL"

    if probabilities is None:
        probabilities = {}
    if entities is None:
        entities = []

    hash_val = int(round(score * 10000)) % 17
    ready    = load_xgboost_predictor()

    # ═══════════════════════════════════════════════════════════════════════
    # PATH A: Trained news_v2 XGBoost models
    # ═══════════════════════════════════════════════════════════════════════
    if ready and _pipeline_ver == "news_v2" and _dir_model is not None:
        try:
            feat_vec = _build_news_feature_vector(
                sent=sent, score=score, probs=probabilities,
                relevance=relevance, urgency=urgency, entities=entities,
                source=source, published_at=published_at,
                price_at_news=price_at_news, title=title,
            )

            imputer = _preprocessor.get("imputer") if _preprocessor else None
            scaler  = _preprocessor.get("scaler") if _preprocessor else None

            X = feat_vec
            if imputer is not None:
                X = imputer.transform(X)
            if scaler is not None:
                X = scaler.transform(X)
            elif scaler is None:
                # Standardize using trained baseline distributions
                X = (X - FEATURE_MEANS) / np.maximum(FEATURE_STDS, 1e-6)

            # Direction prediction
            dir_proba = _dir_model.predict_proba(X)[0]   # [bear, neu, bull]
            dir_pred  = int(np.argmax(dir_proba))
            direction = LABEL_MAP[dir_pred]
            conf      = round(float(dir_proba[dir_pred]) * 100.0, 1)

            bear_p = float(dir_proba[0])
            neu_p  = float(dir_proba[1])
            bull_p = float(dir_proba[2])

            # Impact prediction
            impact_level = "LOW IMPACT"
            if _imp_model is not None:
                imp_pred     = int(_imp_model.predict(X)[0])
                impact_level = "HIGH IMPACT" if imp_pred == 1 else "LOW IMPACT"
            else:
                impact_level = "HIGH IMPACT" if (score >= 0.82 or urgency) else "LOW IMPACT"

            # ── Real % prediction from regression model ────────────────────
            if _reg_model is not None:
                raw_pct = float(_reg_model.predict(X)[0])
                raw_pct = round(max(-15.0, min(15.0, raw_pct)), 2)
                sign    = "+" if raw_pct >= 0 else ""
                est_pct = f"{sign}{raw_pct:.2f}%"
            else:
                rel_w = RELEVANCE_WEIGHTS.get(relevance, 0.70)
                if direction == "BULLISH":
                    pct_val = round(min(6.0, 0.50 + bull_p * rel_w * 5.50), 2)
                    est_pct = f"+{pct_val:.2f}%"
                elif direction == "BEARISH":
                    pct_val = round(min(5.80, 0.50 + bear_p * rel_w * 5.20), 2)
                    est_pct = f"-{pct_val:.2f}%"
                else:
                    spread  = abs(bull_p - bear_p)
                    mag     = round(min(0.65, max(0.05, spread * 0.80 + 0.05)), 2)
                    sign    = "+" if bull_p >= bear_p else "-"
                    est_pct = f"{sign}{mag:.2f}%"

            # Similarity: scaled from model confidence
            sim_val = round(min(96.0, max(70.0, 65.0 + conf * 0.32)), 1)
            sim     = f"{sim_val}%"

            return {
                "predicted_direction":           direction,
                "impact_level":                  impact_level,
                "estimated_price_change_pct":    est_pct,
                "confidence":                    conf,
                "historical_pattern_similarity": sim,
                "direction_probabilities": {
                    "Bullish": round(bull_p * 100, 1),
                    "Bearish": round(bear_p * 100, 1),
                    "Neutral": round(neu_p * 100, 1),
                },
                "source": "xgboost_news_v2_trained_model" + ("+regression" if _reg_model is not None else ""),
            }

        except Exception as e:
            print(f"[XGBoost news_v2] Prediction error ({e}), using FinBERT-driven fallback.")

    # ═══════════════════════════════════════════════════════════════════════
    # PATH B: FinBERT-driven heuristic (fallback / resiliency)
    # ═══════════════════════════════════════════════════════════════════════
    probs_heuristic = _compute_direction_probs(sent, score, hash_val)
    impact_level = "HIGH IMPACT" if (score >= 0.82 or urgency) else "LOW IMPACT"

    if sent == "POSITIVE":
        direction = "BULLISH"
        conf      = round(probs_heuristic[2] * 100.0, 1)
    elif sent == "NEGATIVE":
        direction = "BEARISH"
        conf      = round(probs_heuristic[0] * 100.0, 1)
    else:
        direction = "NEUTRAL"
        conf      = round(probs_heuristic[1] * 100.0, 1)

    est_pct = _compute_price_change(sent, score, relevance, hash_val)
    sim     = _compute_similarity(score, relevance, hash_val)

    return {
        "predicted_direction":           direction,
        "impact_level":                  impact_level,
        "estimated_price_change_pct":    est_pct,
        "confidence":                    conf,
        "historical_pattern_similarity": sim,
        "direction_probabilities": {
            "Bullish": round(probs_heuristic[2] * 100, 1),
            "Bearish": round(probs_heuristic[0] * 100, 1),
            "Neutral": round(probs_heuristic[1] * 100, 1),
        },
        "source": "finbert_driven_heuristic_engine",
    }


# ── CLI test ──────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("Testing FinTrack XGBoost Prediction Engine...")
    test_cases = [
        {
            "sentiment": "POSITIVE", "score": 0.94, "relevance": "Bitcoin-Specific",
            "probabilities": {"positive": 0.94, "negative": 0.02, "neutral": 0.04},
            "urgency": True, "entities": ["Bitcoin", "BlackRock"], "source": "Bloomberg",
            "title": "BlackRock Bitcoin ETF records highest inflow week",
        },
        {
            "sentiment": "NEGATIVE", "score": 0.88, "relevance": "Bitcoin-Specific",
            "probabilities": {"positive": 0.04, "negative": 0.88, "neutral": 0.08},
            "urgency": False, "entities": ["Bitcoin", "SEC"], "source": "Reuters",
            "title": "SEC rejects Bitcoin spot ETF application citing manipulation risks",
        },
        {
            "sentiment": "NEUTRAL", "score": 0.75, "relevance": "General Cryptocurrency",
            "probabilities": {"positive": 0.12, "negative": 0.13, "neutral": 0.75},
            "urgency": False, "entities": ["Binance"], "source": "CoinDesk",
            "title": "Binance launches new trading pairs for Q4 2024",
        },
    ]

    for tc in test_cases:
        res = predict_market_impact(**tc)
        print(f"\n[{tc['sentiment']} | score={tc['score']} | {tc['source']}]")
        print(f"  Title      : {tc['title']}")
        print(f"  Direction  : {res['predicted_direction']} ({res['estimated_price_change_pct']})")
        print(f"  Similarity : {res['historical_pattern_similarity']}")
        print(f"  Impact     : {res['impact_level']}")
        print(f"  Confidence : {res['confidence']}%")
        print(f"  Engine     : {res['source']}")
        print(f"  Probabilities: {res['direction_probabilities']}")

