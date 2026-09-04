import feedparser
import requests
from bs4 import BeautifulSoup
import time
from datetime import datetime, timezone, timedelta
import re
import nltk
from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize

# Download NLTK data on first run if missing
for resource in ['tokenizers/punkt', 'tokenizers/punkt_tab', 'corpora/stopwords']:
    try:
        nltk.data.find(resource)
    except LookupError:
        res_name = resource.split('/')[-1]
        try:
            nltk.download(res_name, quiet=True)
        except Exception:
            pass

# Example RSS feeds for Bitcoin/Crypto news
RSS_FEEDS = [
    "https://cointelegraph.com/rss",
    "https://www.coindesk.com/arc/outboundfeeds/rss/",
    "https://cryptopanic.com/news/rss/",
    "https://news.google.com/rss/search?q=bitcoin+reuters",
    "https://news.google.com/rss/search?q=bitcoin+bloomberg"
]

def parse_published_date(published_str: str, now_utc: datetime) -> datetime:
    """Parses RSS published date string into UTC datetime object."""
    if not published_str:
        return now_utc
    try:
        if hasattr(published_str, 'timetuple'):
            dt = datetime.fromtimestamp(time.mktime(published_str.timetuple()), tz=timezone.utc)
            return dt
        # Use datetime parsing or email.utils format
        import email.utils
        parsed_tuple = email.utils.parsedate_tz(str(published_str))
        if parsed_tuple:
            timestamp = email.utils.mktime_tz(parsed_tuple)
            return datetime.fromtimestamp(timestamp, tz=timezone.utc)
    except Exception:
        pass
    return now_utc

def fetch_rss_news():
    """Fetches news from predefined RSS feeds and filters out items older than 48 hours."""
    articles = []
    now_utc = datetime.now(timezone.utc)
    forty_eight_hours_ago = now_utc - timedelta(hours=48)

    for feed_url in RSS_FEEDS:
        try:
            print(f"Fetching from {feed_url}...")
            feed = feedparser.parse(feed_url)
            for entry in feed.entries[:10]:
                published_raw = entry.get("published_parsed") or entry.get("published") or entry.get("updated")
                published_at = parse_published_date(published_raw, now_utc)

                # Strict 48-Hour Filter at Scraper Level
                if published_at < forty_eight_hours_ago:
                    continue

                articles.append({
                    "title": entry.get("title", ""),
                    "link": entry.get("link", ""),
                    "published": entry.get("published", ""),
                    "published_at": published_at,
                    "summary": entry.get("summary", ""),
                    "source": feed.feed.get("title", feed_url),
                    "scraped_at": now_utc
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
    """Module 2: Advanced text cleaning using NLTK with robust fallback"""
    if not text:
        return ""
        
    text = text.lower()
    text = re.sub(r'[^a-z\s]', '', text)
    
    try:
        stop_words = set(stopwords.words('english'))
        tokens = word_tokenize(text)
        cleaned_tokens = [word for word in tokens if word not in stop_words]
        return " ".join(cleaned_tokens)
    except Exception:
        tokens = text.split()
        return " ".join(tokens)

def run_scraper():
    print("Starting news scraper with strict 48-hour publication filter...")
    raw_articles = fetch_rss_news()
    
    cleaned_articles = []
    for article in raw_articles:
        base_clean = clean_html(article["summary"])
        article["content_cleaned"] = clean_text_advanced(base_clean)
        cleaned_articles.append(article)
        
    print(f"Scraped {len(cleaned_articles)} active 48-hour articles.")
    return cleaned_articles

if __name__ == "__main__":
    run_scraper()
