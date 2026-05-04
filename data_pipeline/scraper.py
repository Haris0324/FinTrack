import feedparser
import requests
from bs4 import BeautifulSoup
import time
from datetime import datetime
import re
import nltk
from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize

# Download NLTK data on first run if missing
try:
    nltk.data.find('tokenizers/punkt')
    nltk.data.find('corpora/stopwords')
except LookupError:
    nltk.download('punkt')
    nltk.download('stopwords')

# Example RSS feeds for Bitcoin/Crypto news
RSS_FEEDS = [
    "https://cointelegraph.com/rss",
    "https://www.coindesk.com/arc/outboundfeeds/rss/",
    "https://cryptopanic.com/news/rss/",
    "https://news.google.com/rss/search?q=bitcoin+reuters",
    "https://news.google.com/rss/search?q=bitcoin+bloomberg"
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

def clean_text_advanced(text):
    """Module 2: Advanced text cleaning using NLTK"""
    if not text:
        return ""
        
    # 1. Lowercase
    text = text.lower()
    
    # 2. Remove special characters and numbers (keep only letters)
    text = re.sub(r'[^a-z\s]', '', text)
    
    # 3. Tokenization & Stop words removal
    stop_words = set(stopwords.words('english'))
    tokens = word_tokenize(text)
    cleaned_tokens = [word for word in tokens if word not in stop_words]
    
    return " ".join(cleaned_tokens)

def run_scraper():
    print("Starting news scraper...")
    raw_articles = fetch_rss_news()
    
    # Clean the summaries/content
    cleaned_articles = []
    for article in raw_articles:
        # Step 1: Remove HTML tags
        base_clean = clean_html(article["summary"])
        # Step 2: Advanced NLP Text Cleaning (Module 2)
        article["content_cleaned"] = clean_text_advanced(base_clean)
        cleaned_articles.append(article)
        
    print(f"Scraped {len(cleaned_articles)} articles.")
    return cleaned_articles

if __name__ == "__main__":
    run_scraper()
