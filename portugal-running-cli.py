#!/usr/bin/env python3
"""
Portugal Running Events CLI

A unified command-line interface for extracting, enriching, and processing
running events from the Portugal Running website.

This tool consolidates all functionality from the previous shell and Python
scripts into a single, maintainable CLI application with subcommands.
"""

import argparse
import json
import logging
import sys
import os
import hashlib
import time
import subprocess
import re
import urllib.parse
import urllib.request
from pathlib import Path
from datetime import datetime
from typing import Optional, List, Dict, Any, Union, Tuple
from dataclasses import dataclass, asdict, field
from enum import Enum


# Configure logging
logger = logging.getLogger(__name__)


# ============================================================================
# Data Classes
# ============================================================================

@dataclass
class Coordinates:
    """Geographic coordinates."""
    lat: float
    lon: float
    
    def to_dict(self) -> Dict[str, float]:
        return asdict(self)


@dataclass
class EventLocation:
    """Location information for an event."""
    name: str
    country: str
    locality: str
    coordinates: Optional[Coordinates] = None
    
    def to_dict(self) -> Dict[str, Any]:
        result = {
            "name": self.name,
            "country": self.country,
            "locality": self.locality
        }
        if self.coordinates:
            result["coordinates"] = self.coordinates.to_dict()
        return result


@dataclass
class IcsData:
    """Structured data extracted from ICS calendar files."""
    location: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    description: Optional[str] = None
    summary: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class Event:
    """Complete event data structure."""
    event_id: int
    event_name: str
    event_location: str
    event_coordinates: Optional[Coordinates]
    event_country: str
    event_locality: str
    event_distances: List[int]
    event_types: List[str]
    event_images: List[str]
    event_start_date: str
    event_end_date: str
    event_circuit: List[Any]
    event_description: str
    description_short: Optional[str]
    
    def to_dict(self) -> Dict[str, Any]:
        result = asdict(self)
        if self.event_coordinates:
            result["event_coordinates"] = self.event_coordinates.to_dict()
        return result


@dataclass
class CacheConfig:
    """Cache directory configuration."""
    pages_dir: Path = field(default_factory=lambda: Path("pages"))
    events_dir: Path = field(default_factory=lambda: Path("event_data_cache"))
    geocoding_dir: Path = field(default_factory=lambda: Path("geocoding_cache"))
    descriptions_dir: Path = field(default_factory=lambda: Path("description_cache"))
    ics_dir: Path = field(default_factory=lambda: Path("ics_cache"))
    taxonomy_dir: Path = field(default_factory=lambda: Path("taxonomy_cache"))
    wp_cache_dir: Path = field(default_factory=lambda: Path("wp_cache"))
    media_dir: Path = field(default_factory=lambda: Path("media"))
    
    def ensure_directories(self):
        """Create all cache directories if they don't exist."""
        for attr_name in dir(self):
            if attr_name.endswith('_dir') and not attr_name.startswith('_'):
                dir_path = getattr(self, attr_name)
                dir_path.mkdir(exist_ok=True)


class EventType(Enum):
    """Canonical event types."""
    MARATHON = "marathon"
    HALF_MARATHON = "half-marathon"
    TEN_K = "10k"
    FIVE_K = "5k"
    RUN = "run"
    TRAIL = "trail"
    WALK = "walk"
    CROSS_COUNTRY = "cross-country"
    SAINT_SILVESTER = "saint-silvester"
    KIDS = "kids"
    RELAY = "relay"


# Distance constants in meters
DISTANCES = {
    EventType.MARATHON: 42195,
    EventType.HALF_MARATHON: 21097,
    EventType.TEN_K: 10000,
    EventType.FIVE_K: 5000,
}


# ============================================================================
# Cache Management
# ============================================================================

def get_cache_key(data: str, prefix: str = "") -> str:
    """Generate MD5 cache key from data."""
    cache_input = f"{prefix}:{data}" if prefix else data
    return hashlib.md5(cache_input.encode()).hexdigest()


def read_cache(cache_path: Path) -> Optional[Any]:
    """Read JSON data from cache file."""
    if not cache_path.exists():
        return None
    
    try:
        with open(cache_path, 'r', encoding='utf-8') as f:
            content = f.read().strip()
            if content == "null":
                return None
            return json.loads(content)
    except (json.JSONDecodeError, IOError) as e:
        logger.warning(f"Cache read error for {cache_path}: {e}")
        cache_path.unlink(missing_ok=True)
        return None


def write_cache(cache_path: Path, data: Any) -> None:
    """Write JSON data to cache file."""
    try:
        cache_path.parent.mkdir(parents=True, exist_ok=True)
        with open(cache_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    except IOError as e:
        logger.error(f"Cache write error for {cache_path}: {e}")
        raise


def clear_cache(cache_dir: Path, pattern: str = "*") -> int:
    """Clear cache files matching pattern. Returns count of files removed."""
    count = 0
    for file_path in cache_dir.glob(pattern):
        if file_path.is_file():
            file_path.unlink()
            count += 1
    return count


def get_cache_stats(cache_dir: Path) -> Dict[str, Any]:
    """Get statistics about cache directory."""
    if not cache_dir.exists():
        return {"exists": False, "files": 0, "size": 0}
    
    files = list(cache_dir.glob("*"))
    total_size = sum(f.stat().st_size for f in files if f.is_file())
    
    return {
        "exists": True,
        "files": len([f for f in files if f.is_file()]),
        "size": total_size,
        "size_mb": round(total_size / 1024 / 1024, 2)
    }


# ============================================================================
# HTTP Client Functions
# ============================================================================

def http_get(url: str, timeout: int = 30) -> Tuple[int, str]:
    """
    Perform HTTP GET request.
    Returns (status_code, content).
    """
    try:
        req = urllib.request.Request(url, headers={
            'User-Agent': 'Mozilla/5.0 (compatible; PortugalRunningCLI/1.0)'
        })
        
        with urllib.request.urlopen(req, timeout=timeout) as response:
            content = response.read().decode('utf-8')
            return response.status, content
            
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode('utf-8', errors='replace')
    except urllib.error.URLError as e:
        logger.error(f"HTTP|Request failed|{url}|{str(e)}")
        raise
    except Exception as e:
        logger.error(f"HTTP|Unexpected error|{url}|{str(e)}")
        raise


def cached_get(url: str, cache_path: Path, timeout: int = 30, 
               force_refresh: bool = False) -> Optional[str]:
    """
    Perform cached HTTP GET request.
    Returns content string or None on error.
    """
    # Check cache first
    if not force_refresh and cache_path.exists():
        logger.debug(f"Cache hit for {url}")
        with open(cache_path, 'r', encoding='utf-8') as f:
            return f.read()
    
    # Fetch from network
    logger.debug(f"Fetching {url}")
    try:
        status, content = http_get(url, timeout)
        if status == 200:
            write_cache(cache_path, content)
            return content
        else:
            logger.error(f"HTTP|Bad status|{url}|{status}")
            return None
    except Exception as e:
        logger.error(f"HTTP|Request failed|{url}|{str(e)}")
        return None


def download_file(url: str, output_path: Path, timeout: int = 30) -> bool:
    """
    Download file from URL to path.
    Returns True on success.
    """
    if output_path.exists():
        logger.debug(f"File already exists: {output_path}")
        return True
    
    try:
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        req = urllib.request.Request(url, headers={
            'User-Agent': 'Mozilla/5.0 (compatible; PortugalRunningCLI/1.0)'
        })
        
        with urllib.request.urlopen(req, timeout=timeout) as response:
            with open(output_path, 'wb') as f:
                f.write(response.read())
        
        logger.debug(f"Downloaded {url} to {output_path}")
        return True
        
    except Exception as e:
        logger.error(f"DOWNLOAD|Failed|{url}|{str(e)}")
        output_path.unlink(missing_ok=True)
        return False


# ============================================================================
# API Clients
# ============================================================================

class WordPressClient:
    """Client for WordPress REST API and EventON endpoints."""
    
    def __init__(self, base_url: str, cache_config: CacheConfig):
        self.base_url = base_url
        self.cache_config = cache_config
        self.api_base = f"{base_url}/wp-json/wp/v2"
        
    def fetch_events_page(self, page: int, use_cache: bool = True) -> Optional[List[Dict]]:
        """Fetch a page of events from WordPress API."""
        cache_path = self.cache_config.pages_dir / f"events_page_{page}.json"
        
        if use_cache and cache_path.exists():
            return read_cache(cache_path)
        
        url = f"{self.api_base}/ajde_events?page={page}"
        try:
            status, content = http_get(url)
            if status == 200:
                data = json.loads(content)
                write_cache(cache_path, data)
                return data
            else:
                logger.error(f"API|Bad status|page {page}|{status}")
                return None
        except json.JSONDecodeError as e:
            logger.error(f"JSON|Invalid response|page {page}|{str(e)}")
            return None
        except Exception as e:
            logger.error(f"API|Request failed|page {page}|{str(e)}")
            return None
    
    def fetch_event_details(self, event_id: int, use_cache: bool = True, 
                           skip_geocoding: bool = False, skip_descriptions: bool = False,
                           skip_images: bool = False) -> Optional[Dict]:
        """Fetch detailed event data with ICS processing."""
        cache_path = self.cache_config.events_dir / f"event_{event_id}.json"
        
        if use_cache and cache_path.exists():
            return read_cache(cache_path)
        
        logger.debug(f"Fetching data for event {event_id}")
        
        try:
            # Fetch WordPress event data
            wp_data = self._fetch_wordpress_event(event_id)
            if not wp_data:
                return None
            
            # Fetch ICS calendar data
            ics_data = self._fetch_ics_data(event_id)
            
            # Geocode location if available and not skipped
            geo_data = None
            if not skip_geocoding and ics_data and ics_data.get('location'):
                geo_data = self._geocode_location(ics_data['location'])
            
            # Generate short description if not skipped
            short_description = None
            if not skip_descriptions and ics_data and ics_data.get('description'):
                short_description = self._generate_description(ics_data['description'])
            
            # Prepare result in the expected format
            result = {
                "event_id": event_id,
                "ics_data": ics_data,
                "geo_data": geo_data,
                "short_description": short_description,
                "images": [],
                "fetched_at": time.time()
            }
            
            # Cache the result
            write_cache(cache_path, result)
            return result
            
        except Exception as e:
            logger.error(f"EVENT|Fetch error|{event_id}|{str(e)}")
            return None
    
    def _fetch_wordpress_event(self, event_id: int) -> Optional[Dict]:
        """Fetch raw event data from WordPress API."""
        url = f"{self.api_base}/ajde_events/{event_id}"
        try:
            status, content = http_get(url)
            if status == 200:
                return json.loads(content)
            else:
                logger.error(f"WORDPRESS|Bad status|{event_id}|{status}")
                return None
        except json.JSONDecodeError as e:
            logger.error(f"JSON|Invalid response|{event_id}|{str(e)}")
            return None
        except Exception as e:
            logger.error(f"WORDPRESS|Request failed|{event_id}|{str(e)}")
            return None
    
    def _fetch_ics_data(self, event_id: int) -> Optional[Dict]:
        """Fetch and parse ICS calendar data."""
        cache_path = self.cache_config.ics_dir / f"event_{event_id}.ics"
        
        # Check cache first
        if cache_path.exists():
            try:
                with open(cache_path, 'r', encoding='utf-8') as f:
                    ics_content = f.read()
            except UnicodeDecodeError:
                # Try different encodings for existing cache files
                encodings = ['latin-1', 'cp1252', 'iso-8859-1']
                ics_content = None
                for encoding in encodings:
                    try:
                        with open(cache_path, 'r', encoding=encoding) as f:
                            ics_content = f.read()
                        break
                    except UnicodeDecodeError:
                        continue
                if ics_content is None:
                    logger.error(f"ICS|Encoding error|{event_id}")
                    return None
        else:
            # Fetch from network
            url = f"http://www.portugalrunning.com/export-events/{event_id}_0/"
            try:
                status, content = http_get(url)
                if status != 200:
                    logger.error(f"ICS|Bad status|{event_id}|{status}")
                    return None
                
                ics_content = content
                
                # Validate ICS format
                if not ics_content.strip() or "BEGIN:VCALENDAR" not in ics_content:
                    logger.warning(f"ICS|Invalid format|{event_id}")
                    return None
                
                # Cache the raw ICS content
                cache_path.parent.mkdir(exist_ok=True)
                with open(cache_path, 'w', encoding='utf-8') as f:
                    f.write(ics_content)
                    
            except Exception as e:
                logger.error(f"ICS|Fetch error|{event_id}|{str(e)}")
                return None
        
        # Parse the ICS content
        return self._parse_ics_content(ics_content)
    
    def _parse_ics_content(self, ics_content: str) -> Optional[Dict]:
        """Parse ICS content and extract event data."""
        if not ics_content or "BEGIN:VCALENDAR" not in ics_content:
            return None
        
        # Clean the content
        ics_content = ics_content.replace('\x00', '')
        ics_content = ''.join(c for c in ics_content if ord(c) >= 32 or c in '\n\r\t')
        
        ics_data = {}
        
        # Extract location
        location_match = re.search(r"LOCATION:(.+)", ics_content)
        if location_match:
            location = location_match.group(1).strip()
            location = location.replace("\\,", ",").replace("  ", " ")
            # Remove duplicate words
            parts = location.split()
            unique_parts = []
            for part in parts:
                if part not in unique_parts:
                    unique_parts.append(part)
            ics_data['location'] = " ".join(unique_parts)
        
        # Extract summary
        summary_match = re.search(r"SUMMARY:(.+)", ics_content)
        if summary_match:
            ics_data['summary'] = summary_match.group(1).strip()
        
        # Extract dates
        dtstart_match = re.search(r"DTSTART:(\d+)", ics_content)
        if dtstart_match:
            date_str = dtstart_match.group(1)
            if len(date_str) == 8:
                ics_data['start_date'] = f"{date_str[:4]}-{date_str[4:6]}-{date_str[6:8]}"
        
        dtend_match = re.search(r"DTEND:(\d+)", ics_content)
        if dtend_match:
            date_str = dtend_match.group(1)
            if len(date_str) == 8:
                ics_data['end_date'] = f"{date_str[:4]}-{date_str[4:6]}-{date_str[6:8]}"
        
        # Extract description
        desc_match = re.search(r"DESCRIPTION:(.+?)(?=\n[A-Z]|\nEND:)", ics_content, re.DOTALL)
        if desc_match:
            desc = (desc_match.group(1)
                   .replace("\n ", "")
                   .replace("\\n", "\n")
                   .replace("\\,", ","))
            ics_data['description'] = self._fix_encoding(desc.strip())
        
        return ics_data
    
    def _fix_encoding(self, text: str) -> str:
        """Fix common UTF-8 encoding issues."""
        if not text:
            return text
        
        # Common UTF-8 sequences that were misinterpreted as ISO-8859-1
        replacements = {
            'Ã¡': 'á', 'Ã ': 'à', 'Ã¢': 'â', 'Ã£': 'ã',
            'Ã©': 'é', 'Ãª': 'ê', 'Ã­': 'í', 'Ã³': 'ó',
            'Ã´': 'ô', 'Ãµ': 'õ', 'Ãº': 'ú', 'Ã§': 'ç',
            'Ã±': 'ñ', 'â': '"', 'â': '"', 'â': '–',
            'â': '—', 'â¢': '•', 'â¦': '…',
        }
        
        result = text
        for wrong, correct in replacements.items():
            result = result.replace(wrong, correct)
        
        # Handle specific problematic patterns
        additional_fixes = {
            'C—mara': 'Câmara', 'Dist—ncias': 'Distâncias',
            'Const—ncia': 'Constância', 'Gr—ndola': 'Grândola',
            'ORGANIZAÇÇO': 'ORGANIZAÇÃO', 'SÇO': 'SÃO',
            'EdiÃ§Ã£o': 'Edição', 'organizaÃ§Ã£o': 'organização',
        }
        
        for wrong, correct in additional_fixes.items():
            result = result.replace(wrong, correct)
            result = result.replace(wrong.lower(), correct.lower())
        
        return result
    
    def _geocode_location(self, location: str) -> Optional[Dict]:
        """Geocode location using existing geocoding logic."""
        try:
            # Get API key
            api_key = os.environ.get("GOOGLE_MAPS_API_KEY")
            if not api_key:
                try:
                    result = subprocess.run(
                        ["pass", "google-geocoding-api-key"],
                        capture_output=True,
                        text=True
                    )
                    if result.returncode == 0:
                        api_key = result.stdout.strip()
                except:
                    pass
            
            if not api_key:
                return None
            
            # Use existing geocoding client
            geocoding_client = GoogleGeocodingClient(api_key, self.cache_config)
            location_result = geocoding_client.geocode(location)
            
            if location_result:
                return {
                    "coordinates": {
                        "lat": location_result.coordinates.lat,
                        "lon": location_result.coordinates.lon
                    },
                    "display_name": location_result.name,
                    "country": location_result.country,
                    "locality": location_result.locality,
                }
            return None
            
        except Exception as e:
            logger.error(f"GEOCODING|Error|{location}|{str(e)}")
            return None
    
    def _generate_description(self, description: str) -> Optional[str]:
        """Generate short description using LLM client."""
        try:
            llm_client = LLMClient("claude-3.5-haiku", self.cache_config)
            return llm_client.generate_description(description)
        except Exception as e:
            logger.error(f"LLM|Error|{str(e)}")
            return None


class GoogleGeocodingClient:
    """Google Maps Geocoding API client with caching."""
    
    def __init__(self, api_key: str, cache_config: CacheConfig):
        self.api_key = api_key
        self.cache_config = cache_config
        self.base_url = "https://maps.googleapis.com/maps/api/geocode/json"
        self.min_request_interval = 0.1
        self.last_request_time = 0
    
    def _wait_for_rate_limit(self):
        """Enforce rate limiting between requests."""
        current_time = time.time()
        time_since_last = current_time - self.last_request_time
        if time_since_last < self.min_request_interval:
            time.sleep(self.min_request_interval - time_since_last)
        self.last_request_time = time.time()
    
    def geocode(self, location: str, use_cache: bool = True) -> Optional[EventLocation]:
        """Geocode a location string."""
        cache_key = get_cache_key(location.lower().strip(), prefix="google")
        cache_path = self.cache_config.geocoding_dir / f"{cache_key}.json"
        
        if use_cache and cache_path.exists():
            data = read_cache(cache_path)
            if data:
                return EventLocation(
                    name=data["name"],
                    country=data["country"],
                    locality=data["locality"],
                    coordinates=Coordinates(lat=data["lat"], lon=data["lon"])
                )
            return None
        
        # Rate limiting
        self._wait_for_rate_limit()
        
        # Build request
        params = {
            "address": location,
            "key": self.api_key,
            "region": "pt",
            "language": "pt"
        }
        url = f"{self.base_url}?{urllib.parse.urlencode(params)}"
        
        try:
            status, content = http_get(url)
            if status != 200:
                logger.error(f"GEOCODING|Bad status|{location}|{status}")
                return None
            
            data = json.loads(content)
            if data["status"] != "OK" or not data["results"]:
                logger.warning(f"GEOCODING|No results|{location}|{data['status']}")
                write_cache(cache_path, None)
                return None
            
            # Extract location data
            result = data["results"][0]
            location_data = {
                "name": location,
                "lat": result["geometry"]["location"]["lat"],
                "lon": result["geometry"]["location"]["lng"],
                "country": "Portugal",
                "locality": location.split(",")[0].strip()
            }
            
            # Find country and locality from address components
            for component in result["address_components"]:
                types = component["types"]
                if "country" in types:
                    location_data["country"] = component["long_name"]
                elif "locality" in types:
                    location_data["locality"] = component["long_name"]
                elif "administrative_area_level_1" in types and location_data["locality"] == location.split(",")[0].strip():
                    location_data["locality"] = component["long_name"]
            
            write_cache(cache_path, location_data)
            
            return EventLocation(
                name=location,
                country=location_data["country"],
                locality=location_data["locality"],
                coordinates=Coordinates(lat=location_data["lat"], lon=location_data["lon"])
            )
            
        except Exception as e:
            logger.error(f"GEOCODING|Error|{location}|{str(e)}")
            return None


class LLMClient:
    """Client for LLM description generation."""
    
    def __init__(self, model: str, cache_config: CacheConfig):
        self.model = model
        self.cache_config = cache_config
    
    def generate_description(self, text: str, use_cache: bool = True) -> Optional[str]:
        """Generate short description using LLM."""
        cache_key = get_cache_key(text)
        cache_path = self.cache_config.descriptions_dir / f"{cache_key}.txt"
        
        if use_cache and cache_path.exists():
            with open(cache_path, 'r', encoding='utf-8') as f:
                return f.read().strip()
        
        system_prompt = """you are a helpful llm that converts descriptions of running events into succint one line descriptions, condensing that information and outputing only the essential.
here are some examples of the outputs you should generate:
+ The world's oldest annual marathon
+ Scenic run through Central Park
+ Run along Lake Michigan
+ Challenging trail through Texas Hill Country
+ Beautiful bay views throughout the course
+ High altitude marathon with mountain views
+ Independence Day beach run
+ Extreme endurance challenge in Pacific Northwest

you should output ONLY the single line description you generate and NOTHING else.
use the available information in the description and DO NOT make up anything that isn't there.
if you say an event is a marathon or half marathon you should NOT say the distance in meters since that is redundant."""
        
        try:
            result = subprocess.run(
                ["llm", "-m", self.model, "-s", system_prompt, text],
                capture_output=True,
                text=True,
                timeout=30
            )
            
            if result.returncode == 0:
                description = result.stdout.strip()
                # Ensure cache directory exists
                cache_path.parent.mkdir(exist_ok=True)
                with open(cache_path, 'w', encoding='utf-8') as f:
                    f.write(description)
                return description
            else:
                logger.error(f"LLM|Generation failed|{result.stderr}")
                return None
                
        except subprocess.TimeoutExpired:
            logger.error("LLM|Timeout generating description")
            return None
        except Exception as e:
            logger.error(f"LLM|Error|{str(e)}")
            return None


# ============================================================================
# Core Extraction Functions
# ============================================================================

def parse_ics_data(ics_content: str) -> Optional[IcsData]:
    """Parse ICS calendar file content."""
    if not ics_content or "BEGIN:VCALENDAR" not in ics_content:
        return None
    
    ics_data = IcsData()
    
    # Extract fields using regex
    patterns = {
        "location": r"LOCATION:(.+?)(?:\r?\n|$)",
        "summary": r"SUMMARY:(.+?)(?:\r?\n|$)",
        "description": r"DESCRIPTION:(.+?)(?:\r?\n|$)",
        "start": r"DTSTART:(\d{8})",
        "end": r"DTEND:(\d{8})"
    }
    
    for field, pattern in patterns.items():
        match = re.search(pattern, ics_content, re.MULTILINE)
        if match:
            value = match.group(1).strip()
            if field == "location":
                ics_data.location = value
            elif field == "summary":
                ics_data.summary = value
            elif field == "description":
                ics_data.description = value.replace("\\n", "\n")
            elif field == "start":
                ics_data.start_date = f"{value[:4]}-{value[4:6]}-{value[6:8]}"
            elif field == "end":
                ics_data.end_date = f"{value[:4]}-{value[4:6]}-{value[6:8]}"
    
    return ics_data


def extract_distances(text: str) -> List[int]:
    """Extract running distances from text."""
    if not text:
        return []
    
    distances = []
    text_lower = text.lower()
    
    # Look for specific distance patterns
    patterns = [
        (r'(\d+)\s*km', 1000),  # X km
        (r'(\d+)\s*k\b', 1000),  # X k
        (r'(\d+)\s*metros', 1),  # X metros
        (r'(\d+)\s*m\b', 1),  # X m
        (r'(\d+),(\d+)\s*km', 1000),  # X,Y km (Portuguese decimal)
        (r'(\d+)\.(\d+)\s*km', 1000),  # X.Y km
    ]
    
    for pattern, multiplier in patterns:
        for match in re.finditer(pattern, text_lower):
            if len(match.groups()) == 2:  # Decimal number
                value = float(f"{match.group(1)}.{match.group(2)}")
            else:
                value = float(match.group(1))
            
            distance = int(value * multiplier)
            if 100 <= distance <= 200000:  # Reasonable range for running events
                distances.append(distance)
    
    # Check for standard distances
    for event_type, distance in DISTANCES.items():
        if event_type.value in text_lower:
            distances.append(distance)
    
    # Remove duplicates and sort
    return sorted(list(set(distances)))


def map_event_types(wp_types: List[str], event_data: Dict) -> Tuple[List[str], List[int]]:
    """Map WordPress event types to canonical types and extract distances."""
    # Type mapping dictionary
    type_mapping = {
        "event_type_4-corrida": EventType.RUN,
        "event_type_4-caminhada": EventType.WALK,
        "event_type_4-trail": EventType.TRAIL,
        "event_type_4-sao-silvestre": EventType.SAINT_SILVESTER,
        "event_type_4-cross": EventType.CROSS_COUNTRY,
        "event_type_4-maratona": EventType.MARATHON,
        "event_type_4-meia-maratona": EventType.HALF_MARATHON,
        "event_type_4-10km": EventType.TEN_K,
        "event_type_4-5km": EventType.FIVE_K,
        "event_type_4-estafetas": EventType.RELAY,
        "event_type_4-kids": EventType.KIDS,
    }
    
    canonical_types = []
    distances = []
    
    # Map types
    for wp_type in wp_types:
        if wp_type in type_mapping:
            canonical_type = type_mapping[wp_type]
            canonical_types.append(canonical_type.value)
            
            # Add associated distance if known
            if canonical_type in DISTANCES:
                distances.append(DISTANCES[canonical_type])
        else:
            logger.warning(f"MAPPING|Unmapped type|{wp_type}")
    
    # Extract distances from description
    description = event_data.get("description", "")
    extracted_distances = extract_distances(description)
    distances.extend(extracted_distances)
    
    # Remove duplicates
    canonical_types = list(set(canonical_types))
    distances = sorted(list(set(distances)))
    
    return canonical_types, distances


# ============================================================================
# Subcommand Handlers
# ============================================================================

def cmd_extract(args):
    """Main extraction pipeline."""
    logger.info("Starting event extraction")
    
    # Initialize components
    cache_config = CacheConfig()
    cache_config.ensure_directories()
    
    # Initialize WordPress client
    wp_client = WordPressClient("https://www.portugalrunning.com", cache_config)
    
    # Fetch all events
    events = []
    page = 1
    total_fetched = 0
    
    print(f"🔄 Fetching events (limit: {args.limit if args.limit else 'unlimited'})...")
    
    while True:
        if args.pages and page > args.pages:
            print(f"   Reached page limit ({args.pages})")
            break
        
        if args.limit and total_fetched >= args.limit:
            print(f"   Reached event limit ({args.limit})")
            break
        
        print(f"   Fetching page {page}...")
        page_data = wp_client.fetch_events_page(page)
        
        if not page_data:
            break
        
        # Check for WordPress API error
        if isinstance(page_data, dict) and "code" in page_data:
            if page_data.get("code") == "rest_post_invalid_page_number":
                logger.info(f"Reached end of pages at {page}")
                break
            else:
                logger.error(f"API error: {page_data}")
                break
        
        # Apply limit
        if args.limit:
            remaining = args.limit - total_fetched
            page_data = page_data[:remaining]
        
        events.extend(page_data)
        total_fetched += len(page_data)
        print(f"   -> Found {len(page_data)} events (total: {total_fetched})")
        
        page += 1
        time.sleep(args.delay)
    
    print(f"✅ Fetched {len(events)} total events")
    
    # Process events
    processed_events = []
    print(f"\n🔄 Processing {len(events)} events...")
    
    for i, event in enumerate(events):
        event_id = event.get("id")
        if not event_id:
            continue
        
        print(f"   Processing event {i+1}/{len(events)}: {event_id}")
        
        # Fetch detailed data
        event_data = wp_client.fetch_event_details(
            event_id,
            skip_geocoding=args.skip_geocoding,
            skip_descriptions=args.skip_descriptions,
            skip_images=args.skip_images
        )
        if not event_data:
            logger.error(f"Failed to fetch details for event {event_id}")
            continue
        
        # Process the event data
        try:
            # Extract from nested structure
            ics_data = event_data.get("ics_data", {})
            geo_data = event_data.get("geo_data", {})
            
            # Get basic info
            event_name = ics_data.get("summary", "")
            location = ics_data.get("location", "")
            description = ics_data.get("description", "")
            start_date = ics_data.get("start_date", "")
            end_date = ics_data.get("end_date", "")
            
            # Use geocoding data from event_data if available
            location_data = None
            if geo_data and geo_data.get("coordinates"):
                coords = geo_data["coordinates"]
                location_data = EventLocation(
                    name=geo_data.get("display_name", location),
                    country=geo_data.get("country", "Portugal"),
                    locality=geo_data.get("locality", ""),
                    coordinates=Coordinates(lat=coords["lat"], lon=coords["lon"])
                )
            
            # Use short description from event_data
            short_description = event_data.get("short_description")
            
            # Use existing images
            images = event_data.get("images", [])
            
            # Extract distances from description
            distances = extract_distances(description)
            
            # Map event types based on the event name and description
            canonical_types = []
            text_lower = f"{event_name} {description}".lower()
            
            if "maratona" in text_lower and "meia" not in text_lower:
                canonical_types.append(EventType.MARATHON.value)
                distances.append(DISTANCES[EventType.MARATHON])
            elif "meia" in text_lower and "maratona" in text_lower:
                canonical_types.append(EventType.HALF_MARATHON.value)
                distances.append(DISTANCES[EventType.HALF_MARATHON])
            elif "10km" in text_lower or "10 km" in text_lower:
                canonical_types.append(EventType.TEN_K.value)
                distances.append(DISTANCES[EventType.TEN_K])
            elif "5km" in text_lower or "5 km" in text_lower:
                canonical_types.append(EventType.FIVE_K.value)
                distances.append(DISTANCES[EventType.FIVE_K])
            elif "trail" in text_lower:
                canonical_types.append(EventType.TRAIL.value)
            elif "caminhada" in text_lower:
                canonical_types.append(EventType.WALK.value)
            else:
                canonical_types.append(EventType.RUN.value)
            
            # Remove duplicates
            distances = sorted(list(set(distances)))
            
            # Create processed event
            processed_event = Event(
                event_id=event_id,
                event_name=event_name,
                event_location=location,
                event_coordinates=location_data.coordinates if location_data else None,
                event_country=location_data.country if location_data else "Portugal",
                event_locality=location_data.locality if location_data else "",
                event_distances=distances,
                event_types=canonical_types,
                event_images=images,
                event_start_date=start_date,
                event_end_date=end_date,
                event_circuit=[],
                event_description=description,
                description_short=short_description
            )
            
            processed_events.append(processed_event.to_dict())
            
        except Exception as e:
            logger.error(f"Error processing event {event_id}: {e}")
            continue
    
    print(f"✅ Processed {len(processed_events)} events")
    
    # Write output
    output_path = Path(args.output)
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(processed_events, f, ensure_ascii=False, indent=2)
    
    print(f"\n✅ Saved {len(processed_events)} events to {output_path}")
    return 0


def cmd_fetch_page(args):
    """Fetch a single page of events."""
    cache_config = CacheConfig()
    cache_config.ensure_directories()
    
    wp_client = WordPressClient("https://www.portugalrunning.com", cache_config)
    
    events = wp_client.fetch_events_page(args.page, use_cache=not args.no_cache)
    
    if events is None:
        logger.error(f"Failed to fetch page {args.page}")
        return 1
    
    print(json.dumps(events, ensure_ascii=False, indent=2))
    return 0


def cmd_fetch_event(args):
    """Fetch detailed event data."""
    cache_config = CacheConfig()
    cache_config.ensure_directories()
    
    wp_client = WordPressClient("https://www.portugalrunning.com", cache_config)
    
    event_data = wp_client.fetch_event_details(args.event_id, use_cache=not args.no_cache)
    
    if event_data is None:
        logger.error(f"Failed to fetch event {args.event_id}")
        return 1
    
    # Additional enrichment if requested
    if args.include_all:
        # This would include geocoding, descriptions, etc.
        # For now, just return the basic data
        pass
    
    print(json.dumps(event_data, ensure_ascii=False, indent=2))
    return 0


def cmd_geocode(args):
    """Geocode a location."""
    cache_config = CacheConfig()
    cache_config.ensure_directories()
    
    # Get API key
    api_key = args.api_key or os.environ.get("GOOGLE_MAPS_API_KEY")
    if not api_key:
        try:
            result = subprocess.run(
                ["pass", "google-geocoding-api-key"],
                capture_output=True,
                text=True
            )
            if result.returncode == 0:
                api_key = result.stdout.strip()
        except:
            pass
    
    if not api_key:
        logger.error("No Google Maps API key found")
        return 1
    
    # Clear cache if requested
    if args.clear_cache:
        count = clear_cache(cache_config.geocoding_dir)
        print(f"Cleared {count} cache files")
        if not args.location:
            return 0
    
    if not args.location:
        logger.error("No location provided")
        return 1
    
    client = GoogleGeocodingClient(api_key, cache_config)
    result = client.geocode(args.location, use_cache=not args.no_cache)
    
    if result is None:
        logger.error(f"Failed to geocode '{args.location}'")
        return 1
    
    output = result.to_dict()
    if args.debug:
        output["cache_used"] = not args.no_cache
    
    print(json.dumps(output, ensure_ascii=False, indent=2))
    return 0


def cmd_describe(args):
    """Generate event description."""
    cache_config = CacheConfig()
    cache_config.ensure_directories()
    
    client = LLMClient(args.model, cache_config)
    description = client.generate_description(args.text, use_cache=not args.no_cache)
    
    if description is None:
        logger.error("Failed to generate description")
        return 1
    
    print(description)
    return 0


def cmd_download_image(args):
    """Download an image."""
    output_path = Path(args.output)
    
    if download_file(args.url, output_path):
        print(str(output_path))
        return 0
    else:
        logger.error(f"Failed to download {args.url}")
        return 1


def cmd_profile(args):
    """Profile extraction performance."""
    print("🔬 Profiling extraction pipeline...")
    
    # This would implement performance profiling
    # For now, just a placeholder
    print("Profile functionality not yet implemented")
    return 0


def cmd_cache(args):
    """Cache management commands."""
    cache_config = CacheConfig()
    
    if args.cache_command == "clear":
        total = 0
        if args.type:
            # Clear specific cache type
            cache_dirs = {
                "pages": cache_config.pages_dir,
                "events": cache_config.events_dir,
                "geocoding": cache_config.geocoding_dir,
                "descriptions": cache_config.descriptions_dir,
                "images": cache_config.media_dir,
            }
            if args.type in cache_dirs:
                count = clear_cache(cache_dirs[args.type])
                print(f"Cleared {count} files from {args.type} cache")
                total = count
            else:
                logger.error(f"Unknown cache type: {args.type}")
                return 1
        else:
            # Clear all caches
            for name, cache_dir in [
                ("pages", cache_config.pages_dir),
                ("events", cache_config.events_dir),
                ("geocoding", cache_config.geocoding_dir),
                ("descriptions", cache_config.descriptions_dir),
            ]:
                count = clear_cache(cache_dir)
                print(f"Cleared {count} files from {name} cache")
                total += count
        
        print(f"\n✅ Total files cleared: {total}")
        
    elif args.cache_command == "stats":
        print("📊 Cache Statistics\n")
        
        total_files = 0
        total_size = 0
        
        for name, cache_dir in [
            ("Pages", cache_config.pages_dir),
            ("Events", cache_config.events_dir),
            ("Geocoding", cache_config.geocoding_dir),
            ("Descriptions", cache_config.descriptions_dir),
            ("Images", cache_config.media_dir),
        ]:
            stats = get_cache_stats(cache_dir)
            if stats["exists"]:
                print(f"{name:.<20} {stats['files']:>6} files, {stats['size_mb']:>8.2f} MB")
                total_files += stats["files"]
                total_size += stats["size"]
            else:
                print(f"{name:.<20} (not found)")
        
        print(f"\n{'Total':.<20} {total_files:>6} files, {total_size/1024/1024:>8.2f} MB")
        
    elif args.cache_command == "list":
        cache_dirs = {
            "pages": cache_config.pages_dir,
            "events": cache_config.events_dir,
            "geocoding": cache_config.geocoding_dir,
            "descriptions": cache_config.descriptions_dir,
            "images": cache_config.media_dir,
        }
        
        if args.type and args.type in cache_dirs:
            cache_dir = cache_dirs[args.type]
            if cache_dir.exists():
                files = sorted(cache_dir.glob("*"))
                print(f"📁 {args.type} cache ({len(files)} files):\n")
                for f in files[:50]:  # Limit output
                    print(f"  {f.name}")
                if len(files) > 50:
                    print(f"  ... and {len(files) - 50} more")
            else:
                print(f"Cache directory not found: {cache_dir}")
        else:
            print("Available cache types: pages, events, geocoding, descriptions, images")
    
    return 0


# ============================================================================
# Main CLI Setup
# ============================================================================

def setup_logging(level: str):
    """Configure logging based on level."""
    numeric_level = getattr(logging, level.upper(), None)
    if not isinstance(numeric_level, int):
        raise ValueError(f'Invalid log level: {level}')
    
    logging.basicConfig(
        level=numeric_level,
        format='%(levelname)s|%(name)s|%(message)s',
        stream=sys.stderr
    )


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        prog='portugal-running-cli',
        description='Portugal Running Events CLI - Extract and process running events'
    )
    
    # Global options
    parser.add_argument(
        '--log-level',
        default='WARNING',
        choices=['DEBUG', 'INFO', 'WARNING', 'ERROR'],
        help='Set logging level (default: WARNING)'
    )
    
    # Subcommands
    subparsers = parser.add_subparsers(
        dest='command',
        help='Available commands',
        required=True
    )
    
    # Extract command
    extract_parser = subparsers.add_parser(
        'extract',
        help='Extract all events (main pipeline)'
    )
    extract_parser.add_argument(
        '--output', '-o',
        default='portugal-running-events.json',
        help='Output JSON file (default: portugal-running-events.json)'
    )
    extract_parser.add_argument(
        '--limit', '-l',
        type=int,
        help='Limit number of events to extract'
    )
    extract_parser.add_argument(
        '--pages', '-p',
        type=int,
        help='Limit number of pages to fetch'
    )
    extract_parser.add_argument(
        '--skip-geocoding',
        action='store_true',
        help='Skip geocoding locations'
    )
    extract_parser.add_argument(
        '--skip-descriptions',
        action='store_true',
        help='Skip generating descriptions'
    )
    extract_parser.add_argument(
        '--skip-images',
        action='store_true',
        help='Skip downloading images'
    )
    extract_parser.add_argument(
        '--delay',
        type=float,
        default=0.5,
        help='Delay between page requests in seconds (default: 0.5)'
    )
    extract_parser.add_argument(
        '--model',
        default='claude-3.5-haiku',
        help='LLM model for descriptions (default: claude-3.5-haiku)'
    )
    extract_parser.set_defaults(func=cmd_extract)
    
    # Fetch-page command
    fetch_page_parser = subparsers.add_parser(
        'fetch-page',
        help='Fetch a single page of events'
    )
    fetch_page_parser.add_argument(
        'page',
        type=int,
        help='Page number to fetch'
    )
    fetch_page_parser.add_argument(
        '--no-cache',
        action='store_true',
        help='Skip cache and force fresh fetch'
    )
    fetch_page_parser.set_defaults(func=cmd_fetch_page)
    
    # Fetch-event command
    fetch_event_parser = subparsers.add_parser(
        'fetch-event',
        help='Fetch detailed data for a single event'
    )
    fetch_event_parser.add_argument(
        'event_id',
        type=int,
        help='Event ID to fetch'
    )
    fetch_event_parser.add_argument(
        '--no-cache',
        action='store_true',
        help='Skip cache and force fresh fetch'
    )
    fetch_event_parser.add_argument(
        '--include-all',
        action='store_true',
        help='Include geocoding, descriptions, and images'
    )
    fetch_event_parser.set_defaults(func=cmd_fetch_event)
    
    # Geocode command
    geocode_parser = subparsers.add_parser(
        'geocode',
        help='Geocode a location string'
    )
    geocode_parser.add_argument(
        'location',
        nargs='?',
        help='Location to geocode'
    )
    geocode_parser.add_argument(
        '--no-cache',
        action='store_true',
        help='Skip cache and force fresh geocoding'
    )
    geocode_parser.add_argument(
        '--clear-cache',
        action='store_true',
        help='Clear geocoding cache'
    )
    geocode_parser.add_argument(
        '--debug',
        action='store_true',
        help='Include debug information in output'
    )
    geocode_parser.add_argument(
        '--api-key',
        help='Google Maps API key (overrides environment)'
    )
    geocode_parser.set_defaults(func=cmd_geocode)
    
    # Describe command
    describe_parser = subparsers.add_parser(
        'describe',
        help='Generate short description for text'
    )
    describe_parser.add_argument(
        'text',
        help='Text to summarize'
    )
    describe_parser.add_argument(
        '--no-cache',
        action='store_true',
        help='Skip cache and force fresh generation'
    )
    describe_parser.add_argument(
        '--model',
        default='claude-3.5-haiku',
        help='LLM model to use (default: claude-3.5-haiku)'
    )
    describe_parser.set_defaults(func=cmd_describe)
    
    # Download-image command
    download_parser = subparsers.add_parser(
        'download-image',
        help='Download an image from URL'
    )
    download_parser.add_argument(
        'url',
        help='Image URL to download'
    )
    download_parser.add_argument(
        'output',
        help='Output file path'
    )
    download_parser.set_defaults(func=cmd_download_image)
    
    # Profile command
    profile_parser = subparsers.add_parser(
        'profile',
        help='Profile extraction performance'
    )
    profile_parser.add_argument(
        '--operations',
        nargs='+',
        help='Specific operations to profile'
    )
    profile_parser.set_defaults(func=cmd_profile)
    
    # Cache command
    cache_parser = subparsers.add_parser(
        'cache',
        help='Manage cache files'
    )
    cache_subparsers = cache_parser.add_subparsers(
        dest='cache_command',
        help='Cache management commands',
        required=True
    )
    
    # Cache clear
    cache_clear_parser = cache_subparsers.add_parser(
        'clear',
        help='Clear cache files'
    )
    cache_clear_parser.add_argument(
        '--type',
        choices=['pages', 'events', 'geocoding', 'descriptions', 'images'],
        help='Clear specific cache type (default: all)'
    )
    
    # Cache stats
    cache_stats_parser = cache_subparsers.add_parser(
        'stats',
        help='Show cache statistics'
    )
    
    # Cache list
    cache_list_parser = cache_subparsers.add_parser(
        'list',
        help='List cache files'
    )
    cache_list_parser.add_argument(
        '--type',
        choices=['pages', 'events', 'geocoding', 'descriptions', 'images'],
        help='List specific cache type'
    )
    
    cache_parser.set_defaults(func=cmd_cache)
    
    # Parse arguments
    args = parser.parse_args()
    
    # Setup logging
    setup_logging(args.log_level)
    
    # Execute command
    try:
        return args.func(args)
    except KeyboardInterrupt:
        print("\n⚠️  Interrupted by user", file=sys.stderr)
        return 130
    except Exception as e:
        logger.exception("Unhandled exception")
        return 1


if __name__ == '__main__':
    sys.exit(main())