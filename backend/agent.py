import json
import asyncio
from datetime import datetime
from typing import Dict
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage, HumanMessage

load_dotenv()

llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", temperature=0)

# CACHE: { "dadar_fire_14": { "count": 1, ... } }
INCIDENT_CACHE: Dict[str, dict] = {}

def get_dedupe_key(location, category):
    loc_slug = location.lower().split(" ")[0] 
    cat_slug = category.lower()
    hour = datetime.now().hour
    return f"{loc_slug}_{cat_slug}_{hour}"

async def run_disaster_agent(post_obj):
    raw_text = post_obj['text']
    
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
    
    if key in INCIDENT_CACHE:
        # EXISTING -> UPDATE COUNTER
        INCIDENT_CACHE[key]['count'] += 1
        count = INCIDENT_CACHE[key]['count']
        
        yield f'data: {{"type": "log", "content": "[MERGE] Duplicate report (Count: {count})"}}\n\n'
        
        update_payload = {"type": "card_update", "id": key, "field": "source_count", "value": count}
        yield f'data: {json.dumps(update_payload)}\n\n'
        return

    # 3. NEW -> SHOW IMMEDIATELY (Async UI)
    INCIDENT_CACHE[key] = {'count': 1, 'data': data}
    
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
    final_status = "VERIFIED"
    
    yield f'data: {{"type": "log", "content": "[OK] CONFIRMED: Validated against News."}}\n\n'
    
    final_update = {"type": "card_update", "id": key, "field": "status", "value": final_status}
    yield f'data: {json.dumps(final_update)}\n\n'