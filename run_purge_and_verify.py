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

    now_utc = datetime.now(timezone.utc)
    twenty_four_hours_ago = now_utc - timedelta(hours=24)
    three_hours_ago = now_utc - timedelta(hours=3)
    
    # Delete articles older than 24 hours (1 day), EXCEPT if published within last 3 hours (pending verification)
    res = col.delete_many({
        "$and": [
            {
                "$or": [
                    {"published_at": {"$lt": twenty_four_hours_ago}},
                    {"scraped_at": {"$lt": twenty_four_hours_ago}},
                    {"createdAt": {"$lt": twenty_four_hours_ago}}
                ]
            },
            {"published_at": {"$lt": three_hours_ago}},
            {"scraped_at": {"$lt": three_hours_ago}},
            {"createdAt": {"$lt": three_hours_ago}}
        ]
    })

    remaining = col.count_documents({})
    print(f"[PRUNED] Deleted {res.deleted_count} news articles older than 24 hours with completed 3h verification.")
    print(f"[ACTIVE] Total news articles remaining in MongoDB Atlas (Active 24 Hours / Pending Window): {remaining}")

if __name__ == "__main__":
    purge_old_news()
