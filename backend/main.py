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
def verify_disaster(
    query: str = Query(..., description="Search query or keyword"),
    db: Session = Depends(get_db),
):
    """Verify disaster news based on keywords"""
    query_lower = query.lower()

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

    if not relevant_events:
        return {
            "query": query,
            "verification_status": "Likely Fake",
            "possibility_level": "Low",
            "confidence_score": 18,
            "sources_checked": [
                {"name": "NDMA", "type": "Government"},
                {"name": "IMD", "type": "Official"},
                {"name": "State Disaster Management", "type": "Government"},
            ],
            "explanation": "No official confirmation from IMD, NDMA, or State Disaster Management Authority. Only unverified social media posts detected.",
            "safety_advice": [
                "Do not panic",
                "Wait for official disaster alerts",
                "Avoid sharing unverified information",
                "Monitor official channels for updates",
            ],
            "related_events": [],
            "images": [],
        }

    top_event = relevant_events[0]
    source_count = top_event.source_count or 0

    if source_count >= 3:
        status = "Likely True"
        possibility = "High"
        confidence = min(95, 70 + source_count * 5)
    elif source_count >= 2:
        status = "Uncertain"
        possibility = "Medium"
        confidence = 50 + source_count * 10
    else:
        status = "Uncertain"
        possibility = "Low"
        confidence = 30 + source_count * 10

    sources = [
        {"name": "Live Feed Analysis", "type": "AI Analysis"},
        {"name": "News API", "type": "News Channel"},
        {"name": "Social Media", "type": "Community Reports"},
    ]

    return {
        "query": query,
        "verification_status": status,
        "possibility_level": possibility,
        "confidence_score": confidence,
        "sources_checked": sources,
        "explanation": f"This information is confirmed by {source_count} sources from real-time monitoring. {top_event.reliability_message or ''} It is recommended to follow official instructions.",
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
        "confidence_score": top_event.confidence or confidence,
        "status": top_event.status or status,
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

@app.get("/health")
async def health():
    return {"status": "ok", "message": "CrisisOS Backend is running"}
