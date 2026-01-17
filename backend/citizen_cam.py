"""
CrisisOS 2.0 - CitizenCam Module

Provides:
- Image upload and storage
- Gemini Vision verification for disaster images
- Spatiotemporal merging of citizen reports
- Trust scoring for citizen submissions
"""

import os
import base64
import uuid
import logging
import aiofiles
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, Tuple, List
from dataclasses import dataclass

from dotenv import load_dotenv
import google.generativeai as genai

from clustering import (
    ClusterableEvent,
    event_clusterer,
    should_merge_events,
    geocode_location,
    haversine_distance,
    GeoPoint,
)
from trust_pyramid import SourceType, TRUST_WEIGHTS

# Load environment variables
env_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=env_path)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configure Gemini
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

# Image storage configuration
UPLOAD_DIR = Path(__file__).parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

# Gemini Vision model for image analysis
VISION_MODEL = "gemini-2.0-flash"


@dataclass
class CitizenReport:
    """A report submitted by a citizen."""
    report_id: str
    image_path: Optional[str]
    description: str
    location: str
    latitude: Optional[float]
    longitude: Optional[float]
    timestamp: datetime
    reporter_id: Optional[str]  # Anonymous if None
    verified: bool = False
    verification_result: Optional[Dict] = None
    merged_with: Optional[str] = None  # event_id if merged
    trust_score: int = 40  # Base citizen trust score


class ImageVerifier:
    """Verifies disaster images using Gemini Vision."""
    
    def __init__(self):
        self.model = genai.GenerativeModel(VISION_MODEL)
    
    async def verify_image(self, image_path: str, claimed_disaster: str = "") -> Dict:
        """
        Analyze an image to verify if it shows a disaster.
        
        Returns verification result with:
        - is_disaster: bool
        - disaster_type: detected type
        - confidence: 0-100
        - description: what the image shows
        - safety_concerns: any immediate dangers visible
        - is_recent: whether image appears recent (not old/recycled)
        """
        try:
            # Read image file
            with open(image_path, "rb") as f:
                image_data = f.read()
            
            # Encode for Gemini
            image_base64 = base64.b64encode(image_data).decode("utf-8")
            
            # Determine mime type
            ext = Path(image_path).suffix.lower()
            mime_map = {
                ".jpg": "image/jpeg",
                ".jpeg": "image/jpeg",
                ".png": "image/png",
                ".gif": "image/gif",
                ".webp": "image/webp",
            }
            mime_type = mime_map.get(ext, "image/jpeg")
            
            # Verification prompt
            prompt = f"""Analyze this image for disaster verification. Be thorough and critical.

Claimed disaster type (if any): {claimed_disaster}

Provide analysis in this exact JSON format:
{{
    "is_disaster": true/false,
    "disaster_type": "fire|flood|earthquake|cyclone|landslide|accident|building_collapse|none",
    "confidence": 0-100,
    "description": "What the image actually shows",
    "visible_damage": "Description of visible damage or emergency",
    "safety_concerns": ["list", "of", "immediate", "dangers"],
    "authenticity_check": {{
        "appears_recent": true/false,
        "possible_manipulation": true/false,
        "matches_claimed_type": true/false
    }},
    "recommended_action": "What emergency response might be needed"
}}

Be skeptical. Look for:
- Signs of image manipulation or old photos
- Whether the scene actually matches a disaster
- Specific details that indicate authenticity
- Scale and severity of the incident

Only mark is_disaster=true if you see clear evidence of an actual emergency."""
            
            # Call Gemini Vision
            response = self.model.generate_content([
                {"mime_type": mime_type, "data": image_base64},
                prompt,
            ])
            
            # Parse response
            response_text = response.text.strip()
            
            # Extract JSON from response
            import json
            import re
            
            # Try to find JSON in the response
            json_match = re.search(r'\{[\s\S]*\}', response_text)
            if json_match:
                result = json.loads(json_match.group())
                result["raw_response"] = response_text
                result["verified_at"] = datetime.now().isoformat()
                
                logger.info(f"Image verification complete: is_disaster={result.get('is_disaster')}, confidence={result.get('confidence')}")
                return result
            else:
                logger.error(f"Could not parse Gemini response: {response_text[:200]}")
                return {
                    "is_disaster": False,
                    "disaster_type": "none",
                    "confidence": 0,
                    "description": "Failed to parse verification response",
                    "error": "parse_error",
                    "raw_response": response_text,
                }
                
        except Exception as e:
            logger.error(f"Image verification failed: {e}")
            return {
                "is_disaster": False,
                "disaster_type": "none",
                "confidence": 0,
                "description": f"Verification error: {str(e)}",
                "error": str(e),
            }


class CitizenReportManager:
    """Manages citizen reports with verification and merging."""
    
    def __init__(self):
        self.image_verifier = ImageVerifier()
        self.reports: Dict[str, CitizenReport] = {}
    
    async def save_image(self, image_data: bytes, filename: str) -> str:
        """Save uploaded image and return the path."""
        # Generate unique filename
        ext = Path(filename).suffix or ".jpg"
        unique_name = f"{uuid.uuid4().hex}{ext}"
        image_path = UPLOAD_DIR / unique_name
        
        async with aiofiles.open(image_path, "wb") as f:
            await f.write(image_data)
        
        logger.info(f"Saved image: {image_path}")
        return str(image_path)
    
    async def submit_report(
        self,
        image_data: Optional[bytes],
        filename: Optional[str],
        description: str,
        location: str,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        reporter_id: Optional[str] = None,
    ) -> Dict:
        """
        Submit a citizen report with optional image.
        
        Returns the report with verification results.
        """
        report_id = f"citizen_{uuid.uuid4().hex[:8]}"
        
        # Save image if provided
        image_path = None
        if image_data and filename:
            image_path = await self.save_image(image_data, filename)
        
        # Geocode if no coordinates
        if latitude is None or longitude is None:
            lat, lon = geocode_location(location)
            latitude = latitude or lat
            longitude = longitude or lon
        
        # Create report
        report = CitizenReport(
            report_id=report_id,
            image_path=image_path,
            description=description,
            location=location,
            latitude=latitude,
            longitude=longitude,
            timestamp=datetime.now(),
            reporter_id=reporter_id,
        )
        
        # Verify image if provided
        if image_path:
            verification = await self.image_verifier.verify_image(image_path, description)
            report.verification_result = verification
            report.verified = verification.get("is_disaster", False)
            
            # Adjust trust score based on verification
            if report.verified:
                confidence = verification.get("confidence", 50)
                if confidence >= 80:
                    report.trust_score = 70
                elif confidence >= 60:
                    report.trust_score = 55
            else:
                report.trust_score = 20
        
        # Try to merge with existing incidents
        merge_result = await self.try_merge_with_existing(report)
        
        # Store report
        self.reports[report_id] = report
        
        return {
            "report_id": report_id,
            "verified": report.verified,
            "trust_score": report.trust_score,
            "verification_result": report.verification_result,
            "merge_result": merge_result,
            "location": {
                "name": location,
                "latitude": latitude,
                "longitude": longitude,
            },
            "timestamp": report.timestamp.isoformat(),
        }
    
    async def try_merge_with_existing(self, report: CitizenReport) -> Optional[Dict]:
        """
        Try to merge citizen report with existing incidents.
        
        Uses spatiotemporal analysis to find matching events.
        """
        if not report.verified:
            return None
        
        # Convert report to ClusterableEvent for comparison
        report_event = ClusterableEvent(
            event_id=report.report_id,
            disaster_type=report.verification_result.get("disaster_type", "unknown"),
            location=report.location,
            description=report.description,
            timestamp=report.timestamp,
            latitude=report.latitude,
            longitude=report.longitude,
            source_type="citizen",
            confidence=report.trust_score,
        )
        
        # Check against existing clusters
        for cluster in event_clusterer.clusters:
            should_merge, details = should_merge_events(cluster.primary_event, report_event)
            
            if should_merge:
                cluster.add_event(report_event, details)
                report.merged_with = cluster.cluster_id
                
                logger.info(f"Merged citizen report {report.report_id} with cluster {cluster.cluster_id}")
                
                return {
                    "merged": True,
                    "cluster_id": cluster.cluster_id,
                    "merge_confidence": details["merge_confidence"],
                    "new_cluster_confidence": cluster.combined_confidence,
                }
        
        return {"merged": False, "reason": "No matching incidents found"}
    
    async def verify_image_only(self, image_data: bytes, filename: str, claimed_type: str = "") -> Dict:
        """Verify an image without creating a full report."""
        image_path = await self.save_image(image_data, filename)
        result = await self.image_verifier.verify_image(image_path, claimed_type)
        
        # Clean up temp file
        try:
            os.remove(image_path)
        except:
            pass
        
        return result
    
    def get_nearby_reports(
        self,
        latitude: float,
        longitude: float,
        radius_km: float = 5.0,
    ) -> List[Dict]:
        """Get citizen reports near a location."""
        target = GeoPoint(latitude, longitude)
        nearby = []
        
        for report in self.reports.values():
            if report.latitude and report.longitude:
                point = GeoPoint(report.latitude, report.longitude)
                distance = haversine_distance(target, point)
                
                if distance <= radius_km:
                    nearby.append({
                        "report_id": report.report_id,
                        "description": report.description,
                        "location": report.location,
                        "distance_km": round(distance, 2),
                        "verified": report.verified,
                        "trust_score": report.trust_score,
                        "timestamp": report.timestamp.isoformat(),
                    })
        
        # Sort by distance
        nearby.sort(key=lambda x: x["distance_km"])
        return nearby


# Singleton instance
citizen_manager = CitizenReportManager()
