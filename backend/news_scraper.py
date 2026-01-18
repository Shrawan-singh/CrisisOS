"""
CrisisOS 2.0 - News Scraper Module

Uses BeautifulSoup4 to:
- Fetch news content from URLs
- Extract images, text, and metadata
- Search for disaster-related keywords
"""

import re
import logging
import hashlib
from datetime import datetime
from typing import List, Dict, Optional, Any
from urllib.parse import urljoin, urlparse
import requests
from bs4 import BeautifulSoup

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Disaster-related keywords for detection
DISASTER_KEYWORDS = [
    # Natural disasters
    "natural disaster", "earthquake", "flood", "flooding", "tsunami",
    "cyclone", "hurricane", "typhoon", "tornado", "storm",
    "landslide", "mudslide", "avalanche", "volcanic eruption", "volcano",
    "wildfire", "forest fire", "bushfire", "drought", "famine",
    "heatwave", "heat wave", "cold wave", "blizzard", "snowstorm",
    
    # Weather events
    "heavy rain", "heavy rainfall", "cloudbursts", "flash flood",
    "thunderstorm", "lightning", "hailstorm", "monsoon",
    
    # India-specific
    "बाढ़", "भूकंप", "चक्रवात", "तूफान", "सूखा",  # Hindi terms
    "IMD warning", "NDRF", "SDRF", "disaster relief",
    "evacuation", "rescue operation", "relief camp",
    
    # Consequences
    "casualties", "death toll", "injured", "missing persons",
    "damage", "destruction", "devastation", "emergency",
    "alert", "warning", "red alert", "orange alert",
    
    # Infrastructure
    "bridge collapse", "building collapse", "dam breach", "dam burst",
    "power outage", "water logging", "road blocked",
]

# User agent for requests
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
}


class NewsScraperResult:
    """Result from scraping a news URL."""
    
    def __init__(self):
        self.url: str = ""
        self.title: str = ""
        self.content: str = ""
        self.summary: str = ""
        self.images: List[str] = []
        self.published_date: Optional[str] = None
        self.author: Optional[str] = None
        self.source_name: str = ""
        self.keywords_found: List[str] = []
        self.disaster_type: Optional[str] = None
        self.location: Optional[str] = None
        self.is_disaster_related: bool = False
        self.confidence_score: int = 0
        self.scraped_at: str = datetime.now().isoformat()
        self.error: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "url": self.url,
            "title": self.title,
            "content": self.content,
            "summary": self.summary,
            "images": self.images,
            "published_date": self.published_date,
            "author": self.author,
            "source_name": self.source_name,
            "keywords_found": self.keywords_found,
            "disaster_type": self.disaster_type,
            "location": self.location,
            "is_disaster_related": self.is_disaster_related,
            "confidence_score": self.confidence_score,
            "scraped_at": self.scraped_at,
            "error": self.error,
        }


class NewsScraper:
    """Scrapes news articles from URLs using BeautifulSoup."""
    
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update(HEADERS)
    
    def scrape_url(self, url: str) -> NewsScraperResult:
        """
        Scrape a news article from URL.
        
        Args:
            url: The news article URL
            
        Returns:
            NewsScraperResult with extracted data
        """
        result = NewsScraperResult()
        result.url = url
        
        try:
            # Parse domain for source name
            parsed = urlparse(url)
            result.source_name = parsed.netloc.replace("www.", "")
            
            # Fetch the page
            response = self.session.get(url, timeout=15)
            response.raise_for_status()
            
            # Parse HTML
            soup = BeautifulSoup(response.content, "html.parser")
            
            # Extract title
            result.title = self._extract_title(soup)
            
            # Extract main content
            result.content = self._extract_content(soup)
            
            # Generate summary (first 500 chars)
            result.summary = self._generate_summary(result.content)
            
            # Extract images
            result.images = self._extract_images(soup, url)
            
            # Extract metadata
            result.published_date = self._extract_date(soup)
            result.author = self._extract_author(soup)
            
            # Analyze for disaster keywords
            full_text = f"{result.title} {result.content}".lower()
            result.keywords_found = self._find_disaster_keywords(full_text)
            result.is_disaster_related = len(result.keywords_found) > 0
            
            # Calculate confidence based on keyword matches
            result.confidence_score = min(100, len(result.keywords_found) * 15 + 10)
            
            # Detect disaster type
            result.disaster_type = self._detect_disaster_type(full_text)
            
            # Try to extract location
            result.location = self._extract_location(soup, full_text)
            
            logger.info(f"Successfully scraped: {url}")
            
        except requests.RequestException as e:
            result.error = f"Failed to fetch URL: {str(e)}"
            logger.error(result.error)
        except Exception as e:
            result.error = f"Error parsing content: {str(e)}"
            logger.error(result.error)
        
        return result
    
    def _extract_title(self, soup: BeautifulSoup) -> str:
        """Extract article title."""
        # Try common title selectors
        selectors = [
            "h1.article-title",
            "h1.entry-title", 
            "h1.post-title",
            "h1.headline",
            "article h1",
            ".article-header h1",
            "meta[property='og:title']",
            "meta[name='twitter:title']",
            "title",
        ]
        
        for selector in selectors:
            if selector.startswith("meta"):
                elem = soup.select_one(selector)
                if elem and elem.get("content"):
                    return elem["content"].strip()
            else:
                elem = soup.select_one(selector)
                if elem and elem.get_text(strip=True):
                    return elem.get_text(strip=True)
        
        return "Unknown Title"
    
    def _extract_content(self, soup: BeautifulSoup) -> str:
        """Extract main article content."""
        # Remove unwanted elements
        for tag in soup.find_all(["script", "style", "nav", "header", "footer", "aside", "iframe", "noscript"]):
            tag.decompose()
        
        # Try common content selectors
        content_selectors = [
            "article .content",
            "article .article-body",
            "article .story-body",
            ".article-content",
            ".post-content",
            ".entry-content",
            ".story-content",
            "#article-body",
            ".article-text",
            "article",
            "main",
        ]
        
        for selector in content_selectors:
            elem = soup.select_one(selector)
            if elem:
                paragraphs = elem.find_all("p")
                if paragraphs:
                    text = " ".join(p.get_text(strip=True) for p in paragraphs if p.get_text(strip=True))
                    if len(text) > 100:
                        return text
        
        # Fallback: get all paragraphs
        paragraphs = soup.find_all("p")
        text = " ".join(p.get_text(strip=True) for p in paragraphs if len(p.get_text(strip=True)) > 50)
        
        return text or "Content could not be extracted"
    
    def _generate_summary(self, content: str, max_length: int = 500) -> str:
        """Generate a summary from content."""
        if len(content) <= max_length:
            return content
        
        # Find a good break point
        summary = content[:max_length]
        last_period = summary.rfind(".")
        if last_period > max_length // 2:
            summary = summary[:last_period + 1]
        else:
            summary = summary.rsplit(" ", 1)[0] + "..."
        
        return summary
    
    def _extract_images(self, soup: BeautifulSoup, base_url: str) -> List[str]:
        """Extract article images."""
        images = []
        
        # Try og:image first
        og_image = soup.select_one("meta[property='og:image']")
        if og_image and og_image.get("content"):
            images.append(og_image["content"])
        
        # Find article images
        img_selectors = [
            "article img",
            ".article-content img",
            ".post-content img",
            "figure img",
            ".featured-image img",
        ]
        
        for selector in img_selectors:
            for img in soup.select(selector)[:5]:  # Limit to 5 images
                src = img.get("src") or img.get("data-src") or img.get("data-lazy-src")
                if src:
                    # Make absolute URL
                    full_url = urljoin(base_url, src)
                    if full_url not in images and self._is_valid_image(full_url):
                        images.append(full_url)
        
        return images[:5]
    
    def _is_valid_image(self, url: str) -> bool:
        """Check if URL is a valid image."""
        invalid_patterns = ["logo", "icon", "avatar", "ad", "banner", "pixel", "tracking"]
        url_lower = url.lower()
        return not any(p in url_lower for p in invalid_patterns)
    
    def _extract_date(self, soup: BeautifulSoup) -> Optional[str]:
        """Extract publication date."""
        # Try meta tags
        date_metas = [
            "meta[property='article:published_time']",
            "meta[name='pubdate']",
            "meta[name='publish-date']",
            "meta[name='date']",
        ]
        
        for selector in date_metas:
            elem = soup.select_one(selector)
            if elem and elem.get("content"):
                return elem["content"]
        
        # Try time element
        time_elem = soup.select_one("time[datetime]")
        if time_elem:
            return time_elem.get("datetime")
        
        return None
    
    def _extract_author(self, soup: BeautifulSoup) -> Optional[str]:
        """Extract article author."""
        author_selectors = [
            "meta[name='author']",
            "meta[property='article:author']",
            ".author-name",
            ".byline",
            "[rel='author']",
        ]
        
        for selector in author_selectors:
            elem = soup.select_one(selector)
            if elem:
                if selector.startswith("meta"):
                    return elem.get("content")
                return elem.get_text(strip=True)
        
        return None
    
    def _find_disaster_keywords(self, text: str) -> List[str]:
        """Find disaster-related keywords in text."""
        found = []
        text_lower = text.lower()
        
        for keyword in DISASTER_KEYWORDS:
            if keyword.lower() in text_lower:
                found.append(keyword)
        
        return list(set(found))  # Remove duplicates
    
    def _detect_disaster_type(self, text: str) -> Optional[str]:
        """Detect the type of disaster from text."""
        disaster_patterns = {
            "Earthquake": ["earthquake", "seismic", "tremor", "richter"],
            "Flood": ["flood", "flooding", "inundation", "water logging", "heavy rain"],
            "Cyclone": ["cyclone", "hurricane", "typhoon", "storm surge"],
            "Landslide": ["landslide", "mudslide", "land slide"],
            "Fire": ["fire", "wildfire", "blaze", "inferno"],
            "Drought": ["drought", "water scarcity", "famine"],
            "Tsunami": ["tsunami", "tidal wave"],
            "Tornado": ["tornado", "twister"],
            "Heat Wave": ["heat wave", "heatwave", "extreme heat"],
            "Cold Wave": ["cold wave", "freeze", "extreme cold"],
        }
        
        text_lower = text.lower()
        for disaster_type, patterns in disaster_patterns.items():
            for pattern in patterns:
                if pattern in text_lower:
                    return disaster_type
        
        return None
    
    def _extract_location(self, soup: BeautifulSoup, text: str) -> Optional[str]:
        """Try to extract location from article."""
        # Maharashtra cities
        maharashtra_cities = [
            "Mumbai", "Pune", "Nagpur", "Thane", "Nashik", "Aurangabad",
            "Solapur", "Kolhapur", "Sangli", "Ratnagiri", "Raigad",
            "Satara", "Latur", "Ahmednagar", "Nanded", "Maharashtra",
        ]
        
        # Check for locations in text
        for city in maharashtra_cities:
            if city.lower() in text.lower():
                return f"{city}, Maharashtra"
        
        # Try other Indian cities
        indian_cities = [
            "Delhi", "Bangalore", "Chennai", "Kolkata", "Hyderabad",
            "Ahmedabad", "Jaipur", "Lucknow", "Bhopal", "Patna",
        ]
        
        for city in indian_cities:
            if city.lower() in text.lower():
                return f"{city}, India"
        
        return None
    
    def search_news_by_keywords(self, keywords: List[str] = None) -> List[Dict]:
        """
        Search for disaster news using Google News RSS.
        
        Args:
            keywords: List of keywords to search for
            
        Returns:
            List of news articles found
        """
        if keywords is None:
            keywords = ["disaster", "earthquake", "flood", "cyclone", "India"]
        
        articles = []
        
        # Use Google News RSS
        for keyword in keywords[:3]:  # Limit to avoid rate limiting
            try:
                search_url = f"https://news.google.com/rss/search?q={keyword}+India&hl=en-IN&gl=IN&ceid=IN:en"
                response = self.session.get(search_url, timeout=10)
                
                if response.status_code == 200:
                    soup = BeautifulSoup(response.content, "xml")
                    items = soup.find_all("item")[:5]
                    
                    for item in items:
                        article = {
                            "title": item.title.get_text() if item.title else "",
                            "link": item.link.get_text() if item.link else "",
                            "published": item.pubDate.get_text() if item.pubDate else "",
                            "source": item.source.get_text() if item.source else "",
                            "keyword": keyword,
                        }
                        articles.append(article)
                        
            except Exception as e:
                logger.error(f"Error searching for {keyword}: {e}")
        
        return articles


# Singleton instance
news_scraper = NewsScraper()


def scrape_news_url(url: str) -> Dict[str, Any]:
    """Convenience function to scrape a URL."""
    result = news_scraper.scrape_url(url)
    return result.to_dict()


def search_disaster_news(keywords: List[str] = None) -> List[Dict]:
    """Convenience function to search for disaster news."""
    return news_scraper.search_news_by_keywords(keywords)
