import asyncio
import random
import os
from dotenv import load_dotenv
import httpx

load_dotenv()

TAVILY_API_KEY = os.getenv("TAVILY_API_KEY")

# Keep track of seen URLs to prevent repetitive news
SEEN_URLS = set()

# Fallback demo data - Realistic for Hackathon
DEMO_DATA = [
    {
        "text": "URGENT: Massive fire broke out at a textile godown in Bhiwandi, Thane. 12 fire tenders rushed to the spot. Smoke visible from highway. #MumbaiFire",
        "parsed": {
            "location": "Bhiwandi",
            "category": "Fire",
            "urgency": "High",
            "summary": "Textile godown fire in Bhiwandi"
        }
    },
    {
        "text": "Flooding reported in Hindmata, Dadar after heavy rains. Traffic diverted. People asked to avoid Parel TT flyover. #MumbaiRains",
        "parsed": {
            "location": "Dadar",
            "category": "Flood",
            "urgency": "High",
            "summary": "Flooding in Hindmata, Dadar"
        }
    },
    {
        "text": "Serious road accident on Mumbai-Pune Expressway near Lonavala exit. Container truck overturned. Traffic halted towards Pune. Casualties reported.",
        "parsed": {
            "location": "Lonavala",
            "category": "Accident",
            "urgency": "High",
            "summary": "Truck overturned on Expressway"
        }
    },
    {
        "text": "Part of a 4-storey building collapsed in Ulhasnagar. Rescue operations underway by NDRF. Several feared trapped. #Thane #Collapse",
        "parsed": {
            "location": "Ulhasnagar",
            "category": "Collapse",
            "urgency": "High",
            "summary": "Building collapse in Ulhasnagar"
        }
    },
     {
        "text": "SOS: Medical emergency at Kurla Station. Passenger unconscious on Platform 4. Need railway police assistance immediately.",
        "parsed": {
            "location": "Kurla",
            "category": "Medical",
            "urgency": "High",
            "summary": "Medical emergency at Kurla Station"
        }
    },
    {
        "text": "Landslide reported at Malshej Ghat. Road blocked from both sides. Tourists stuck. Police clearing debris.",
        "parsed": {
            "location": "Malshej Ghat",
            "category": "Landslide",
            "urgency": "Medium",
            "summary": "Landslide blocking Malshej Ghat"
        }
    }
]

# Targeted queries to get variety instead of one generic blob
SEARCH_QUERIES = [
    '(fire OR explosion) AND (Mumbai OR Pune OR Thane OR Nagpur) "breaking news" -marketing',
    '(accident OR crash) AND (Mumbai-Pune Expressway OR highway) "traffic" "injured" -insurance',
    '(building collapse OR structural damage) AND (Mumbai OR Thane) "evacuated" -realestate',
    '(flood OR waterlogging OR heavy rain) AND (Maharashtra OR Mumbai) "alert" -weather_forecast_general',
    '(emergency OR sos OR rescue) AND (Maharashtra) "help needed" -politics',
    'site:reddit.com (Mumbai OR Pune) (disaster OR accident OR fire OR flood OR help) "urgent"',
    'site:reddit.com/r/mumbai "unsafe" "avoid" "blocked" "fire" "accident"'
]

async def fetch_maharashtra_news():
    """Fetch real news about disasters in Maharashtra using Tavily API"""
    if not TAVILY_API_KEY:
        print("[WARN] No Tavily API key, skipping real search.")
        return []
    
    # Pick a random query to get variety
    query = random.choice(SEARCH_QUERIES)
    print(f"[INFO] CONNECTING TO TAVILY API... Query: {query}")
    
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                "https://api.tavily.com/search",
                json={
                    "api_key": TAVILY_API_KEY,
                    "query": query,
                    "topic": "general", # 'news' topic can sometimes be stale, 'general' with date context is often better
                    "days": 2, # Very fresh (last 48 hours)
                    "search_depth": "basic",
                    "max_results": 6,
                    "include_answer": False,
                    "include_raw_content": False
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                results = []
                
                for r in data.get("results", []):
                    url = r.get("url")
                    
                    # DEDUPLICATION: Skip if we've seen this URL before
                    if url in SEEN_URLS:
                        print(f"[INFO] Skipping duplicate source: {url}")
                        continue
                        
                    SEEN_URLS.add(url)
                    
                    content = r.get("content", "")[:350] 
                    if content and len(content) > 50: # valid content check
                        results.append({
                            "text": f"{r.get('title', '')}: {content}", # Include title for better context
                            "image": None,
                            "source": "live-news",
                            "url": url
                        })
                
                print(f"[SUCCESS] Tavily found {len(results)} NEW items (after dedupe).")
                return results
            else:
                print(f"[API ERROR] Tavily returned status {response.status_code}: {response.text}")
                return []
                
    except Exception as e:
        print(f"[ERROR] Connection failed: {e}")
        return []

async def get_demo_data(num_items=2):
    """Generate fake/demo data for immediate display"""
    demo_items = []
    # Pick unique random items if possible, or just random
    selected = random.sample(DEMO_DATA, min(num_items, len(DEMO_DATA)))
    
    for item in selected:
        demo_items.append({
            "text": f"[LIVE REPORT] {item['text']}", 
            "image": None,
            "source": "citizen-reporter",
            "url": "demo-source",
            "is_demo": True,                # FLAG: This is a demo item
            "parsed": item['parsed']        # PRE-PARSED DATA: Skip LLM
        })
    return demo_items

async def listen_for_crisis():
    """Fetch crisis news (Real Data Only)"""
    # 1. Try to get REAL news
    real_news = await fetch_maharashtra_news()
    
    print(f"[INFO] Returning {len(real_news)} real news items")
    return real_news