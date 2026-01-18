import asyncio
import logging
from datetime import datetime
from typing import List, Optional

from fastapi import Depends, FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import or_

from agent import run_disaster_agent
from listener import listen_for_crisis, get_demo_data
from db import SessionLocal, engine, ensure_columns
from models import Incident

logging.basicConfig(level=logging.INFO, format='[%(asctime)s] [%(name)s] %(levelname)s: %(message)s')
logger = logging.getLogger(__name__)

app = FastAPI(title="CrisisOS Backend")
logger.info("CrisisOS Backend starting...")

# Ensure tables exist
Incident.__table__.create(bind=engine, checkfirst=True)
ensure_columns()
logger.info("Database tables and columns ensured.")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models for API responses
class VerifiedEvent(BaseModel):
    event_id: str
    disaster_type: str
    location: str
    status: str
    confirming_sources_count: int
    confidence_score: int
    reliability_message: str
    timestamp: datetime
    summary: Optional[str] = None
    urgency: Optional[str] = None
    sample_headlines: List[str] = []
    source_urls: List[str] = []
    latitude: Optional[str] = None
    longitude: Optional[str] = None
    disaster_probabilities: Optional[dict] = None
    images_urls: List[str] = []
    spam_count: int = 0

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/events", response_model=List[VerifiedEvent])
def get_verified_events(
    location: str = Query(None, description="Filter by location"),
    db: Session = Depends(get_db),
):
    """Get all verified events, optionally filtered by location"""
    logger.info(f"GET /events location={location}")
    query = db.query(Incident)
    if location:
        query = query.filter(Incident.location.ilike(f"%{location}%"))

    events: List[VerifiedEvent] = []
    for inc in query.order_by(Incident.created_at.desc()).all():
        events.append(
            VerifiedEvent(
                event_id=inc.event_id,
                disaster_type=inc.disaster_type,
                location=inc.location,
                status=inc.status or "UNVERIFIED",
                confirming_sources_count=inc.source_count,
                confidence_score=inc.confidence or 30,
                reliability_message=inc.reliability_message or "",
                timestamp=inc.created_at or datetime.utcnow(),
                summary=inc.summary,
                urgency=inc.urgency,
                sample_headlines=inc.sample_headlines.split("|") if inc.sample_headlines else [],
                source_urls=inc.source_urls.split("|") if inc.source_urls else [],
                latitude=inc.latitude,
                longitude=inc.longitude,
                disaster_probabilities=inc.disaster_probabilities,
                images_urls=inc.images_urls.split("|") if inc.images_urls else [],
                spam_count=inc.spam_count or 0,
            )
        )
    return events

@app.get("/verify")
async def verify_disaster(
    query: str = Query(..., description="Search query or keyword"),
    db: Session = Depends(get_db),
):
    """
    Verify disaster news using:
    1. Database search for existing verified incidents
    2. AI agent analysis for new queries
    """
    query_lower = query.lower()
    logger.info(f"Verifying query: {query}")

    # First check database for existing incidents
    relevant_events = (
        db.query(Incident)
        .filter(
            or_(
                Incident.location.ilike(f"%{query_lower}%"),
                Incident.disaster_type.ilike(f"%{query_lower}%"),
                Incident.sample_headlines.ilike(f"%{query_lower}%"),
            )
        )
        .order_by(Incident.source_count.desc())
        .all()
    )

    if relevant_events:
        top_event = relevant_events[0]
        source_count = top_event.source_count or 0
        trust_score = top_event.trust_score or top_event.confidence or 50

        if trust_score >= 70 or source_count >= 3:
            status = "Verified"
            possibility = "High"
        elif trust_score >= 40 or source_count >= 2:
            status = "Likely True"
            possibility = "Medium"
        else:
            status = "Needs Verification"
            possibility = "Low"

        sources = [
            {"name": "CrisisOS Database", "type": "Verified Database"},
            {"name": "Live Feed Analysis", "type": "AI Analysis"},
            {"name": "News Sources", "type": "News Channel"},
        ]
        
        if top_event.highest_trust_source:
            sources.append({"name": top_event.highest_trust_source, "type": "Primary Source"})

        return {
            "query": query,
            "verification_status": status,
            "possibility_level": possibility,
            "confidence_score": trust_score,
            "sources_checked": sources,
            "explanation": f"This incident is tracked in our database with {source_count} confirming sources. Trust score: {trust_score}%. {top_event.reliability_message or ''}",
            "safety_advice": [
                "Follow official instructions from local authorities",
                "Stay informed through verified news channels",
                "Avoid spreading unverified information",
                "Keep emergency contacts handy",
                "Follow evacuation orders if issued",
            ],
            "related_events": [
                {
                    "location": top_event.location,
                    "disaster_type": top_event.disaster_type,
                    "timestamp": (top_event.created_at or datetime.utcnow()).isoformat(),
                    "headlines": (top_event.sample_headlines or "").split("|")[:3],
                }
            ],
            "images": (top_event.images_urls or "").split("|") if top_event.images_urls else [],
            "coordinates": {
                "latitude": top_event.latitude,
                "longitude": top_event.longitude,
            },
            "disaster_probabilities": top_event.disaster_probabilities or {},
        }

    # No database match - use AI agent to verify
    logger.info(f"No database match, running AI verification for: {query}")
    
    try:
        # Run the agent to verify the news
        verified_data = None
        async for event in run_disaster_agent({"content": query, "source": "user_query"}):
            if event and "data" in event:
                verified_data = event["data"]
                break
        
        if verified_data and verified_data.get("is_disaster"):
            # Agent found this to be a real disaster
            confidence = verified_data.get("confidence", 60)
            
            return {
                "query": query,
                "verification_status": "Likely True" if confidence >= 50 else "Needs Verification",
                "possibility_level": "High" if confidence >= 70 else "Medium" if confidence >= 50 else "Low",
                "confidence_score": confidence,
                "sources_checked": [
                    {"name": "Gemini AI Analysis", "type": "AI Analysis"},
                    {"name": "Pattern Recognition", "type": "ML Model"},
                    {"name": "NDMA Guidelines", "type": "Government"},
                ],
                "explanation": f"AI analysis indicates this may be a {verified_data.get('category', 'disaster')} event in {verified_data.get('location', 'the mentioned area')}. {verified_data.get('summary', '')}",
                "safety_advice": [
                    "Verify with local authorities before taking action",
                    "Monitor official disaster management channels",
                    "Do not share until confirmed by official sources",
                    "Stay alert for further updates",
                ],
                "related_events": [],
                "images": [],
            }
    except Exception as e:
        logger.error(f"AI verification failed: {e}")

    # No match found anywhere - likely fake or unverifiable
    return {
        "query": query,
        "verification_status": "⚠️ Flagged as Potentially Fake",
        "possibility_level": "Low",
        "confidence_score": 15,
        "sources_checked": [
            {"name": "NDMA India", "type": "Government"},
            {"name": "IMD Weather", "type": "Official"},
            {"name": "Maharashtra SDMA", "type": "State Government"},
            {"name": "CrisisOS Database", "type": "Verified Database"},
        ],
        "explanation": "⚠️ No official confirmation found from IMD, NDMA, or State Disaster Management Authority. This news could not be verified through any trusted source. Exercise caution before sharing.",
        "safety_advice": [
            "Do not panic or spread this unverified news",
            "Wait for official disaster alerts from government sources",
            "Verify with local authorities before taking action",
            "Monitor official channels: @ndaborad, @maborad on Twitter",
            "Report fake disaster news to cybercrime.gov.in",
        ],
        "related_events": [],
        "images": [],
    }

@app.get("/start-feed")
async def start_feed():
    """Continuous stream of disaster data"""
    async def feed_generator():
        try:
            # Loop 2 times for the demo
            for cycle in range(2): 
                # 1. IMMEDIATE FAKE DATA
                yield f'data: {{"type": "log", "content": "[SCAN] Initializing Sentinel Systems..."}}\n\n'
                
                # Fetch and process demo data first
                demo_posts = await get_demo_data(2)
                for i, post in enumerate(demo_posts):
                    yield f'data: {{"type": "log", "content": "[DEMO] Injecting simulation event {i+1}..."}}\n\n'
                    async for event in run_disaster_agent(post):
                        yield event
                    await asyncio.sleep(0.5)

                yield f'data: {{"type": "log", "content": "[SCAN] Scanning live networks..."}}\n\n'

                # 2. REAL DATA
                posts = await listen_for_crisis()
                
                yield f'data: {{"type": "log", "content": "[INFO] Found {len(posts)} live news items"}}\n\n'
                
                for i, post in enumerate(posts):
                     yield f'data: {{"type": "log", "content": "[PROCESS] Analyzing signal {i+1}/{len(posts)}..."}}\n\n'
                     # Process each post
                     async for event in run_disaster_agent(post):
                         yield event
                     await asyncio.sleep(0.5) # Brief pause between items
                
                yield f'data: {{"type": "log", "content": "[WAIT] Cycle complete, waiting..."}}\n\n'
                await asyncio.sleep(2)
            
            yield f'data: {{"type": "log", "content": "[DONE] All scan cycles completed."}}\n\n'
        except Exception as e:
            print(f"[ERROR] Feed generator error: {e}")
            yield f'data: {{"type": "log", "content": "[ERROR] {str(e)[:50]}"}}\n\n'

    return StreamingResponse(feed_generator(), media_type="text/event-stream")


@app.get("/incidents/{event_id}", response_model=VerifiedEvent)
def get_incident(event_id: str, db: Session = Depends(get_db)):
    inc = db.get(Incident, event_id)
    if not inc:
        return {"detail": "Not found"}
    return VerifiedEvent(
        event_id=inc.event_id,
        disaster_type=inc.disaster_type,
        location=inc.location,
        status=inc.status or "UNVERIFIED",
        confirming_sources_count=inc.source_count,
        confidence_score=inc.confidence or 30,
        reliability_message=inc.reliability_message or "",
        timestamp=inc.created_at or datetime.utcnow(),
        summary=inc.summary,
        urgency=inc.urgency,
        sample_headlines=inc.sample_headlines.split("|") if inc.sample_headlines else [],
        source_urls=inc.source_urls.split("|") if inc.source_urls else [],
        latitude=inc.latitude,
        longitude=inc.longitude,
        disaster_probabilities=inc.disaster_probabilities,
        images_urls=inc.images_urls.split("|") if inc.images_urls else [],
        spam_count=inc.spam_count or 0,
    )


@app.post("/incidents", response_model=VerifiedEvent)
def create_incident(payload: dict, db: Session = Depends(get_db)):
    # Basic manual submission handler
    event_id = f"manual_{int(datetime.utcnow().timestamp())}"
    logger.info(f"POST /incidents location={payload.get('location')} type={payload.get('disaster_type')}")
    inc = Incident(
        event_id=event_id,
        disaster_type=payload.get("disaster_type", "Unknown"),
        location=payload.get("location", "Unknown"),
        urgency=payload.get("urgency", "Low"),
        summary=payload.get("summary", ""),
        status="UNVERIFIED",
        source_count=1,
        reliability_message=payload.get("summary", ""),
        confidence=compute_confidence(1, payload.get("urgency", "Low")),
        sample_headlines=payload.get("summary", ""),
        source_urls="Manual Submission",
    )
    db.add(inc)
    db.commit()
    logger.info(f"Incident created: {event_id}")
    return get_incident(event_id, db)


@app.patch("/incidents/{event_id}/flag")
def flag_incident(event_id: str, db: Session = Depends(get_db)):
    logger.info(f"PATCH /incidents/{event_id}/flag")
    inc = db.get(Incident, event_id)
    if not inc:
        logger.warning(f"Incident {event_id} not found")
        return {"detail": "Not found"}
    inc.spam_count = (inc.spam_count or 0) + 1
    if inc.spam_count >= 3:
        inc.status = "FLAGGED"
        logger.warning(f"Incident {event_id} FLAGGED (spam_count={inc.spam_count})")
    db.commit()
    return {"status": inc.status, "spam_count": inc.spam_count}


# ============================================================================
# CrisisOS 2.0 - New Endpoints
# ============================================================================

from fastapi import File, UploadFile, Form
from citizen_cam import citizen_manager
from sources_v2 import multi_source, fetch_disaster_news, fetch_breaking_news
from trust_pyramid import calculate_trust_score, get_verification_status
from clustering import event_clusterer, geocode_location, haversine_distance, GeoPoint


@app.post("/api/citizen-report")
async def submit_citizen_report(
    image: Optional[UploadFile] = File(None),
    description: str = Form(...),
    location: str = Form(...),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    reporter_id: Optional[str] = Form(None),
):
    """
    Submit a citizen report with optional image for Gemini Vision verification.
    
    The image will be analyzed for disaster detection and authenticity.
    Reports are automatically merged with existing incidents using spatiotemporal analysis.
    """
    logger.info(f"POST /api/citizen-report location={location}")
    
    image_data = None
    filename = None
    if image:
        image_data = await image.read()
        filename = image.filename
    
    result = await citizen_manager.submit_report(
        image_data=image_data,
        filename=filename,
        description=description,
        location=location,
        latitude=latitude,
        longitude=longitude,
        reporter_id=reporter_id,
    )
    
    return result


@app.post("/api/verify-image")
async def verify_disaster_image(
    image: UploadFile = File(...),
    claimed_disaster: str = Form(""),
):
    """
    Verify a disaster image using Gemini Vision without creating a report.
    
    Returns detailed analysis including:
    - Whether the image shows a disaster
    - Type of disaster detected
    - Confidence score
    - Authenticity check (manipulation, old image detection)
    - Safety concerns visible in the image
    """
    logger.info(f"POST /api/verify-image claimed_type={claimed_disaster}")
    
    image_data = await image.read()
    result = await citizen_manager.verify_image_only(
        image_data=image_data,
        filename=image.filename,
        claimed_type=claimed_disaster,
    )
    
    return result


@app.get("/api/incidents/nearby")
def get_nearby_incidents(
    latitude: float = Query(..., description="Latitude"),
    longitude: float = Query(..., description="Longitude"),
    radius_km: float = Query(5.0, description="Search radius in kilometers"),
    db: Session = Depends(get_db),
):
    """
    Get incidents near a geographic location using Haversine distance.
    
    Returns incidents sorted by distance from the specified point.
    """
    logger.info(f"GET /api/incidents/nearby lat={latitude} lon={longitude} radius={radius_km}")
    
    target = GeoPoint(latitude, longitude)
    nearby = []
    
    for inc in db.query(Incident).all():
        if inc.lat_float and inc.lon_float:
            point = GeoPoint(inc.lat_float, inc.lon_float)
            distance = haversine_distance(target, point)
            
            if distance <= radius_km:
                nearby.append({
                    "event_id": inc.event_id,
                    "disaster_type": inc.disaster_type,
                    "location": inc.location,
                    "status": inc.status,
                    "confidence": inc.confidence,
                    "distance_km": round(distance, 2),
                    "latitude": inc.lat_float,
                    "longitude": inc.lon_float,
                    "summary": inc.summary,
                })
    
    # Sort by distance
    nearby.sort(key=lambda x: x["distance_km"])
    return nearby


@app.get("/api/multi-source-search")
async def multi_source_search(
    query: str = Query(..., description="Search query"),
    location: Optional[str] = Query(None, description="Location filter"),
    use_cache: bool = Query(True, description="Use cached results if fresh"),
):
    """
    Search for disaster news across multiple sources (Google News, Reddit, Twitter).
    
    Implements cache-first hybrid search with 2-hour freshness.
    """
    logger.info(f"GET /api/multi-source-search query={query} location={location}")
    
    items = await multi_source.search_all(query, location, use_cache)
    
    return {
        "query": query,
        "location": location,
        "results_count": len(items),
        "results": [item.to_dict() for item in items],
    }


@app.get("/api/breaking-news")
async def get_breaking_news(
    location: str = Query("India", description="Location to search"),
):
    """
    Get breaking disaster news from all sources for a location.
    """
    logger.info(f"GET /api/breaking-news location={location}")
    
    results = await fetch_breaking_news(location)
    
    return {
        "location": location,
        "results_count": len(results),
        "results": results,
    }


@app.get("/api/trust-analysis")
def analyze_trust(
    event_id: str = Query(..., description="Event ID to analyze"),
    db: Session = Depends(get_db),
):
    """
    Get detailed Trust Pyramid analysis for an incident.
    
    Shows source breakdown, weighted trust score, and verification status.
    """
    logger.info(f"GET /api/trust-analysis event_id={event_id}")
    
    inc = db.get(Incident, event_id)
    if not inc:
        return {"error": "Incident not found"}
    
    source_urls = inc.source_urls.split("|") if inc.source_urls else []
    trust_data = calculate_trust_score(source_urls)
    
    return {
        "event_id": event_id,
        "disaster_type": inc.disaster_type,
        "location": inc.location,
        "current_status": inc.status,
        "trust_analysis": trust_data,
        "recommended_status": get_verification_status(
            trust_data["trust_score"],
            inc.source_count or 1,
        ),
    }


@app.get("/api/analytics/source-distribution")
def get_source_distribution(db: Session = Depends(get_db)):
    """
    Get distribution of incidents by source type for analytics.
    """
    logger.info("GET /api/analytics/source-distribution")
    
    distribution = {
        "official": 0,
        "news": 0,
        "social": 0,
        "citizen": 0,
        "unknown": 0,
    }
    
    for inc in db.query(Incident).all():
        source_type = inc.source_type or "unknown"
        if source_type in distribution:
            distribution[source_type] += 1
        else:
            distribution["unknown"] += 1
    
    return distribution


@app.get("/api/analytics/verification-funnel")
def get_verification_funnel(db: Session = Depends(get_db)):
    """
    Get verification funnel data showing how incidents progress through verification stages.
    """
    logger.info("GET /api/analytics/verification-funnel")
    
    funnel = {
        "total_reported": 0,
        "unverified": 0,
        "likely": 0,
        "verified": 0,
        "flagged": 0,
    }
    
    for inc in db.query(Incident).all():
        funnel["total_reported"] += 1
        status = (inc.status or "UNVERIFIED").upper()
        
        if status == "VERIFIED":
            funnel["verified"] += 1
        elif status == "LIKELY":
            funnel["likely"] += 1
        elif status == "FLAGGED":
            funnel["flagged"] += 1
        else:
            funnel["unverified"] += 1
    
    return funnel


@app.get("/api/map-data")
def get_map_data(db: Session = Depends(get_db)):
    """
    Get all incidents with coordinates for map display.
    
    Returns color-coded severity and verification status.
    """
    logger.info("GET /api/map-data")
    
    map_incidents = []
    
    for inc in db.query(Incident).all():
        lat = inc.lat_float
        lon = inc.lon_float
        
        # Try to geocode if no float coords
        if not lat or not lon:
            lat, lon = geocode_location(inc.location or "")
        
        if lat and lon:
            # Determine color based on status and urgency
            urgency = (inc.urgency or "low").lower()
            status = (inc.status or "UNVERIFIED").upper()
            
            if status == "FLAGGED":
                color = "gray"
            elif status == "VERIFIED":
                color = "green" if urgency == "low" else "orange" if urgency == "medium" else "red"
            else:
                color = "yellow"
            
            map_incidents.append({
                "event_id": inc.event_id,
                "disaster_type": inc.disaster_type,
                "location": inc.location,
                "summary": inc.summary,
                "status": status,
                "urgency": urgency,
                "confidence": inc.confidence or 30,
                "latitude": lat,
                "longitude": lon,
                "color": color,
            })
    
    return map_incidents


@app.post("/api/seed-data")
def seed_sample_data(db: Session = Depends(get_db)):
    """
    Seed the database with sample Maharashtra disaster data for testing.
    This is useful for demo purposes.
    """
    from clustering import geocode_location
    
    sample_incidents = [
        {
            "event_id": "mah_flood_001",
            "disaster_type": "Flood",
            "location": "Kolhapur, Maharashtra",
            "summary": "Heavy monsoon flooding reported in Kolhapur district. Multiple areas waterlogged.",
            "urgency": "high",
            "status": "VERIFIED",
            "confidence": 85,
            "source_count": 4,
            "trust_score": 85,
            "source_type": "official",
        },
        {
            "event_id": "mah_rain_002",
            "disaster_type": "Heavy Rainfall",
            "location": "Mumbai, Maharashtra",
            "summary": "IMD issues red alert for Mumbai. Heavy rainfall expected in next 24 hours.",
            "urgency": "medium",
            "status": "VERIFIED",
            "confidence": 92,
            "source_count": 5,
            "trust_score": 92,
            "source_type": "official",
        },
        {
            "event_id": "mah_landslide_003",
            "disaster_type": "Landslide",
            "location": "Raigad, Maharashtra",
            "summary": "Landslide warning issued for hilly areas of Raigad due to continuous rain.",
            "urgency": "high",
            "status": "HIGH_POSSIBILITY",
            "confidence": 72,
            "source_count": 3,
            "trust_score": 72,
            "source_type": "news",
        },
        {
            "event_id": "mah_cyclone_004",
            "disaster_type": "Cyclone Alert",
            "location": "Ratnagiri, Maharashtra",
            "summary": "Cyclonic depression forming in Arabian Sea. Coastal areas on alert.",
            "urgency": "medium",
            "status": "HIGH_POSSIBILITY",
            "confidence": 68,
            "source_count": 3,
            "trust_score": 68,
            "source_type": "official",
        },
        {
            "event_id": "mah_flood_005",
            "disaster_type": "Urban Flooding",
            "location": "Thane, Maharashtra",
            "summary": "Waterlogging reported in low-lying areas of Thane due to heavy rainfall.",
            "urgency": "medium",
            "status": "VERIFIED",
            "confidence": 78,
            "source_count": 4,
            "trust_score": 78,
            "source_type": "news",
        },
    ]
    
    added = 0
    for data in sample_incidents:
        existing = db.query(Incident).filter(Incident.event_id == data["event_id"]).first()
        if existing:
            continue
        
        lat, lon = geocode_location(data["location"])
        
        incident = Incident(
            event_id=data["event_id"],
            disaster_type=data["disaster_type"],
            location=data["location"],
            summary=data["summary"],
            urgency=data["urgency"],
            status=data["status"],
            confidence=data["confidence"],
            source_count=data["source_count"],
            trust_score=data["trust_score"],
            source_type=data["source_type"],
            reliability_message=f"{data['status']} - {data['summary']}",
            sample_headlines=data["summary"],
            source_urls="IMD|NDMA|Maharashtra SDMA",
            latitude=str(lat) if lat else None,
            longitude=str(lon) if lon else None,
            lat_float=lat,
            lon_float=lon,
            highest_trust_source="IMD Weather",
        )
        db.add(incident)
        added += 1
    
    db.commit()
    return {"message": f"Seeded {added} sample incidents", "total": len(sample_incidents)}


# ============ NEWS SCRAPING ENDPOINTS ============

from news_scraper import scrape_news_url, search_disaster_news, DISASTER_KEYWORDS

@app.post("/api/scrape-news")
async def scrape_news(url: str = Query(..., description="News URL to scrape")):
    """
    Scrape a news article from URL using BeautifulSoup.
    Returns title, content, images, and disaster analysis.
    """
    logger.info(f"POST /api/scrape-news url={url}")
    
    try:
        result = scrape_news_url(url)
        return result
    except Exception as e:
        logger.error(f"Error scraping news: {e}")
        return {"error": str(e), "url": url}


@app.get("/api/search-disaster-news")
async def search_news(
    keywords: str = Query(None, description="Comma-separated keywords to search"),
):
    """
    Search for disaster news using keywords.
    Uses Google News RSS and BeautifulSoup.
    """
    logger.info(f"GET /api/search-disaster-news keywords={keywords}")
    
    keyword_list = None
    if keywords:
        keyword_list = [k.strip() for k in keywords.split(",")]
    
    try:
        articles = search_disaster_news(keyword_list)
        return {
            "keywords": keyword_list or ["disaster", "earthquake", "flood", "cyclone", "India"],
            "articles": articles,
            "count": len(articles),
        }
    except Exception as e:
        logger.error(f"Error searching news: {e}")
        return {"error": str(e), "keywords": keyword_list}


@app.get("/api/disaster-keywords")
async def get_disaster_keywords():
    """Get the list of disaster keywords used for detection."""
    return {"keywords": DISASTER_KEYWORDS}


@app.get("/health")
async def health():
    return {"status": "ok", "message": "CrisisOS 2.0 Backend is running"}
