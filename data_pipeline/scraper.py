import feedparser
import requests
from bs4 import BeautifulSoup
import time
from datetime import datetime

# Example RSS feeds for Bitcoin/Crypto news
RSS_FEEDS = [
    "https://cointelegraph.com/rss",
    "https://www.coindesk.com/arc/outboundfeeds/rss/",
]

def fetch_rss_news():
    """Fetches news from predefined RSS feeds."""
    articles = []
    for feed_url in RSS_FEEDS:
        try:
            print(f"Fetching from {feed_url}...")
            feed = feedparser.parse(feed_url)
            for entry in feed.entries[:10]: # Get top 10 from each feed
                articles.append({
                    "title": entry.get("title", ""),
                    "link": entry.get("link", ""),
                    "published": entry.get("published", ""),
                    "summary": entry.get("summary", ""),
                    "source": feed.feed.get("title", feed_url),
                    "scraped_at": datetime.utcnow()
                })
        except Exception as e:
            print(f"Error fetching {feed_url}: {e}")
    return articles

def clean_html(html_content):
    """Basic HTML cleaner using BeautifulSoup"""
    if not html_content:
        return ""
    soup = BeautifulSoup(html_content, "html.parser")
    return soup.get_text(separator=" ").strip()

def run_scraper():
    print("Starting news scraper...")
    raw_articles = fetch_rss_news()
    
    # Clean the summaries/content
    cleaned_articles = []
    for article in raw_articles:
        article["content_cleaned"] = clean_html(article["summary"])
        cleaned_articles.append(article)
        
    print(f"Scraped {len(cleaned_articles)} articles.")
    return cleaned_articles

if __name__ == "__main__":
    run_scraper()
