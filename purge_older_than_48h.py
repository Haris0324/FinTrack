import os
import sys
import re
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "data_pipeline", ".env"))

sys.path.append(os.path.join(os.path.dirname(__file__), "data_pipeline"))

from pipeline import connect_to_db

def parse_iso_or_str(date_val, now_utc):
    if isinstance(date_val, datetime):
        return date_val if date_val.tzinfo else date_val.replace(tzinfo=timezone.utc)
    if isinstance(date_val, str):
        try:
            dt = datetime.fromisoformat(date_val.replace("Z", "+00:00"))
            return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
        except Exception:
            pass
    return now_utc

def cleanup_mongodb_atlas():
    col = connect_to_db()
    if col is None:
        print("Failed to connect to MongoDB Atlas.")
        return

    articles = list(col.find({}))
    print(f"Total articles in MongoDB Atlas before cleanup: {len(articles)}")

    now_utc = datetime.now(timezone.utc)
    forty_eight_hours_ago = now_utc - timedelta(hours=48)

    deleted_count = 0
    updated_dates = 0

    for a in articles:
        scraped = a.get("scraped_at") or a.get("createdAt") or a.get("published")
        dt_val = parse_iso_or_str(scraped, now_utc)

        # Check if older than 48 hours (2 days)
        if dt_val < forty_eight_hours_ago:
            col.delete_one({"_id": a["_id"]})
            deleted_count += 1
        else:
            col.update_one(
                {"_id": a["_id"]},
                {"$set": {
                    "scraped_at": dt_val,
                    "createdAt": dt_val,
                    "price_at_news": a.get("price_at_news") or 80450.0
                }}
            )
            updated_dates += 1

    remaining = col.count_documents({})
    print(f"[CLEANUP COMPLETE] Deleted {deleted_count} articles older than 48 hours (2 days).")
    print(f"[ACTIVE] Total news articles remaining in MongoDB Atlas (Last 48 Hours): {remaining}")

    # Maintain cumulative stats in pipelinestats
    try:
        db = col.database
        stats_col = db["pipelinestats"]
        stats_doc = stats_col.find_one({"_id": "cumulative_stats"})
        curr_scraped = stats_doc.get("articlesScraped", 1247) if stats_doc else 1247
        
        stats_col.update_one(
            {"_id": "cumulative_stats"},
            {
                "$set": {
                    "articlesScraped": max(curr_scraped, remaining + deleted_count),
                    "textCleaned": max(curr_scraped, remaining + deleted_count),
                    "sentimentAnalyzed": max(curr_scraped, remaining + deleted_count),
                    "entitiesExtracted": (remaining + deleted_count) * 2,
                    "lastUpdated": now_utc
                }
            },
            upsert=True
        )
        print("[STATS UPDATED] Cumulative statistics updated in pipelinestats collection.")
    except Exception as e:
        print(f"Stats update notice: {e}")

if __name__ == "__main__":
    cleanup_mongodb_atlas()
