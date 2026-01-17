"""
CrisisOS 2.0 - Multi-Source Intelligence Gathering

Integrates multiple data sources:
- Google News API (via SerpAPI or RSS)
- Reddit API (PRAW)
- Twitter/X API
- Official Government feeds
- News RSS aggregation

Implements cache-first hybrid search with 2-hour freshness.
"""

import os
import asyncio
import logging
import hashlib
import json
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any
from dataclasses import dataclass, asdict
from pathlib import Path
from abc import ABC, abstractmethod
import aiohttp
from dotenv import load_dotenv

# Load environment variables
env_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=env_path)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Cache configuration
CACHE_FRESHNESS_HOURS = 2
CACHE_FILE = Path(__file__).parent / "source_cache.json"


@dataclass
class NewsItem:
    """Represents a single news item from any source."""
    title: str
    description: str
    url: str
    source: str
    source_type: str  # official, news, social, citizen
    published_at: datetime
    location: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    image_url: Optional[str] = None
    raw_data: Optional[Dict] = None
    
    def to_dict(self) -> Dict:
        data = asdict(self)
        data["published_at"] = self.published_at.isoformat()
        return data


class SourceCache:
    """Cache-first hybrid search with 2-hour freshness."""
    
    def __init__(self, cache_file: Path = CACHE_FILE):
        self.cache_file = cache_file
        self.cache: Dict[str, Any] = self._load_cache()
    
    def _load_cache(self) -> Dict:
        if self.cache_file.exists():
            try:
                with open(self.cache_file, "r") as f:
                    return json.load(f)
            except Exception as e:
                logger.error(f"Failed to load cache: {e}")
        return {}
    
    def _save_cache(self):
        try:
            with open(self.cache_file, "w") as f:
                json.dump(self.cache, f, default=str)
        except Exception as e:
            logger.error(f"Failed to save cache: {e}")
    
    def _get_cache_key(self, query: str, source: str) -> str:
        return hashlib.md5(f"{query}:{source}".encode()).hexdigest()
    
    def get(self, query: str, source: str) -> Optional[List[Dict]]:
        """Get cached results if fresh (within 2 hours)."""
        key = self._get_cache_key(query, source)
        if key in self.cache:
            entry = self.cache[key]
            cached_time = datetime.fromisoformat(entry["timestamp"])
            if datetime.now() - cached_time < timedelta(hours=CACHE_FRESHNESS_HOURS):
                logger.info(f"Cache HIT for {source}:{query[:30]}...")
                return entry["data"]
        logger.info(f"Cache MISS for {source}:{query[:30]}...")
        return None
    
    def set(self, query: str, source: str, data: List[Dict]):
        """Cache results with timestamp."""
        key = self._get_cache_key(query, source)
        self.cache[key] = {
            "timestamp": datetime.now().isoformat(),
            "query": query,
            "source": source,
            "data": data,
        }
        self._save_cache()


# Global cache instance
source_cache = SourceCache()


class BaseSource(ABC):
    """Abstract base class for all news sources."""
    
    source_name: str
    source_type: str
    
    @abstractmethod
    async def search(self, query: str, location: Optional[str] = None) -> List[NewsItem]:
        pass
    
    async def search_with_cache(self, query: str, location: Optional[str] = None) -> List[NewsItem]:
        """Search with cache-first strategy."""
        cache_query = f"{query}:{location}" if location else query
        cached = source_cache.get(cache_query, self.source_name)
        
        if cached:
            return [self._dict_to_news_item(item) for item in cached]
        
        results = await self.search(query, location)
        source_cache.set(cache_query, self.source_name, [item.to_dict() for item in results])
        return results
    
    def _dict_to_news_item(self, data: Dict) -> NewsItem:
        data["published_at"] = datetime.fromisoformat(data["published_at"])
        data.pop("raw_data", None)
        return NewsItem(**data)


class GoogleNewsSource(BaseSource):
    """Google News via RSS feed (free, no API key needed)."""
    
    source_name = "google_news"
    source_type = "news"
    
    async def search(self, query: str, location: Optional[str] = None) -> List[NewsItem]:
        """Search Google News RSS feed."""
        import feedparser
        
        search_query = f"{query} {location}" if location else query
        search_query = search_query.replace(" ", "+")
        
        # Google News RSS URL
        url = f"https://news.google.com/rss/search?q={search_query}&hl=en-IN&gl=IN&ceid=IN:en"
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url, timeout=10) as response:
                    if response.status == 200:
                        content = await response.text()
                        feed = feedparser.parse(content)
                        
                        items = []
                        for entry in feed.entries[:20]:  # Limit to 20 items
                            items.append(NewsItem(
                                title=entry.get("title", ""),
                                description=entry.get("summary", ""),
                                url=entry.get("link", ""),
                                source="Google News",
                                source_type=self.source_type,
                                published_at=datetime.now(),  # RSS doesn't always have reliable dates
                                location=location,
                            ))
                        
                        logger.info(f"GoogleNews: Found {len(items)} results for '{query}'")
                        return items
        except Exception as e:
            logger.error(f"GoogleNews error: {e}")
        
        return []


class RedditSource(BaseSource):
    """Reddit search via JSON API (no auth needed for public data)."""
    
    source_name = "reddit"
    source_type = "social"
    
    # Disaster-related subreddits
    SUBREDDITS = [
        "worldnews",
        "news",
        "india",
        "mumbai",
        "chennai",
        "delhi",
        "bangalore",
        "weather",
        "TropicalWeather",
        "earthquake",
    ]
    
    async def search(self, query: str, location: Optional[str] = None) -> List[NewsItem]:
        """Search Reddit for disaster-related posts."""
        search_query = f"{query} {location}" if location else query
        items = []
        
        headers = {"User-Agent": "CrisisOS/2.0 DisasterIntelligence"}
        
        try:
            async with aiohttp.ClientSession(headers=headers) as session:
                # Search across Reddit
                url = f"https://www.reddit.com/search.json?q={search_query}&sort=new&limit=25"
                
                async with session.get(url, timeout=10) as response:
                    if response.status == 200:
                        data = await response.json()
                        
                        for post in data.get("data", {}).get("children", []):
                            post_data = post.get("data", {})
                            
                            items.append(NewsItem(
                                title=post_data.get("title", ""),
                                description=post_data.get("selftext", "")[:500],
                                url=f"https://reddit.com{post_data.get('permalink', '')}",
                                source=f"r/{post_data.get('subreddit', 'unknown')}",
                                source_type=self.source_type,
                                published_at=datetime.fromtimestamp(post_data.get("created_utc", 0)),
                                location=location,
                                image_url=post_data.get("thumbnail") if post_data.get("thumbnail", "").startswith("http") else None,
                            ))
                        
                        logger.info(f"Reddit: Found {len(items)} results for '{query}'")
        except Exception as e:
            logger.error(f"Reddit error: {e}")
        
        return items


class TwitterSource(BaseSource):
    """Twitter/X API source (requires API key)."""
    
    source_name = "twitter"
    source_type = "social"
    
    def __init__(self):
        self.api_key = os.getenv("TWITTER_API_KEY")
        self.api_secret = os.getenv("TWITTER_API_SECRET")
        self.bearer_token = os.getenv("TWITTER_BEARER_TOKEN")
    
    async def search(self, query: str, location: Optional[str] = None) -> List[NewsItem]:
        """Search Twitter for disaster-related tweets."""
        if not self.bearer_token:
            logger.warning("Twitter API not configured, skipping...")
            return []
        
        search_query = f"{query} {location}" if location else query
        items = []
        
        headers = {
            "Authorization": f"Bearer {self.bearer_token}",
            "Content-Type": "application/json",
        }
        
        try:
            async with aiohttp.ClientSession(headers=headers) as session:
                url = f"https://api.twitter.com/2/tweets/search/recent?query={search_query}&max_results=50&tweet.fields=created_at,author_id,geo"
                
                async with session.get(url, timeout=10) as response:
                    if response.status == 200:
                        data = await response.json()
                        
                        for tweet in data.get("data", []):
                            items.append(NewsItem(
                                title=tweet.get("text", "")[:100],
                                description=tweet.get("text", ""),
                                url=f"https://twitter.com/i/web/status/{tweet.get('id', '')}",
                                source="Twitter",
                                source_type=self.source_type,
                                published_at=datetime.fromisoformat(tweet.get("created_at", "").replace("Z", "+00:00")),
                                location=location,
                            ))
                        
                        logger.info(f"Twitter: Found {len(items)} results for '{query}'")
                    else:
                        logger.warning(f"Twitter API returned {response.status}")
        except Exception as e:
            logger.error(f"Twitter error: {e}")
        
        return items


class OfficialFeedsSource(BaseSource):
    """Official government and emergency service feeds."""
    
    source_name = "official"
    source_type = "official"
    
    # Official RSS/API endpoints
    OFFICIAL_FEEDS = [
        {
            "name": "IMD Weather Alerts",
            "url": "https://mausam.imd.gov.in/",
            "type": "weather",
        },
        {
            "name": "NDRF Updates",
            "url": "https://ndrf.gov.in/",
            "type": "emergency",
        },
    ]
    
    async def search(self, query: str, location: Optional[str] = None) -> List[NewsItem]:
        """Search official feeds - placeholder for actual implementation."""
        # In production, this would scrape/parse official government sites
        # For now, return empty as these require specific parsing
        logger.info("OfficialFeeds: Placeholder - implement specific parsers")
        return []


class MultiSourceAggregator:
    """Aggregates results from all sources with deduplication."""
    
    def __init__(self):
        self.sources: List[BaseSource] = [
            GoogleNewsSource(),
            RedditSource(),
            TwitterSource(),
            OfficialFeedsSource(),
        ]
    
    async def search_all(
        self,
        query: str,
        location: Optional[str] = None,
        use_cache: bool = True,
    ) -> List[NewsItem]:
        """Search all sources in parallel."""
        logger.info(f"MultiSource: Searching all sources for '{query}' in '{location}'")
        
        tasks = []
        for source in self.sources:
            if use_cache:
                tasks.append(source.search_with_cache(query, location))
            else:
                tasks.append(source.search(query, location))
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        all_items = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                logger.error(f"Source {self.sources[i].source_name} failed: {result}")
            else:
                all_items.extend(result)
        
        # Sort by published date (newest first)
        all_items.sort(key=lambda x: x.published_at, reverse=True)
        
        logger.info(f"MultiSource: Total {len(all_items)} items from all sources")
        return all_items
    
    async def search_by_disaster_type(
        self,
        disaster_type: str,
        location: str,
    ) -> List[NewsItem]:
        """Search for specific disaster type in location."""
        # Build optimized query for disaster type
        query_map = {
            "fire": "fire OR blaze OR inferno OR burning",
            "flood": "flood OR flooding OR waterlogging OR submerged",
            "earthquake": "earthquake OR tremor OR seismic",
            "cyclone": "cyclone OR hurricane OR typhoon OR storm",
            "landslide": "landslide OR mudslide OR debris flow",
            "accident": "accident OR crash OR collision OR mishap",
            "building_collapse": "building collapse OR structure collapse",
        }
        
        query = query_map.get(disaster_type.lower(), disaster_type)
        return await self.search_all(query, location)


# Singleton instance
multi_source = MultiSourceAggregator()


async def fetch_disaster_news(
    disaster_type: str,
    location: str,
    use_cache: bool = True,
) -> List[Dict]:
    """Main entry point for fetching disaster news from all sources."""
    items = await multi_source.search_by_disaster_type(disaster_type, location)
    return [item.to_dict() for item in items]


async def fetch_breaking_news(location: str = "India") -> List[Dict]:
    """Fetch breaking disaster news for a location."""
    query = "disaster OR emergency OR fire OR flood OR earthquake OR accident breaking"
    items = await multi_source.search_all(query, location)
    return [item.to_dict() for item in items]
