import re
import datetime
import logging
import os

# Configure analysis logger for FE-5
LOG_DIR = os.path.dirname(__file__)
log_filepath = os.path.join(LOG_DIR, "nlp_analysis.log")
logging.basicConfig(
    filename=log_filepath,
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)

# ─────────────────────────────────────────────────────────────
# TEXT CLEANING UTILITY
# ─────────────────────────────────────────────────────────────
def clean_text(text: str) -> str:
    if not isinstance(text, str):
        return ""
    text = re.sub(r'http\S+|www\S+', '', text)
    text = re.sub(r'@\w+', '', text)
    text = re.sub(r'#(\w+)', r'\1', text)
    text = re.sub(r'[^\w\s$%.,\-]', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text


# ─────────────────────────────────────────────────────────────
# FE-3: RELEVANCE CLASSIFIER
# Categories: Bitcoin-Specific, General Cryptocurrency, Global Financial Markets, Irrelevant Content
# ─────────────────────────────────────────────────────────────
BTC_KEYWORDS = [
    r'\bbtc\b', r'\bbitcoin\b', r'\bsatoshi\b', r'\bhalving\b', 
    r'\blightning network\b', r'\bordinals\b', r'\btaproot\b', r'\bbrc-20\b'
]

CRYPTO_KEYWORDS = [
    r'\bethereum\b', r'\beth\b', r'\bsolana\b', r'\baltcoin', r'\bdefi\b',
    r'\bnft', r'\bcrypto\b', r'\bcryptocurrency\b', r'\bblockchain\b', r'\bweb3\b',
    r'\bbinance\b', r'\bcoinbase\b', r'\btether\b', r'\busdt\b', r'\busdc\b',
    r'\bmemecoin\b', r'\bdoge\b', r'\bshib\b', r'\bmining\b', r'\bstaking\b'
]

FINANCIAL_KEYWORDS = [
    r'\bs&p\b', r'\bnasdaq\b', r'\bfederal reserve\b', r'\bfed\b', r'\binflation\b',
    r'\binterest rate\b', r'\bsec\b', r'\bbond\b', r'\btreasury\b', r'\bwall street\b',
    r'\bdollar\b', r'\beconomy\b', r'\bbank\b', r'\bcentral bank\b', r'\bgdp\b',
    r'\bcpi\b', r'\bfomc\b', r'\bstock market\b', r'\bequity\b'
]

def classify_relevance(text: str) -> str:
    text_lower = text.lower()

    # Check Bitcoin-specific first
    for pattern in BTC_KEYWORDS:
        if re.search(pattern, text_lower):
            return "Bitcoin-Specific"

    # Check General Cryptocurrency
    for pattern in CRYPTO_KEYWORDS:
        if re.search(pattern, text_lower):
            return "General Cryptocurrency"

    # Check Global Financial Markets
    for pattern in FINANCIAL_KEYWORDS:
        if re.search(pattern, text_lower):
            return "Global Financial Markets"

    return "Irrelevant Content"


# ─────────────────────────────────────────────────────────────
# FE-4: URGENCY & IMPACT DETECTOR
# Detects breaking/critical events via rule indicators and ML score
# ─────────────────────────────────────────────────────────────
BREAKING_PATTERNS = [
    r'\bcrash\b', r'\bplunge\b', r'\bsoar\b', r'\bskyrocket\b', r'\ball-time high\b',
    r'\bath\b', r'\bhack\b', r'\bexploit\b', r'\bsec approval\b', r'\betf approval\b',
    r'\bbankrupt\b', r'\bliquidation\b', r'\bban\b', r'\brate cut\b', r'\brate hike\b',
    r'\blawsuit\b', r'\bcrackdown\b', r'\bcollapse\b', r'\bemergency\b', r'\bscam\b',
    r'\brugpull\b', r'\bblackrock\b', r'\bsec sues\b'
]

def detect_urgency_and_impact(text: str, sentiment_score: float, sentiment_label: str) -> tuple[bool, str]:
    text_lower = text.lower()
    
    # Check for breaking event keywords
    has_breaking_keyword = any(re.search(pattern, text_lower) for pattern in BREAKING_PATTERNS)
    
    # High confidence threshold
    is_high_confidence = sentiment_score >= 0.85
    
    # Urgency flag set if critical keywords or very strong non-neutral sentiment
    urgency_flag = has_breaking_keyword or (is_high_confidence and sentiment_label.upper() != "NEUTRAL")
    impact_level = "HIGH IMPACT" if urgency_flag else "LOW IMPACT"
    
    return urgency_flag, impact_level


# ─────────────────────────────────────────────────────────────
# FE-5: KEY ENTITY EXTRACTION
# ─────────────────────────────────────────────────────────────
ENTITY_PATTERNS = {
    'Bitcoin': [r'\bbtc\b', r'\bbitcoin\b'],
    'Ethereum': [r'\beth\b', r'\bethereum\b'],
    'Solana': [r'\bsol\b', r'\bsolana\b'],
    'SEC': [r'\bsec\b', r'\bsecurities and exchange commission\b'],
    'Federal Reserve': [r'\bfed\b', r'\bfederal reserve\b', r'\bfomc\b'],
    'Binance': [r'\bbinance\b', r'\bcz\b'],
    'Coinbase': [r'\bcoinbase\b'],
    'BlackRock': [r'\bblackrock\b'],
    'MicroStrategy': [r'\bmicrostrategy\b', r'\bsaylor\b'],
    'Elon Musk': [r'\belon\b', r'\bmusk\b']
}

def extract_key_entities(text: str) -> list[str]:
    text_lower = text.lower()
    found_entities = []
    
    for entity_name, patterns in ENTITY_PATTERNS.items():
        if any(re.search(p, text_lower) for p in patterns):
            found_entities.append(entity_name)
            
    return found_entities


# ─────────────────────────────────────────────────────────────
# FE-5: STRUCTURED ANALYTICAL OUTPUT BUILDER & MONITORING LOG
# ─────────────────────────────────────────────────────────────
def build_structured_analysis(text: str, sentiment_label: str, sentiment_score: float, probabilities: dict) -> dict:
    relevance = classify_relevance(text)
    urgency, impact = detect_urgency_and_impact(text, sentiment_score, sentiment_label)
    entities = extract_key_entities(text)
    timestamp = datetime.datetime.now(datetime.timezone.utc).isoformat()

    output = {
        "text": text,
        "sentiment": sentiment_label.upper(),
        "score": round(float(sentiment_score), 4),
        "probabilities": {k: round(float(v), 4) for k, v in probabilities.items()},
        "relevance": relevance,
        "urgency": urgency,
        "impact": impact,
        "entities": entities,
        "analyzed_at": timestamp
    }

    # Record monitoring log (FE-5)
    logging.info(f"Analyzed: Sentiment={output['sentiment']} | Score={output['score']} | Relevance={output['relevance']} | Impact={output['impact']}")

    return output
