"""
CrisisOS 2.0 - Trust Pyramid Verification System

Source credibility weights based on Trust Pyramid:
- OFFICIAL (government, emergency services): 1.0
- NEWS (verified news agencies): 0.85
- SOCIAL (social media with verification): 0.6
- CITIZEN (citizen reports): 0.4
"""

from enum import Enum
from typing import Dict, List, Optional
from dataclasses import dataclass
import re


class SourceType(Enum):
    OFFICIAL = "official"
    NEWS = "news"
    SOCIAL = "social"
    CITIZEN = "citizen"
    UNKNOWN = "unknown"


# Trust Pyramid weights
TRUST_WEIGHTS: Dict[SourceType, float] = {
    SourceType.OFFICIAL: 1.0,
    SourceType.NEWS: 0.85,
    SourceType.SOCIAL: 0.6,
    SourceType.CITIZEN: 0.4,
    SourceType.UNKNOWN: 0.3,
}


# Domain patterns for source classification
OFFICIAL_DOMAINS = [
    r"\.gov\.",
    r"\.gov$",
    r"ndrf\.gov",
    r"imd\.gov",
    r"mha\.gov",
    r"police\.",
    r"fire\.gov",
    r"fema\.gov",
    r"emergency",
    r"disaster\.gov",
    r"met\.ie",
    r"weather\.gov",
]

NEWS_DOMAINS = [
    r"reuters\.com",
    r"apnews\.com",
    r"bbc\.(com|co\.uk)",
    r"cnn\.com",
    r"ndtv\.com",
    r"timesofindia",
    r"hindustantimes",
    r"thehindu\.com",
    r"indianexpress",
    r"news18\.com",
    r"indiatoday",
    r"theguardian\.com",
    r"nytimes\.com",
    r"washingtonpost\.com",
    r"aljazeera\.com",
]

SOCIAL_DOMAINS = [
    r"twitter\.com",
    r"x\.com",
    r"reddit\.com",
    r"facebook\.com",
    r"instagram\.com",
    r"youtube\.com",
]


@dataclass
class SourceInfo:
    url: str
    source_type: SourceType
    trust_weight: float
    domain: str


def classify_source(url: str) -> SourceType:
    """Classify a source URL into its trust category."""
    url_lower = url.lower()
    
    # Check official sources first (highest trust)
    for pattern in OFFICIAL_DOMAINS:
        if re.search(pattern, url_lower):
            return SourceType.OFFICIAL
    
    # Check news sources
    for pattern in NEWS_DOMAINS:
        if re.search(pattern, url_lower):
            return SourceType.NEWS
    
    # Check social media
    for pattern in SOCIAL_DOMAINS:
        if re.search(pattern, url_lower):
            return SourceType.SOCIAL
    
    # Default to unknown
    return SourceType.UNKNOWN


def get_source_info(url: str) -> SourceInfo:
    """Get full source information including trust weight."""
    source_type = classify_source(url)
    
    # Extract domain from URL
    domain_match = re.search(r"https?://(?:www\.)?([^/]+)", url)
    domain = domain_match.group(1) if domain_match else url
    
    return SourceInfo(
        url=url,
        source_type=source_type,
        trust_weight=TRUST_WEIGHTS[source_type],
        domain=domain,
    )


def calculate_trust_score(sources: List[str], base_confidence: int = 30) -> Dict:
    """
    Calculate weighted trust score based on Trust Pyramid.
    
    Returns:
        Dict with trust_score, weighted_sources, source_breakdown
    """
    if not sources:
        return {
            "trust_score": base_confidence,
            "weighted_sources": 0,
            "source_breakdown": {},
            "highest_trust_source": None,
        }
    
    source_infos = [get_source_info(url) for url in sources]
    
    # Calculate weighted source count
    weighted_sum = sum(info.trust_weight for info in source_infos)
    
    # Source breakdown by type
    breakdown = {}
    for stype in SourceType:
        count = sum(1 for info in source_infos if info.source_type == stype)
        if count > 0:
            breakdown[stype.value] = count
    
    # Find highest trust source
    highest = max(source_infos, key=lambda x: x.trust_weight) if source_infos else None
    
    # Calculate trust score
    # Base: 30, +15 per weighted source (capped at 95)
    trust_score = min(95, base_confidence + int(weighted_sum * 15))
    
    # Bonus for official sources
    official_count = breakdown.get("official", 0)
    if official_count > 0:
        trust_score = min(98, trust_score + official_count * 10)
    
    return {
        "trust_score": trust_score,
        "weighted_sources": round(weighted_sum, 2),
        "source_breakdown": breakdown,
        "highest_trust_source": highest.source_type.value if highest else None,
        "sources_detail": [
            {
                "url": info.url,
                "type": info.source_type.value,
                "weight": info.trust_weight,
                "domain": info.domain,
            }
            for info in source_infos
        ],
    }


def get_verification_status(trust_score: int, source_count: int) -> str:
    """Determine verification status based on trust score and sources."""
    if trust_score >= 85 and source_count >= 3:
        return "VERIFIED"
    elif trust_score >= 70 and source_count >= 2:
        return "LIKELY"
    elif trust_score >= 50:
        return "UNVERIFIED"
    else:
        return "SUSPICIOUS"


def merge_trust_scores(existing: Dict, new_sources: List[str]) -> Dict:
    """Merge new sources into existing trust calculation."""
    existing_sources = [s["url"] for s in existing.get("sources_detail", [])]
    all_sources = list(set(existing_sources + new_sources))
    return calculate_trust_score(all_sources)
