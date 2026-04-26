import os
import time
from pymongo import MongoClient
from dotenv import load_dotenv
from scraper import run_scraper

# Load environment variables
load_dotenv()

MONGO_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017/fintrack")
DB_NAME = "fintrack"
COLLECTION_NAME = "news"

def connect_to_db():
    try:
        client = MongoClient(MONGO_URI)
        db = client[DB_NAME]
        print(f"Connected to MongoDB: {DB_NAME}")
        return db[COLLECTION_NAME]
    except Exception as e:
        print(f"Failed to connect to MongoDB: {e}")
        return None

def process_and_store():
    collection = connect_to_db()
    if collection is None:
        return

    articles = run_scraper()
    
    new_inserts = 0
    for article in articles:
        # Prevent duplicates based on URL link
        existing = collection.find_one({"link": article["link"]})
        if not existing:
            # For phase 1, mock the sentiment and impact until FinBERT/XGBoost are integrated
            article["sentiment"] = "NEUTRAL"
            article["impact"] = "LOW IMPACT"
            article["score"] = 0.0
            article["relevance"] = "Pending Classification"
            
            collection.insert_one(article)
            new_inserts += 1
            
    print(f"Inserted {new_inserts} new articles into the database.")

if __name__ == "__main__":
    # Run the pipeline once
    # In production, this would be scheduled via cron or a while loop with sleep
    print("Starting Data Pipeline...")
    while True:
        process_and_store()
        print("Waiting 15 minutes before next scrape...")
        time.sleep(900) # 15 minutes
