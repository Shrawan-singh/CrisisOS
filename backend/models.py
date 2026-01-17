from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, Text
from sqlalchemy.types import JSON
from db import Base

class Incident(Base):
    __tablename__ = "incidents"

    event_id = Column(String, primary_key=True, index=True)
    disaster_type = Column(String, index=True)
    location = Column(String, index=True)
    urgency = Column(String)
    summary = Column(String)
    status = Column(String, default="UNVERIFIED")
    source_count = Column(Integer, default=1)
    reliability_message = Column(String)
    confidence = Column(Integer, default=30)
    spam_count = Column(Integer, default=0)
    sample_headlines = Column(Text)
    source_urls = Column(Text)
    latitude = Column(String)
    longitude = Column(String)
    disaster_probabilities = Column(JSON)
    images_urls = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
