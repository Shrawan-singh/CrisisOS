from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, Text, Float, Boolean
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
    
    # CrisisOS 2.0 fields
    source_type = Column(String, default="unknown")  # official, news, social, citizen
    trust_score = Column(Integer, default=50)
    weighted_sources = Column(Float, default=0.0)
    source_breakdown = Column(JSON)  # {"official": 1, "news": 2, ...}
    highest_trust_source = Column(String)
    citizen_verified = Column(Boolean, default=False)
    image_verification = Column(JSON)  # Gemini Vision results
    cluster_id = Column(String, index=True)  # For spatiotemporal clustering
    lat_float = Column(Float)  # Numeric latitude for Haversine
    lon_float = Column(Float)  # Numeric longitude for Haversine


class CitizenReport(Base):
    """Citizen-submitted reports with image verification."""
    __tablename__ = "citizen_reports"
    
    report_id = Column(String, primary_key=True, index=True)
    description = Column(Text)
    location = Column(String, index=True)
    latitude = Column(Float)
    longitude = Column(Float)
    image_path = Column(String)
    reporter_id = Column(String, index=True)  # Anonymous if null
    verified = Column(Boolean, default=False)
    verification_result = Column(JSON)
    trust_score = Column(Integer, default=40)
    merged_with = Column(String, index=True)  # event_id if merged
    created_at = Column(DateTime, default=datetime.utcnow)

