import asyncio
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from agent import run_disaster_agent
from listener import listen_for_crisis, get_demo_data

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

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

@app.get("/health")
async def health():
    return {"status": "ok"}
