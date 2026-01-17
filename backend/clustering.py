"""
CrisisOS 2.0 - Advanced Clustering Module

Implements:
- Haversine distance calculation for geospatial deduplication
- Temporal clustering (events within time window)
- Semantic clustering (similar incident descriptions)
- Spatiotemporal merging for citizen reports
"""

import math
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass
from rapidfuzz import fuzz

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Clustering configuration
SPATIAL_THRESHOLD_KM = 2.0  # Events within 2km are considered same location
TEMPORAL_THRESHOLD_MINUTES = 30  # Events within 30 minutes are related
SEMANTIC_THRESHOLD = 75  # Fuzzy match threshold for description similarity


@dataclass
class GeoPoint:
    """Geographic point with latitude and longitude."""
    latitude: float
    longitude: float
    
    def is_valid(self) -> bool:
        return -90 <= self.latitude <= 90 and -180 <= self.longitude <= 180


@dataclass
class ClusterableEvent:
    """Event that can be clustered."""
    event_id: str
    disaster_type: str
    location: str
    description: str
    timestamp: datetime
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    source_type: str = "unknown"
    confidence: int = 50
    
    def has_coordinates(self) -> bool:
        return self.latitude is not None and self.longitude is not None


def haversine_distance(point1: GeoPoint, point2: GeoPoint) -> float:
    """
    Calculate the great-circle distance between two points on Earth.
    
    Uses the Haversine formula for accuracy at all distances.
    
    Args:
        point1: First geographic point
        point2: Second geographic point
    
    Returns:
        Distance in kilometers
    """
    R = 6371  # Earth's radius in kilometers
    
    lat1_rad = math.radians(point1.latitude)
    lat2_rad = math.radians(point2.latitude)
    delta_lat = math.radians(point2.latitude - point1.latitude)
    delta_lon = math.radians(point2.longitude - point1.longitude)
    
    a = (math.sin(delta_lat / 2) ** 2 +
         math.cos(lat1_rad) * math.cos(lat2_rad) *
         math.sin(delta_lon / 2) ** 2)
    
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    return R * c


def are_spatially_close(
    event1: ClusterableEvent,
    event2: ClusterableEvent,
    threshold_km: float = SPATIAL_THRESHOLD_KM,
) -> Tuple[bool, Optional[float]]:
    """
    Check if two events are spatially close using Haversine distance.
    
    Returns:
        Tuple of (is_close, distance_km or None if no coordinates)
    """
    if not event1.has_coordinates() or not event2.has_coordinates():
        # Fall back to string matching for location
        location_similarity = fuzz.token_set_ratio(event1.location, event2.location)
        return location_similarity >= 80, None
    
    point1 = GeoPoint(event1.latitude, event2.longitude)
    point2 = GeoPoint(event2.latitude, event2.longitude)
    
    distance = haversine_distance(point1, point2)
    return distance <= threshold_km, distance


def are_temporally_close(
    event1: ClusterableEvent,
    event2: ClusterableEvent,
    threshold_minutes: int = TEMPORAL_THRESHOLD_MINUTES,
) -> Tuple[bool, float]:
    """
    Check if two events occurred within a time window.
    
    Returns:
        Tuple of (is_close, time_difference_minutes)
    """
    time_diff = abs((event1.timestamp - event2.timestamp).total_seconds() / 60)
    return time_diff <= threshold_minutes, time_diff


def are_semantically_similar(
    event1: ClusterableEvent,
    event2: ClusterableEvent,
    threshold: int = SEMANTIC_THRESHOLD,
) -> Tuple[bool, int]:
    """
    Check if two events have similar descriptions using fuzzy matching.
    
    Returns:
        Tuple of (is_similar, similarity_score)
    """
    # Compare disaster types first
    if event1.disaster_type.lower() != event2.disaster_type.lower():
        return False, 0
    
    # Fuzzy match descriptions
    desc_similarity = fuzz.token_set_ratio(event1.description, event2.description)
    
    # Also check location similarity
    loc_similarity = fuzz.token_set_ratio(event1.location, event2.location)
    
    # Combined similarity
    combined = (desc_similarity * 0.6) + (loc_similarity * 0.4)
    
    return combined >= threshold, int(combined)


def should_merge_events(
    event1: ClusterableEvent,
    event2: ClusterableEvent,
) -> Tuple[bool, Dict]:
    """
    Determine if two events should be merged based on spatiotemporal analysis.
    
    Uses a weighted scoring system considering:
    - Spatial proximity (Haversine distance)
    - Temporal proximity
    - Semantic similarity
    
    Returns:
        Tuple of (should_merge, merge_details)
    """
    details = {
        "spatial_match": False,
        "temporal_match": False,
        "semantic_match": False,
        "distance_km": None,
        "time_diff_minutes": None,
        "similarity_score": 0,
        "merge_confidence": 0,
    }
    
    # Check spatial proximity
    spatial_close, distance = are_spatially_close(event1, event2)
    details["spatial_match"] = spatial_close
    details["distance_km"] = distance
    
    # Check temporal proximity
    temporal_close, time_diff = are_temporally_close(event1, event2)
    details["temporal_match"] = temporal_close
    details["time_diff_minutes"] = time_diff
    
    # Check semantic similarity
    semantic_similar, similarity = are_semantically_similar(event1, event2)
    details["semantic_match"] = semantic_similar
    details["similarity_score"] = similarity
    
    # Calculate merge confidence
    score = 0
    if spatial_close:
        score += 40
    if temporal_close:
        score += 30
    if semantic_similar:
        score += 30
    
    details["merge_confidence"] = score
    
    # Events should merge if score >= 70 (at least 2 of 3 criteria met)
    should_merge = score >= 70
    
    return should_merge, details


class EventCluster:
    """A cluster of related events."""
    
    def __init__(self, primary_event: ClusterableEvent):
        self.cluster_id = primary_event.event_id
        self.primary_event = primary_event
        self.related_events: List[ClusterableEvent] = []
        self.total_sources = 1
        self.combined_confidence = primary_event.confidence
        
    def add_event(self, event: ClusterableEvent, merge_details: Dict):
        """Add a related event to this cluster."""
        self.related_events.append(event)
        self.total_sources += 1
        
        # Boost confidence based on merge quality
        confidence_boost = merge_details["merge_confidence"] // 10
        self.combined_confidence = min(98, self.combined_confidence + confidence_boost)
        
    def get_best_coordinates(self) -> Tuple[Optional[float], Optional[float]]:
        """Get the best available coordinates from cluster events."""
        # Prefer primary event coordinates
        if self.primary_event.has_coordinates():
            return self.primary_event.latitude, self.primary_event.longitude
        
        # Check related events
        for event in self.related_events:
            if event.has_coordinates():
                return event.latitude, event.longitude
        
        return None, None
    
    def to_dict(self) -> Dict:
        return {
            "cluster_id": self.cluster_id,
            "primary_event": {
                "event_id": self.primary_event.event_id,
                "disaster_type": self.primary_event.disaster_type,
                "location": self.primary_event.location,
                "description": self.primary_event.description,
                "timestamp": self.primary_event.timestamp.isoformat(),
            },
            "related_count": len(self.related_events),
            "total_sources": self.total_sources,
            "combined_confidence": self.combined_confidence,
            "coordinates": self.get_best_coordinates(),
        }


class EventClusterer:
    """Clusters events based on spatiotemporal and semantic similarity."""
    
    def __init__(self):
        self.clusters: List[EventCluster] = []
    
    def cluster_events(self, events: List[ClusterableEvent]) -> List[EventCluster]:
        """
        Cluster a list of events using spatiotemporal merging.
        
        Algorithm:
        1. Sort events by timestamp
        2. For each event, check if it belongs to an existing cluster
        3. If yes, merge into that cluster
        4. If no, create a new cluster
        """
        if not events:
            return []
        
        # Sort by timestamp
        sorted_events = sorted(events, key=lambda e: e.timestamp)
        self.clusters = []
        
        for event in sorted_events:
            merged = False
            
            # Try to merge with existing clusters
            for cluster in self.clusters:
                should_merge, details = should_merge_events(cluster.primary_event, event)
                
                if should_merge:
                    cluster.add_event(event, details)
                    merged = True
                    logger.info(f"Merged event {event.event_id} into cluster {cluster.cluster_id}")
                    break
            
            # Create new cluster if not merged
            if not merged:
                new_cluster = EventCluster(event)
                self.clusters.append(new_cluster)
                logger.info(f"Created new cluster for event {event.event_id}")
        
        logger.info(f"Clustered {len(events)} events into {len(self.clusters)} clusters")
        return self.clusters
    
    def find_nearby_events(
        self,
        latitude: float,
        longitude: float,
        radius_km: float = 5.0,
        events: Optional[List[ClusterableEvent]] = None,
    ) -> List[ClusterableEvent]:
        """Find events within a radius of a point."""
        target = GeoPoint(latitude, longitude)
        nearby = []
        
        events_to_search = events or [c.primary_event for c in self.clusters]
        
        for event in events_to_search:
            if event.has_coordinates():
                point = GeoPoint(event.latitude, event.longitude)
                distance = haversine_distance(target, point)
                if distance <= radius_km:
                    nearby.append(event)
        
        return nearby


# Geocoding helper (using approximate coords for Indian cities - Maharashtra focus)
CITY_COORDINATES = {
    # Maharashtra cities
    "mumbai": (19.0760, 72.8777),
    "pune": (18.5204, 73.8567),
    "nagpur": (21.1458, 79.0882),
    "thane": (19.2183, 72.9781),
    "nashik": (19.9975, 73.7898),
    "aurangabad": (19.8762, 75.3433),
    "solapur": (17.6599, 75.9064),
    "kolhapur": (16.7050, 74.2433),
    "sangli": (16.8544, 74.5815),
    "ratnagiri": (16.9902, 73.3120),
    "raigad": (18.5158, 73.1822),
    "satara": (17.6805, 74.0183),
    "latur": (18.4088, 76.5604),
    "ahmednagar": (19.0948, 74.7480),
    "nanded": (19.1383, 77.3210),
    "parbhani": (19.2704, 76.7747),
    "jalgaon": (21.0077, 75.5626),
    "akola": (20.7002, 77.0082),
    "amravati": (20.9320, 77.7523),
    "chandrapur": (19.9615, 79.2961),
    "wardha": (20.7453, 78.6022),
    "beed": (18.9891, 75.7601),
    "osmanabad": (18.1860, 76.0443),
    "yavatmal": (20.3888, 78.1204),
    "buldhana": (20.5293, 76.1842),
    "washim": (20.1073, 77.1315),
    "hingoli": (19.7173, 77.1501),
    "gondiya": (21.4624, 80.1962),
    "bhandara": (21.1669, 79.6590),
    "gadchiroli": (20.1057, 80.0028),
    # Mumbai areas
    "dadar": (19.0178, 72.8478),
    "andheri": (19.1136, 72.8697),
    "bandra": (19.0544, 72.8406),
    "borivali": (19.2307, 72.8567),
    "goregaon": (19.1549, 72.8493),
    "malad": (19.1874, 72.8484),
    "kandivali": (19.2045, 72.8525),
    "powai": (19.1176, 72.9060),
    "mulund": (19.1724, 72.9570),
    "navi mumbai": (19.0330, 73.0297),
    "panvel": (18.9894, 73.1175),
    "kalyan": (19.2437, 73.1355),
    "dombivli": (19.2183, 73.0867),
    "virar": (19.4559, 72.8118),
    "vasai": (19.3919, 72.8397),
    # Other major Indian cities
    "delhi": (28.6139, 77.2090),
    "bangalore": (12.9716, 77.5946),
    "chennai": (13.0827, 80.2707),
    "kolkata": (22.5726, 88.3639),
    "hyderabad": (17.3850, 78.4867),
    "ahmedabad": (23.0225, 72.5714),
    "jaipur": (26.9124, 75.7873),
    "lucknow": (26.8467, 80.9462),
    "surat": (21.1702, 72.8311),
    "kanpur": (26.4499, 80.3319),
    "patna": (25.5941, 85.1376),
    "indore": (22.7196, 75.8577),
    "bhopal": (23.2599, 77.4126),
    "goa": (15.2993, 74.1240),
    "panaji": (15.4909, 73.8278),
    "maharashtra": (19.7515, 75.7139),
    "india": (20.5937, 78.9629),
}


def geocode_location(location: str) -> Tuple[Optional[float], Optional[float]]:
    """
    Simple geocoding for Indian cities.
    Returns (latitude, longitude) or (None, None) if not found.
    """
    location_lower = location.lower()
    
    for city, coords in CITY_COORDINATES.items():
        if city in location_lower:
            return coords
    
    return None, None


# Singleton clusterer instance
event_clusterer = EventClusterer()
