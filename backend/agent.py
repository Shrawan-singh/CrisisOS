import json
import asyncio
import logging
from datetime import datetime
from typing import Dict
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage, HumanMessage
from rapidfuzz import fuzz
from db import SessionLocal
from models import Incident

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", temperature=0)

# CACHE: { "dadar_fire_14": { "count": 1, ... } }
INCIDENT_CACHE: Dict[str, dict] = {}


def upsert_incident(event_id: str, data: dict, count: int, status: str, confidence: int) -> None:
    """Persist or update an incident in SQLite."""
    logger.info(f"Upserting incident {event_id}: status={status}, confidence={confidence}, count={count}")
    session = SessionLocal()
    try:
        incident = session.get(Incident, event_id)
        if incident:
            incident.source_count = count
            incident.status = status
            incident.reliability_message = f"{status} - {data.get('summary','')}"
            incident.confidence = confidence
        else:
            incident = Incident(
                event_id=event_id,
                disaster_type=data.get("category"),
                location=data.get("location"),
                urgency=data.get("urgency"),
                summary=data.get("summary"),
                status=status,
                source_count=count,
                reliability_message=f"{status} - {data.get('summary','')}",
                confidence=confidence,
                sample_headlines=data.get("summary"),
                source_urls="Live Feed Analysis",
                latitude=data.get("latitude"),
                longitude=data.get("longitude"),
                disaster_probabilities=None,
                images_urls=None,
            )
            session.add(incident)
        session.commit()
    finally:
        session.close()

def get_dedupe_key(location, category):
    loc_slug = location.lower().split(" ")[0] 
    cat_slug = category.lower()
    hour = datetime.now().hour
    return f"{loc_slug}_{cat_slug}_{hour}"


def compute_confidence(count: int, urgency: str) -> int:
    base = 30
    if urgency.lower() == "high":
        base += 20
    elif urgency.lower() == "medium":
        base += 10
    return min(95, base + count * 10)


def find_duplicate(session, data: dict, threshold: int = 82):
    """Return existing incident event_id if similar enough."""
    logger.debug(f"Checking for duplicates: location={data.get('location')}")
    candidates = session.query(Incident).filter(Incident.location.ilike(f"%{data['location']}%"))
    text = f"{data.get('location','')} {data.get('summary','')}"
    best_id = None
    best_score = 0
    for inc in candidates.all():
        other = f"{inc.location} {inc.summary}"
        score = fuzz.token_set_ratio(text, other)
        if score > best_score:
            best_score = score
            best_id = inc.event_id
    if best_score >= threshold:
        logger.info(f"Duplicate found: {best_id} (fuzzy score: {best_score})")
    return best_id if best_score >= threshold else None

async def run_disaster_agent(post_obj):
    raw_text = post_obj['text']
    logger.info(f"Processing incident: {raw_text[:60]}...")
    
    # 1. PARSE UNSTRUCTURED TEXT
    yield f'data: {{"type": "log", "content": "[AI] ANALYZING: {raw_text[:50]}..."}}\n\n'
    
    data = {}
    if post_obj.get("is_demo") and post_obj.get("parsed"):
        # FAST PATH: Skip LLM for demo data
        data = post_obj["parsed"]
        await asyncio.sleep(0.1) # Micro-delay for realism
    else:
        # SLOW PATH: Use LLM
        prompt = [
            SystemMessage(content="""
            You are a Crisis Assistant. 
            Extract a valid JSON object from the input.
            Schema: {
                "location": "string (city/area)", 
                "category": "string (Fire/Flood/Accident/Medical/Other)", 
                "urgency": "string (High/Med/Low)", 
                "summary": "string (max 10 words)"
            }
            Return ONLY the JSON. No markdown code blocks.
            """),
            HumanMessage(content=raw_text)
        ]
        try:
            response = await llm.ainvoke(prompt)
            # Clean markdown if present
            content = response.content.replace("```json", "").replace("```", "").strip()
            data = json.loads(content)
        except Exception as e:
            print(f"Error in run_disaster_agent: {e}")
            yield f'data: {{"type": "log", "content": "[ERROR] Failed to parse AI response: {str(e)[:30]}..."}}\n\n'
            return # Skip bad data
    # 2. DEDUPLICATION CHECK
    key = get_dedupe_key(data['location'], data['category'])
    
    session = SessionLocal()
    dup_id = find_duplicate(session, data)
    session.close()

    if dup_id or key in INCIDENT_CACHE:
        event_id = dup_id or key
        INCIDENT_CACHE[event_id] = INCIDENT_CACHE.get(event_id, {'count': 0, 'data': data, 'status': "UNVERIFIED"})
        INCIDENT_CACHE[event_id]['count'] += 1
        count = INCIDENT_CACHE[event_id]['count']
        confidence = compute_confidence(count, data.get('urgency', 'Low'))
        upsert_incident(event_id, data, count, INCIDENT_CACHE[event_id].get("status", "UNVERIFIED"), confidence)
        
        yield f'data: {{"type": "log", "content": "[MERGE] Duplicate/Similar report (Count: {count})"}}\n\n'
        
        update_payload = {"type": "card_update", "id": event_id, "field": "source_count", "value": count}
        yield f'data: {json.dumps(update_payload)}\n\n'
        return

    # 3. NEW -> SHOW IMMEDIATELY (Async UI)
    confidence = compute_confidence(1, data.get('urgency', 'Low'))
    INCIDENT_CACHE[key] = {'count': 1, 'data': data, 'status': "UNVERIFIED"}
    upsert_incident(key, data, 1, "UNVERIFIED", confidence)
    
    initial_card = {
        "type": "incident_card",
        "id": key,
        "title": f"[{data['category'].upper()}] {data['location']}",
        "location": data['location'],
        "status": "UNVERIFIED",
        "details": data['summary'],
        "urgency": data['urgency'],
        "source_count": 1,
        "image": post_obj.get('image')
    }
    
    yield f'data: {json.dumps(initial_card)}\n\n'
    
    # 4. BACKGROUND VERIFICATION
    yield f'data: {{"type": "log", "content": "[VERIFY] Checking local news..."}}\n\n'
    await asyncio.sleep(1) # Simulated verification delay
    
    # Logic: High Urgency = "Developing", otherwise "Verified" for demo
    # Simple verification heuristic based on source count & urgency
    final_status = "VERIFIED" if INCIDENT_CACHE[key]['count'] >= 3 else "HIGH_POSSIBILITY" if INCIDENT_CACHE[key]['count'] >= 2 else "UNVERIFIED"
    confidence = compute_confidence(INCIDENT_CACHE[key]['count'], data.get('urgency', 'Low'))
    INCIDENT_CACHE[key]['status'] = final_status
    upsert_incident(key, data, INCIDENT_CACHE[key]['count'], final_status, confidence)
    
    yield f'data: {{"type": "log", "content": "[OK] CONFIRMED: Validated against News."}}\n\n'
    
    final_update = {"type": "card_update", "id": key, "field": "status", "value": final_status}
    yield f'data: {json.dumps(final_update)}\n\n'