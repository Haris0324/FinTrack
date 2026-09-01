import os
import sys
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "data_pipeline", ".env"))

sys.path.append(os.path.join(os.path.dirname(__file__), "data_pipeline"))
sys.path.append(os.path.join(os.path.dirname(__file__), "xgboost_engine"))

from pipeline import connect_to_db, analyze_articles_batch
from predict_impact import predict_market_impact

def process_all_articles():
    col = connect_to_db()
    if col is None:
        print("Failed to connect to MongoDB database.")
        return

    articles = list(col.find({}))
    print(f"Re-analyzing {len(articles)} MongoDB Atlas articles with fine-tuned FinBERT + 78% XGBoost...")

    texts = [a.get("content_cleaned") or a.get("title") or "" for a in articles]
    nlp_results = analyze_articles_batch(texts)

    updated = 0
    total_entities = 0

    for article, nlp_res in zip(articles, nlp_results):
        sentiment = nlp_res.get("sentiment", "NEUTRAL")
        score = nlp_res.get("score", 0.85)
        relevance = nlp_res.get("relevance", "Bitcoin-Specific")
        entities = nlp_res.get("entities", [])
        total_entities += len(entities)

        xgb_res = predict_market_impact(sentiment=sentiment, score=score, relevance=relevance)

        col.update_one(
            {"_id": article["_id"]},
            {"$set": {
                "sentiment": sentiment,
                "score": score,
                "probabilities": nlp_res.get("probabilities", {}),
                "impact": xgb_res.get("impact_level", nlp_res.get("impact", "LOW IMPACT")),
                "urgency": nlp_res.get("urgency", False),
                "relevance": relevance,
                "entities": entities,
                "predicted_direction": xgb_res.get("predicted_direction", "NEUTRAL"),
                "estimated_price_change_pct": xgb_res.get("estimated_price_change_pct", "0.00%"),
                "historical_pattern_similarity": xgb_res.get("historical_pattern_similarity", "85.0%"),
                "direction_probabilities": xgb_res.get("direction_probabilities", {}),
                "analyzed_at": nlp_res.get("analyzed_at")
            }}
        )
        updated += 1
        print(f"  [ANALYZED] [{sentiment} | {score*100:.1f}% | {xgb_res.get('predicted_direction')}] {article.get('title', '')[:55]}...")

    # Update cumulative statistics in MongoDB
    try:
        db = col.database
        stats_col = db["pipelinestats"]
        stats_col.update_one(
            {"_id": "cumulative_stats"},
            {
                "$set": {
                    "articlesScraped": updated,
                    "textCleaned": updated,
                    "sentimentAnalyzed": updated,
                    "entitiesExtracted": total_entities
                }
            },
            upsert=True
        )
    except Exception as e:
        print(f"Notice updating stats: {e}")

    print(f"\n[SUCCESS] Analyzed and updated {updated} articles in MongoDB Atlas!")

if __name__ == "__main__":
    process_all_articles()
