import os
import sys
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "data_pipeline", ".env"))

sys.path.append(os.path.join(os.path.dirname(__file__), "data_pipeline"))

from pipeline import connect_to_db

def purge_old_news():
    col = connect_to_db()
    if col is None:
        print("Failed to connect to MongoDB.")
        return

    twenty_four_hours_ago = datetime.now(timezone.utc) - timedelta(hours=24)
    
    # Delete articles older than 24 hours (1 day)
    res = col.delete_many({
        "$or": [
            {"scraped_at": {"$lt": twenty_four_hours_ago}},
            {"createdAt": {"$lt": twenty_four_hours_ago}}
        ]
    })

    remaining = col.count_documents({})
    print(f"[PRUNED] Deleted {res.deleted_count} news articles older than 24 hours (1 day).")
    print(f"[ACTIVE] Total news articles remaining in MongoDB Atlas (Last 24 Hours): {remaining}")

if __name__ == "__main__":
    purge_old_news()
