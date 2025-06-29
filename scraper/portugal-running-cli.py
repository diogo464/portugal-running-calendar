#!/usr/bin/env python3
"""
Portugal Running Events CLI

A unified command-line interface for scraping, enriching, and processing
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
import re
import urllib.parse
import asyncio
import aiohttp
import aiofiles
import pprint
import time

from pathlib import Path
from typing import Optional, List, Dict, Any, Tuple
from dataclasses import dataclass, asdict, field
from enum import Enum


# Constants
PORTUGAL_RUNNING_BASE_URL = "https://www.portugalrunning.com"

ENV_GOOGLE_MAPS_API_KEY = "GOOGLE_MAPS_API_KEY"

# Portugal district codes mapping (ISO 3166-2:PT)
PORTUGAL_DISTRICT_CODES = {
    # Mainland Districts
    "Aveiro": 1,
    "Beja": 2,
    "Braga": 3,
    "Bragança": 4,
    "Castelo Branco": 5,
    "Coimbra": 6,
    "Évora": 7,
    "Faro": 8,
    "Guarda": 9,
    "Leiria": 10,
    "Lisboa": 11,
    "Portalegre": 12,
    "Porto": 13,
    "Santarém": 14,
    "Setúbal": 15,
    "Viana do Castelo": 16,
    "Vila Real": 17,
    "Viseu": 18,
    # Autonomous Regions
    "Região Autónoma dos Açores": 20,
    "Açores": 20,
    "Azores": 20,
    "Região Autónoma da Madeira": 30,
    "Madeira": 30,
}


def get_district_code(district_name: Optional[str]) -> Optional[int]:
    """Get Portuguese district code from district name (ISO 3166-2:PT)."""
    if not district_name:
        return None

    # Direct lookup
    if district_name in PORTUGAL_DISTRICT_CODES:
        return PORTUGAL_DISTRICT_CODES[district_name]

    # Try common variations and normalize
    normalized = district_name.strip()

    # Handle common variations for autonomous regions
    variations = {
        "Região Autónoma da Madeira": "Madeira",
        "Região Autónoma dos Açores": "Açores",
    }

    if normalized in variations:
        return PORTUGAL_DISTRICT_CODES[variations[normalized]]

    # Last resort: try partial matching for districts
    for district in PORTUGAL_DISTRICT_CODES:
        if (
            district.lower() in normalized.lower()
            or normalized.lower() in district.lower()
        ):
            return PORTUGAL_DISTRICT_CODES[district]

    return None


# Configure logging
logger = logging.getLogger(__name__)


# ============================================================================
# Data Classes
# ============================================================================


class EventType(Enum):
    """Canonical event types."""

    MARATHON = "marathon"
    HALF_MARATHON = "half-marathon"
    FIFTEEN_K = "15k"
    TEN_K = "10k"
    FIVE_K = "5k"
    MILE = "Milha"
    RUN = "run"
    TRAIL = "trail"
    WALK = "walk"
    CROSS_COUNTRY = "cross-country"
    SAINT_SILVESTER = "saint-silvester"
    KIDS = "kids"
    RELAY = "relay"


# Distance constants in meters
EVENT_TYPE_DISTANCES = {
    EventType.MARATHON: 42195,
    EventType.HALF_MARATHON: 21097,
    EventType.FIFTEEN_K: 15000,
    EventType.TEN_K: 10000,
    EventType.FIVE_K: 5000,
    EventType.MILE: 1600,
}


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
    administrative_area_level_1: Optional[str] = None  # District
    administrative_area_level_2: Optional[str] = None  # Municipality
    administrative_area_level_3: Optional[str] = None  # Parish
    district_code: Optional[int] = None  # Portuguese district code

    def to_dict(self) -> Dict[str, Any]:
        result = {}
        result["name"] = self.name
        result["country"] = self.country
        result["locality"] = self.locality
        if self.coordinates:
            result["coordinates"] = self.coordinates.to_dict()  # type: ignore
        if self.administrative_area_level_1:
            result["administrative_area_level_1"] = self.administrative_area_level_1
        if self.administrative_area_level_2:
            result["administrative_area_level_2"] = self.administrative_area_level_2
        if self.administrative_area_level_3:
            result["administrative_area_level_3"] = self.administrative_area_level_3
        if self.district_code:
            result["district_code"] = self.district_code
        return result


@dataclass
class WIcs:
    """Structured data extracted from ICS calendar files."""

    location: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    description: Optional[str] = None
    summary: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class WPage:
    """Represents a page from WordPress API with its event IDs."""

    page_id: int
    event_ids: List[int]


@dataclass
class WEvent:
    """Raw event data from WordPress API."""

    id: int
    # this appears to tbe the date at which this object was created in word press, not the actual event date
    date: str
    # link to the portugal running event page
    link: str
    slug: str
    title: str
    class_list: list[str]
    content: Optional[str] = None
    featured_media: Optional[int] = None
    featured_image_src: Optional[str] = None


@dataclass
class Event:
    """Complete event data structure."""

    id: int
    name: str
    location: str
    coordinates: Optional[Coordinates]
    country: str
    locality: str
    distances: List[int]
    types: List[str]
    images: List[str]
    start_date: str
    end_date: str
    circuit: List[Any]
    description: str
    description_short: Optional[str]
    page: Optional[str]
    slug: Optional[str] = None
    administrative_area_level_1: Optional[str] = None  # District
    administrative_area_level_2: Optional[str] = None  # Municipality
    administrative_area_level_3: Optional[str] = None  # Parish
    district_code: Optional[int] = None  # Portuguese district code

    def to_dict(self) -> Dict[str, Any]:
        result = asdict(self)
        if self.coordinates:
            result["coordinates"] = self.coordinates.to_dict()
        return result


class EventBuilder:
    id: int
    name: str | None = None
    location: str | None = None
    coordinates: Coordinates | None = None
    country: str | None = None
    locality: str | None = None
    distances: list[int] = []
    types: list[EventType] = []
    images: list[str] = []
    start_date: str | None = None
    end_date: str | None = None
    circuit: list[str] = []
    description: str | None = None
    description_short: str | None = None
    page: str | None = None
    slug: str | None = None
    administrative_area_level_1: str | None = None  # District
    administrative_area_level_2: str | None = None  # Municipality
    administrative_area_level_3: str | None = None  # Parish
    district_code: int | None = None  # Portuguese district code

    def __init__(self, event_id: int):
        self.id = event_id
        self.distances = []
        self.types = []
        self.images = []
        self.circuit = []

    def add_event_type(self, event_type: EventType):
        if event_type in self.types:
            return
        self.types.append(event_type)
        logger.debug(f"EVENT_BUILDER|Added event type|{self.id}|{event_type.value}")

    def set_name(self, name: str, overwrite: bool = False):
        if self.name is None or overwrite:
            old_value = self.name
            self.name = name
            logger.debug(f"EVENT_BUILDER|Set name|{self.id}|{old_value} -> {name}")

    def set_location(self, location: str, overwrite: bool = False):
        if self.location is None or overwrite:
            old_value = self.location
            self.location = location
            logger.debug(
                f"EVENT_BUILDER|Set location|{self.id}|{old_value} -> {location}"
            )

    def set_coordinates(self, coordinates: Coordinates, overwrite: bool = False):
        if self.coordinates is None or overwrite:
            old_value = self.coordinates
            self.coordinates = coordinates
            logger.debug(
                f"EVENT_BUILDER|Set coordinates|{self.id}|{old_value} -> {coordinates.lat},{coordinates.lon}"
            )

    def set_country(self, country: str, overwrite: bool = False):
        if self.country is None or overwrite:
            old_value = self.country
            self.country = country
            logger.debug(
                f"EVENT_BUILDER|Set country|{self.id}|{old_value} -> {country}"
            )

    def set_locality(self, locality: str, overwrite: bool = False):
        if self.locality is None or overwrite:
            old_value = self.locality
            self.locality = locality
            logger.debug(
                f"EVENT_BUILDER|Set locality|{self.id}|{old_value} -> {locality}"
            )

    def set_administrative_area_level_1(self, area: str, overwrite: bool = False):
        if self.administrative_area_level_1 is None or overwrite:
            old_value = self.administrative_area_level_1
            self.administrative_area_level_1 = area
            logger.debug(
                f"EVENT_BUILDER|Set admin area level 1|{self.id}|{old_value} -> {area}"
            )

    def set_administrative_area_level_2(self, area: str, overwrite: bool = False):
        if self.administrative_area_level_2 is None or overwrite:
            old_value = self.administrative_area_level_2
            self.administrative_area_level_2 = area
            logger.debug(
                f"EVENT_BUILDER|Set admin area level 2|{self.id}|{old_value} -> {area}"
            )

    def set_administrative_area_level_3(self, area: str, overwrite: bool = False):
        if self.administrative_area_level_3 is None or overwrite:
            old_value = self.administrative_area_level_3
            self.administrative_area_level_3 = area
            logger.debug(
                f"EVENT_BUILDER|Set admin area level 3|{self.id}|{old_value} -> {area}"
            )

    def set_district_code(self, code: int, overwrite: bool = False):
        if self.district_code is None or overwrite:
            old_value = self.district_code
            self.district_code = code
            logger.debug(
                f"EVENT_BUILDER|Set district code|{self.id}|{old_value} -> {code}"
            )

    def add_distance(self, distance: int):
        if distance not in self.distances:
            self.distances.append(distance)
            self.distances.sort()
            logger.debug(f"EVENT_BUILDER|Added distance|{self.id}|{distance}m")

    def add_image(self, image_url: str):
        if image_url not in self.images:
            self.images.append(image_url)
            logger.debug(f"EVENT_BUILDER|Added image|{self.id}|{image_url}")

    def set_start_date(self, start_date: str, overwrite: bool = False):
        if self.start_date is None or overwrite:
            old_value = self.start_date
            self.start_date = start_date
            logger.debug(
                f"EVENT_BUILDER|Set start date|{self.id}|{old_value} -> {start_date}"
            )

    def set_end_date(self, end_date: str, overwrite: bool = False):
        if self.end_date is None or overwrite:
            old_value = self.end_date
            self.end_date = end_date
            logger.debug(
                f"EVENT_BUILDER|Set end date|{self.id}|{old_value} -> {end_date}"
            )

    def add_circuit(self, circuit: str):
        if circuit not in self.circuit:
            self.circuit.append(circuit)
            logger.debug(f"EVENT_BUILDER|Added circuit|{self.id}|{circuit}")

    def set_description(self, description: str, overwrite: bool = False):
        if self.description is None or overwrite:
            old_length = len(self.description) if self.description else 0
            self.description = description
            new_length = len(description)
            logger.debug(
                f"EVENT_BUILDER|Set description|{self.id}|{old_length} -> {new_length} chars"
            )

    def set_description_short(self, description_short: str, overwrite: bool = False):
        if self.description_short is None or overwrite:
            old_value = self.description_short
            self.description_short = description_short
            logger.debug(
                f"EVENT_BUILDER|Set short description|{self.id}|{old_value} -> {description_short}"
            )

    def set_event_page(self, event_page: str, overwrite: bool = False):
        if self.page is None or overwrite:
            old_value = self.page
            self.page = event_page
            logger.debug(
                f"EVENT_BUILDER|Set event page|{self.id}|{old_value} -> {event_page}"
            )

    def set_slug(self, slug: str, overwrite: bool = False):
        if self.slug is None or overwrite:
            old_value = self.slug
            self.slug = slug
            logger.debug(f"EVENT_BUILDER|Set slug|{self.id}|{old_value} -> {slug}")

    def build(self) -> Event:
        """Build an Event instance from the builder, using default values for any None fields."""
        # Convert EventType enums to strings
        event_type_strings = [et.value for et in self.types]

        return Event(
            id=self.id,
            name=self.name or "Unknown Event",
            location=self.location or "Unknown Location",
            coordinates=self.coordinates,  # Can be None
            country=self.country or "Portugal",
            locality=self.locality or "Unknown",
            distances=self.distances or [],
            types=event_type_strings or [],
            images=self.images or [],
            start_date=self.start_date or "1970-01-01",
            end_date=self.end_date or self.start_date or "1970-01-01",
            circuit=self.circuit or [],
            description=self.description or "",
            description_short=self.description_short,  # Can be None
            page=self.page,  # Can be None
            slug=self.slug,  # Can be None
            administrative_area_level_1=self.administrative_area_level_1,  # Can be None
            administrative_area_level_2=self.administrative_area_level_2,  # Can be None
            administrative_area_level_3=self.administrative_area_level_3,  # Can be None
            district_code=self.district_code,  # Can be None
        )


@dataclass
class CacheConfig:
    """Cache directory configuration."""

    enabled: bool = True
    http_dir: Path = field(default_factory=lambda: Path("http_cache"))
    llm_dir: Path = field(default_factory=lambda: Path("llm_cache"))
    media_dir: Path = field(default_factory=lambda: Path("media"))

    def ensure_directories(self):
        """Create all cache directories if they don't exist."""
        for attr_name in dir(self):
            if attr_name.endswith("_dir") and not attr_name.startswith("_"):
                dir_path = getattr(self, attr_name)
                dir_path.mkdir(exist_ok=True)


# ============================================================================
# Cache Management
# ============================================================================


def cache_get_key(data: str, prefix: str = "") -> str:
    """Generate MD5 cache key from data."""
    cache_input = f"{prefix}:{data}" if prefix else data
    return hashlib.md5(cache_input.encode()).hexdigest()


async def cache_read(cache_path: Path) -> Optional[bytes]:
    if not cache_path.exists():
        return None

    try:
        async with aiofiles.open(cache_path, "rb") as f:
            content = await f.read()
            return content
    except IOError as e:
        logger.warning(f"Cache read error for {cache_path}: {e}")
        cache_path.unlink(missing_ok=True)
        return None


async def cache_write(cache_path: Path, data: bytes) -> None:
    try:
        cache_path.parent.mkdir(parents=True, exist_ok=True)
        async with aiofiles.open(cache_path, "wb") as f:
            await f.write(data)
    except IOError as e:
        logger.error(f"Cache write error for {cache_path}: {e}")
        raise


def cache_clear(cache_dir: Path, pattern: str = "*") -> int:
    """Clear cache files matching pattern. Returns count of files removed."""
    count = 0
    for file_path in cache_dir.glob(pattern):
        if file_path.is_file():
            file_path.unlink()
            count += 1
    return count


def cache_get_stats(cache_dir: Path) -> Dict[str, Any]:
    """Get statistics about cache directory."""
    if not cache_dir.exists():
        return {"exists": False, "files": 0, "size": 0}

    files = list(cache_dir.glob("*"))
    total_size = sum(f.stat().st_size for f in files if f.is_file())

    return {
        "exists": True,
        "files": len([f for f in files if f.is_file()]),
        "size": total_size,
        "size_mb": round(total_size / 1024 / 1024, 2),
    }


# ============================================================================
# Async HTTP Client Functions
# ============================================================================


def http_session_create() -> aiohttp.ClientSession:
    connector = aiohttp.TCPConnector(
        limit=100, limit_per_host=30, ttl_dns_cache=300, use_dns_cache=True
    )

    timeout = aiohttp.ClientTimeout(total=30, connect=10, sock_read=10)

    session = aiohttp.ClientSession(
        connector=connector,
        timeout=timeout,
        headers={"User-Agent": "Mozilla/5.0 (compatible; PortugalRunningCLI/1.0)"},
    )
    return session


async def http_get(
    session: aiohttp.ClientSession, url: str, timeout: int = 30
) -> Tuple[int, bytes]:
    """
    Perform async HTTP GET request.
    Returns (status_code, content).
    """

    try:
        async_timeout = aiohttp.ClientTimeout(total=timeout)
        async with session.get(url, timeout=async_timeout) as response:
            content = await response.read()
            return response.status, content

    except aiohttp.ClientError as e:
        logger.error(f"HTTP|Request failed|{url}|{str(e)}")
        raise
    except Exception as e:
        logger.error(f"HTTP|Unexpected error|{url}|{str(e)}")
        raise


async def http_get_cached(
    session: aiohttp.ClientSession,
    cache_config: CacheConfig,
    url: str,
    timeout: int = 30,
    ttl: int | None = None,
) -> bytes:
    """
    Perform cached async HTTP GET request.
    Returns content string or None on error.

    Args:
        ttl: Time to live in seconds. If None, cache is used indefinitely.
             If specified, cache older than ttl seconds will be ignored.
    """
    cache_path = cache_config.http_dir.joinpath(cache_get_key(url))
    if cache_config.enabled:
        cache_data = await cache_read(cache_path)
        if cache_data is not None:
            # Check TTL if specified
            if ttl is not None and cache_path.exists():
                cache_age = time.time() - cache_path.stat().st_mtime
                if cache_age > ttl:
                    logger.debug(
                        f"Cache expired for {url} (age: {cache_age:.1f}s, ttl: {ttl}s)"
                    )
                else:
                    return cache_data
            else:
                # No TTL specified, use cache indefinitely
                return cache_data

    # Fetch from network
    logger.debug(f"Fetching {url}")
    try:
        status, content = await http_get(session, url, timeout)
        if status == 200:
            await cache_write(cache_path, content)
            return content
        else:
            logger.error(f"HTTP|Bad status|{url}|{status}")
            raise Exception(f"HTTP request failed with status {status} for URL: {url}")
    except Exception as e:
        logger.error(f"HTTP|Request failed|{url}|{str(e)}")
        raise Exception(f"HTTP request failed for URL: {url}") from e


async def http_download_file(
    session: aiohttp.ClientSession,
    cache_config: CacheConfig,
    url: str,
    output_path: Path,
    timeout: int = 30,
):
    """
    Download file from URL to path asynchronously.
    Returns True on success.
    """
    if output_path.exists():
        return

    try:
        content = await http_get_cached(session, cache_config, url, timeout)
        async with aiofiles.open(output_path, "wb") as f:
            await f.write(content)
    except Exception as e:
        logger.error(f"DOWNLOAD|Failed|{url}|{str(e)}")
        if output_path.exists():
            output_path.unlink(missing_ok=True)
        raise e


# ============================================================================
# Async Subprocess Functions
# ============================================================================


async def subprocess_run(
    command: List[str],
    input_data: Optional[str] = None,
    timeout: int = 30,
    cwd: Optional[Path] = None,
    check: bool | None = None,
) -> Tuple[int, str, str]:
    """
    Run subprocess command asynchronously.
    Returns (returncode, stdout, stderr).
    """
    proc = None
    try:
        proc = await asyncio.create_subprocess_exec(
            *command,
            stdin=asyncio.subprocess.PIPE if input_data else None,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=cwd,
        )

        stdout, stderr = await asyncio.wait_for(
            proc.communicate(input_data.encode() if input_data else None),
            timeout=timeout,
        )

        assert proc.returncode is not None
        if check == True and proc.returncode != 0:
            logger.error(
                f"SUBPROCESS|Command failed|exit_code={proc.returncode}|stdout={stdout.decode()}|stderr={stderr.decode()}"
            )
            raise Exception(f"Command failed with exit code {proc.returncode}")

        return proc.returncode, stdout.decode(), stderr.decode()

    except asyncio.TimeoutError:
        if proc is not None:
            proc.kill()
            await proc.wait()
        logger.error(f"SUBPROCESS|Timeout|{' '.join(command)}")
        raise
    except Exception as e:
        logger.error(f"SUBPROCESS|Error|{' '.join(command)}|{str(e)}")
        raise


# ============================================================================
# API Clients
# ============================================================================


class WordPressClient:
    """Client for WordPress REST API and EventON endpoints."""

    def __init__(
        self,
        session: aiohttp.ClientSession,
        base_url: str,
        cache_config: CacheConfig,
        max_concurrent: int = 10,
    ):
        self.session = session
        self.base_url = base_url
        self.cache_config = cache_config
        self.api_base = f"{base_url}/wp-json/wp/v2"
        self.semaphore = asyncio.Semaphore(max_concurrent)

    async def _fetch(self, url: str, ttl: int | None = None) -> bytes:
        async with self.semaphore:  # Rate limiting
            try:
                content = await http_get_cached(
                    self.session, self.cache_config, url, ttl=ttl
                )
                return content
            except Exception as e:
                logger.error(f"WORDPRESS|Failed to fetch from URL|{url}|{str(e)}")
                raise e

    async def fetch_events_page(self, page: int) -> WPage:
        """Fetch a page of events from WordPress API asynchronously."""
        url = f"{self.api_base}/ajde_events?page={page}"
        content = await self._fetch(url, ttl=3600)
        json_data = json.loads(content)
        event_ids = []
        for event in json_data:
            event_ids.append(int(event["id"]))
        return WPage(page_id=page, event_ids=event_ids)

    async def fetch_event_details(
        self,
        event_id: int,
    ) -> WEvent:
        url = f"{self.api_base}/ajde_events/{event_id}"
        content = await self._fetch(url)
        json_data = json.loads(content)
        assert isinstance(json_data, dict)
        featured_media = None
        if "featured_media" in json_data:
            featured_media = int(json_data["featured_media"])
        return WEvent(
            id=int(json_data["id"]),
            date=json_data["date"],
            link=json_data["link"],
            slug=json_data["slug"],
            title=json_data["title"]["rendered"],
            class_list=json_data["class_list"],
            content=json_data["content"]["rendered"],
            featured_media=featured_media,
            featured_image_src=json_data["featured_image_src"],
        )

    async def fetch_event_ics(self, event_id: int) -> WIcs:
        url = f"{PORTUGAL_RUNNING_BASE_URL}/export-events/{event_id}_0/"
        content_bytes = await self._fetch(url)
        content_str = content_bytes.decode(encoding="utf-8", errors="ignore")
        return self._parse_ics_content(content_str)

    # TODO: rework this
    def _parse_ics_content(self, ics_content: str) -> WIcs:
        """Parse ICS content and extract event data."""
        if not ics_content or "BEGIN:VCALENDAR" not in ics_content:
            raise Exception("Invalid ICS file format: missing BEGIN:VCALENDAR header")

        # Clean the content
        ics_content = ics_content.replace("\x00", "")
        ics_content = "".join(c for c in ics_content if ord(c) >= 32 or c in "\n\r\t")

        ics_location = None
        ics_summary = None
        ics_start_date = None
        ics_end_date = None
        ics_description = None

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
            ics_location = " ".join(unique_parts)

        # Extract summary
        summary_match = re.search(r"SUMMARY:(.+)", ics_content)
        if summary_match:
            ics_summary = summary_match.group(1).strip()

        # Extract dates
        dtstart_match = re.search(r"DTSTART:(\d+)", ics_content)
        if dtstart_match:
            date_str = dtstart_match.group(1)
            if len(date_str) == 8:
                ics_start_date = f"{date_str[:4]}-{date_str[4:6]}-{date_str[6:8]}"

        dtend_match = re.search(r"DTEND:(\d+)", ics_content)
        if dtend_match:
            date_str = dtend_match.group(1)
            if len(date_str) == 8:
                ics_end_date = f"{date_str[:4]}-{date_str[4:6]}-{date_str[6:8]}"

        # Extract description
        desc_match = re.search(
            r"DESCRIPTION:(.+?)(?=\n[A-Z]|\nEND:)", ics_content, re.DOTALL
        )
        if desc_match:
            desc = (
                desc_match.group(1)
                .replace("\n ", "")
                .replace("\\n", "\n")
                .replace("\\,", ",")
            )
            ics_description = self._fix_encoding(desc.strip())

        return WIcs(
            location=ics_location,
            start_date=ics_start_date,
            end_date=ics_end_date,
            description=ics_description,
            summary=ics_summary,
        )

    def _fix_encoding(self, text: str) -> str:
        """Fix common UTF-8 encoding issues."""
        if not text:
            return text

        # Common UTF-8 sequences that were misinterpreted as ISO-8859-1
        replacements = {
            "Ã¡": "á",
            "Ã ": "à",
            "Ã¢": "â",
            "Ã£": "ã",
            "Ã©": "é",
            "Ãª": "ê",
            "Ã­": "í",
            "Ã³": "ó",
            "Ã´": "ô",
            "Ãµ": "õ",
            "Ãº": "ú",
            "Ã§": "ç",
            "Ã±": "ñ",
            "â\x9c": '"',
            "â\x9d": '"',
            "â\x93": "–",
            "â\x94": "—",
            "â¢": "•",
            "â¦": "…",
        }

        result = text
        for wrong, correct in replacements.items():
            result = result.replace(wrong, correct)

        # Handle specific problematic patterns
        additional_fixes = {
            "C—mara": "Câmara",
            "Dist—ncias": "Distâncias",
            "Const—ncia": "Constância",
            "Gr—ndola": "Grândola",
            "ORGANIZAÇÇO": "ORGANIZAÇÃO",
            "SÇO": "SÃO",
            "EdiÃ§Ã£o": "Edição",
            "organizaÃ§Ã£o": "organização",
        }

        for wrong, correct in additional_fixes.items():
            result = result.replace(wrong, correct)
            result = result.replace(wrong.lower(), correct.lower())

        return result


class GoogleGeocodingClient:
    """Google Maps Geocoding API client with caching."""

    def __init__(
        self, api_key: str, cache_config: CacheConfig, session: aiohttp.ClientSession
    ):
        self.api_key = api_key
        self.cache_config = cache_config
        self.session = session
        self.base_url = "https://maps.googleapis.com/maps/api/geocode/json"

    def _parse_google_response(
        self, location: str, google_result: dict
    ) -> EventLocation:
        """Parse Google Maps API response into EventLocation."""
        location_data = {
            "name": location,
            "lat": google_result["geometry"]["location"]["lat"],
            "lon": google_result["geometry"]["location"]["lng"],
            "country": "Portugal",
            "locality": location.split(",")[0].strip(),
            "administrative_area_level_1": None,
            "administrative_area_level_2": None,
            "administrative_area_level_3": None,
            "district_code": None,
        }

        # Extract all administrative levels from address components
        for component in google_result["address_components"]:
            types = component["types"]
            if "country" in types:
                location_data["country"] = component["long_name"]
            elif "administrative_area_level_1" in types:
                location_data["administrative_area_level_1"] = component["long_name"]
                # Use district as locality for Portugal
                location_data["locality"] = component["long_name"]
            elif "administrative_area_level_2" in types:
                location_data["administrative_area_level_2"] = component["long_name"]
            elif "administrative_area_level_3" in types:
                location_data["administrative_area_level_3"] = component["long_name"]

        # Calculate district code from administrative_area_level_1 (district)
        location_data["district_code"] = get_district_code(
            location_data["administrative_area_level_1"]
        )

        return EventLocation(
            name=location,
            country=location_data["country"],
            locality=location_data["locality"],
            coordinates=Coordinates(lat=location_data["lat"], lon=location_data["lon"]),
            administrative_area_level_1=location_data["administrative_area_level_1"],
            administrative_area_level_2=location_data["administrative_area_level_2"],
            administrative_area_level_3=location_data["administrative_area_level_3"],
            district_code=location_data["district_code"],
        )

    async def geocode(
        self, location: str, use_cache: bool = True
    ) -> Optional[EventLocation]:
        """Geocode a location string asynchronously."""
        # Build request
        params = {
            "address": location,
            "key": self.api_key,
            "region": "pt",
            "language": "pt",
        }

        try:
            url = f"{self.base_url}?{urllib.parse.urlencode(params)}"
            content = await http_get_cached(self.session, self.cache_config, url)
            logger.debug(f"GEOCODING|Google API content|{location}|{content}")
            data = json.loads(content)
            result = data["results"][0]
            logger.debug(f"GEOCODING|Google API result|{location}|{result}")
            return self._parse_google_response(location, result)
        except Exception as e:
            logger.error(f"GEOCODING|Error|{location}|{str(e)}")
            return None


class LLMClient:
    """Client for LLM description generation."""

    def __init__(self, model: str, cache_config: CacheConfig):
        self.model = model
        self.cache_config = cache_config

    async def _cached_llm_call(
        self,
        system_prompt: str,
        user_prompt: str,
        cache_suffix: str = "",
        use_cache: bool = True,
    ) -> str:
        """Execute cached LLM call with system and user prompts."""
        # Create cache key from system + user prompt + model
        cache_input = f"{system_prompt}|{user_prompt}|{self.model}"
        cache_key = cache_get_key(cache_input)
        cache_filename = f"{cache_key}{cache_suffix}.txt"
        cache_path = self.cache_config.llm_dir / cache_filename

        # Check cache first
        if use_cache and cache_path.exists():
            async with aiofiles.open(cache_path, "r", encoding="utf-8") as f:
                return (await f.read()).strip()

        # Make LLM call
        try:
            _, stdout, _ = await subprocess_run(
                ["llm", "-m", self.model, "-s", system_prompt, user_prompt],
                timeout=30,
                check=True,
            )

            result = stdout.strip()

            # Cache the result
            cache_path.parent.mkdir(exist_ok=True)
            async with aiofiles.open(cache_path, "w", encoding="utf-8") as f:
                await f.write(result)

            return result

        except asyncio.TimeoutError:
            logger.error("LLM|Timeout in cached call")
            raise
        except Exception as e:
            logger.error(f"LLM|Error in cached call|{str(e)}")
            raise

    async def generate_description(self, text: str, use_cache: bool = True) -> str:
        """Generate short description using LLM asynchronously."""
        system_prompt = """És um assistente especializado em condensar descrições de eventos de corrida em resumos de uma linha em português de Portugal. Deves extrair e resumir apenas a informação mais importante e relevante da descrição fornecida.

Exemplos de resumos que deves gerar:
+ Corrida histórica pelas ruas de Lisboa com vista para o Tejo
+ Trail desafiante pela Serra da Estrela
+ São Silvestre tradicional no centro histórico do Porto
+ Meia maratona costeira com paisagens do Atlântico
+ Corrida solidária organizada pela câmara municipal
+ Prova de montanha com subidas técnicas
+ Corrida de Natal pela zona ribeirinha
+ Trail nocturno por caminhos antigos

IMPORTANTE:
- Responde APENAS com a descrição de uma linha em português de Portugal
- Usa apenas informação presente na descrição original
- Destaca características especiais do percurso, localização ou organização
- Não menciones distâncias se já estão implícitas no tipo de evento
- Foca-te no que torna este evento único ou interessante"""

        return await self._cached_llm_call(
            system_prompt, text, "_description", use_cache
        )

    async def infer_event_data(
        self, text: str, use_cache: bool = True
    ) -> Tuple[List[EventType], List[int]]:
        """Infer event types and distances from text using LLM."""
        system_prompt = """You are analyzing running event data to extract ONLY explicitly mentioned event types and distances.

AVAILABLE EVENT TYPES (use EXACTLY these values):
- marathon (42.195km marathon)
- half-marathon (21.0975km half marathon)
- 10k (10km race)
- 5k (5km race)
- run (general running event)
- trail (trail running)
- walk (walking event)
- cross-country (cross country running)
- saint-silvester (São Silvestre race)
- kids (children's race)
- relay (relay/team race)

CRITICAL RULES:
1. ONLY extract information that is EXPLICITLY stated in the text
2. DO NOT infer or guess event types or distances that are not clearly mentioned
3. If you find NO clear evidence, return empty lists
4. For distances, only include exact numbers mentioned (in meters)
5. Convert all distances to meters (1km = 1000m)
6. DO NOT assume standard distances unless explicitly stated
7. IT IS saint-silvester NOT saint-silvestre

OUTPUT FORMAT (exactly 2 lines):
event_types: type1,type2,type3
distances: 5000,10000,21097

If nothing found, output:
event_types: 
distances: 

EXAMPLES:
Input: "Meia Maratona de Lisboa - Percurso de 21km pela cidade"
Output:
event_types: half-marathon
distances: 21000

Input: "Corrida solidária com percursos de 5 e 10 quilómetros"
Output:
event_types: run
distances: 5000,10000

Input: "Trail do Gerês - Aventura pela montanha"
Output:
event_types: trail
distances: 

Input: "Evento desportivo na cidade"
Output:
event_types: 
distances: """

        try:
            # Get LLM response using cached call
            output = await self._cached_llm_call(
                system_prompt, text, "_infer", use_cache
            )

            # Parse the output
            lines = output.split("\n")
            event_types = []
            distances = []

            for line in lines:
                if line.startswith("event_types:"):
                    types_str = line.replace("event_types:", "").strip()
                    if types_str:
                        for type_str in types_str.split(","):
                            type_str = type_str.strip()
                            try:
                                # Validate that it's a valid EventType
                                event_type = EventType(type_str)
                                event_types.append(event_type)
                            except ValueError:
                                logger.warning(
                                    f"LLM returned invalid event type: {type_str}"
                                )

                elif line.startswith("distances:"):
                    distances_str = line.replace("distances:", "").strip()
                    if distances_str:
                        for dist_str in distances_str.split(","):
                            try:
                                distance = int(dist_str.strip())
                                if 100 <= distance <= 200000:  # Reasonable range
                                    distances.append(distance)
                            except ValueError:
                                logger.warning(
                                    f"LLM returned invalid distance: {dist_str}"
                                )

            return event_types, sorted(list(set(distances)))

        except Exception as e:
            logger.error(f"LLM|Error inferring event data|{str(e)}")
            return [], []


# ============================================================================
# Helper Functions for Improved Data Flow
# ============================================================================


def extract_event_ids_from_pages(pages: List[WPage]) -> List[int]:
    """
    Extract and flatten event IDs from all pages.

    Args:
        pages: List of Page dataclasses

    Returns:
        Sorted list of unique event IDs
    """
    all_event_ids = []
    for page in pages:
        all_event_ids.extend(page.event_ids)

    # Remove duplicates and sort
    unique_event_ids = sorted(list(set(all_event_ids)))
    return unique_event_ids


def get_today_date() -> str:
    """Get today's date in YYYY-MM-DD format."""
    from datetime import date

    return date.today().isoformat()


def extract_year_from_date(date_str: Optional[str]) -> Optional[int]:
    """Extract year from date string in YYYY-MM-DD format."""
    if not date_str or not isinstance(date_str, str):
        return None
    try:
        return int(date_str.split("-")[0])
    except (ValueError, IndexError):
        return None


def sort_events_by_date(events: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Sort events by start_date, with null dates at the end."""
    return sorted(
        events,
        key=lambda e: (
            e.get("start_date") is None,  # None values go to the end
            e.get("start_date") or "9999-12-31",  # Default for None values
        ),
    )


async def save_events_to_directory(
    events: List[Dict[str, Any]], output_dir: str
) -> None:
    """
    Save events to individual JSON files and generate aggregate files in a directory.

    Args:
        events: List of event dictionaries
        output_dir: Path to output directory
    """
    output_path = Path(output_dir)
    output_path.mkdir(exist_ok=True)

    # Save individual event files
    for event in events:
        event_id = event["id"]
        event_file = output_path / f"{event_id}.json"

        try:
            async with aiofiles.open(event_file, "w", encoding="utf-8") as f:
                await f.write(json.dumps(event, ensure_ascii=False, indent=2))
            logger.info(f"EVENT_SAVE|Saved event to file|{event_id}|{event_file}")
        except Exception as e:
            logger.error(
                f"EVENT_SAVE|Failed to save event|{event_id}|{event_file}|{str(e)}"
            )
            raise

    # Generate aggregate files
    await _generate_aggregate_files(events, output_path)


async def _generate_aggregate_files(
    events: List[Dict[str, Any]], output_path: Path
) -> None:
    """Generate all aggregate JSON files."""
    today = get_today_date()

    # Sort all events by date
    sorted_events = sort_events_by_date(events)

    # 1. Generate events.json - all events
    events_file = output_path / "events.json"
    try:
        async with aiofiles.open(events_file, "w", encoding="utf-8") as f:
            await f.write(json.dumps(sorted_events, ensure_ascii=False, indent=2))
        logger.info(f"AGGREGATE_SAVE|Generated events.json|{len(sorted_events)} events")
    except Exception as e:
        logger.error(f"AGGREGATE_SAVE|Failed to save events.json|{str(e)}")
        raise

    # 2. Generate year-<year>.json files
    events_by_year = {}
    for event in events:
        year = extract_year_from_date(event.get("start_date"))
        if year is not None:
            if year not in events_by_year:
                events_by_year[year] = []
            events_by_year[year].append(event)

    for year, year_events in events_by_year.items():
        year_file = output_path / f"year-{year}.json"
        sorted_year_events = sort_events_by_date(year_events)
        try:
            async with aiofiles.open(year_file, "w", encoding="utf-8") as f:
                await f.write(
                    json.dumps(sorted_year_events, ensure_ascii=False, indent=2)
                )
            logger.info(
                f"AGGREGATE_SAVE|Generated year-{year}.json|{len(sorted_year_events)} events"
            )
        except Exception as e:
            logger.error(f"AGGREGATE_SAVE|Failed to save year-{year}.json|{str(e)}")
            raise

    # 3. Generate by-district.json
    events_by_district = {}
    for event in events:
        district_code = event.get("district_code")
        if district_code is not None:
            if district_code not in events_by_district:
                events_by_district[district_code] = []
            events_by_district[district_code].append(event)

    # Sort events within each district
    for district_code in events_by_district:
        events_by_district[district_code] = sort_events_by_date(
            events_by_district[district_code]
        )

    district_file = output_path / "by-district.json"
    try:
        async with aiofiles.open(district_file, "w", encoding="utf-8") as f:
            await f.write(json.dumps(events_by_district, ensure_ascii=False, indent=2))
        total_district_events = sum(
            len(events) for events in events_by_district.values()
        )
        logger.info(
            f"AGGREGATE_SAVE|Generated by-district.json|{len(events_by_district)} districts, {total_district_events} events"
        )
    except Exception as e:
        logger.error(f"AGGREGATE_SAVE|Failed to save by-district.json|{str(e)}")
        raise

    # 4. Generate upcoming.json - events with start_date >= today
    upcoming_events = []
    for event in events:
        start_date = event.get("start_date")
        if start_date and isinstance(start_date, str) and start_date >= today:
            upcoming_events.append(event)

    sorted_upcoming = sort_events_by_date(upcoming_events)
    upcoming_file = output_path / "upcoming.json"
    try:
        async with aiofiles.open(upcoming_file, "w", encoding="utf-8") as f:
            await f.write(json.dumps(sorted_upcoming, ensure_ascii=False, indent=2))
        logger.info(
            f"AGGREGATE_SAVE|Generated upcoming.json|{len(sorted_upcoming)} upcoming events"
        )
    except Exception as e:
        logger.error(f"AGGREGATE_SAVE|Failed to save upcoming.json|{str(e)}")
        raise

    # 5. Generate upcoming-by-district.json
    upcoming_by_district = {}
    for event in upcoming_events:
        district_code = event.get("district_code")
        if district_code is not None:
            if district_code not in upcoming_by_district:
                upcoming_by_district[district_code] = []
            upcoming_by_district[district_code].append(event)

    # Sort events within each district
    for district_code in upcoming_by_district:
        upcoming_by_district[district_code] = sort_events_by_date(
            upcoming_by_district[district_code]
        )

    upcoming_district_file = output_path / "upcoming-by-district.json"
    try:
        async with aiofiles.open(upcoming_district_file, "w", encoding="utf-8") as f:
            await f.write(
                json.dumps(upcoming_by_district, ensure_ascii=False, indent=2)
            )
        total_upcoming_district_events = sum(
            len(events) for events in upcoming_by_district.values()
        )
        logger.info(
            f"AGGREGATE_SAVE|Generated upcoming-by-district.json|{len(upcoming_by_district)} districts, {total_upcoming_district_events} upcoming events"
        )
    except Exception as e:
        logger.error(
            f"AGGREGATE_SAVE|Failed to save upcoming-by-district.json|{str(e)}"
        )
        raise


# ============================================================================
# Event Builder Enrichment
# ============================================================================


def _enrich_from_class_list(
    builder: EventBuilder,
    class_list: list[str],
) -> list[EventType]:
    def _ignored_class(wp_class: str) -> bool:
        ignored_classes = set(
            [
                "ajde_events",
                "type-ajde_events",
                "status-publish",
                "hentry",
                "event_type_2-guarda",
                "event_type_2-acores",
                "event_type_2-alemanha",
                "event_type_2-algarve-e-sul",
                "event_type_2-america",
                "event_type_2-aveiro",
                "event_type_2-beja",
                "event_type_2-braga",
                "event_type_2-braganca",
                "event_type_2-castelo-branco",
                "event_type_2-coimbra",
                "event_type_2-espanha",
                "event_type_2-europa",
                "event_type_2-evora",
                "event_type_2-faro",
                "event_type_2-italia",
                "event_type_2-leiria",
                "event_type_2-lisboa",
                "event_type_2-lisboa-e-centro",
                "event_type_2-madeira",
                "event_type_2-noruega",
                "event_type_2-paises-baixos",
                "event_type_2-portalegre",
                "event_type_2-porto",
                "event_type_2-porto-e-norte",
                "event_type_2-portugal",
                "event_type_2-reino-unido",
                "event_type_2-santarem",
                "event_type_2-setubal",
                "event_type_2-usa",
                "event_type_2-viana-do-castelo",
                "event_type_2-vila-real",
                "event_type_2-viseu",
                "event_type_3-sim",
                "event_type_4-solidarias-sim",
                "event_type_5-3-rios-trail-trophy",
                "event_type-corridas-inferior-10",
                "has-post-thumbnail",
            ]
        )

        ignored = wp_class in ignored_classes
        ignored |= wp_class.startswith("post-")
        ignored |= wp_class.startswith("event_location-")
        ignored |= wp_class.startswith("event_organizer-")

        return ignored

    type_mapping = {
        "event_type-caminhada": [EventType.RUN],
        "event_type-trail": [EventType.TRAIL],
        "event_type-trail-curto": [EventType.TRAIL],
        "event_type-trail-longo": [EventType.TRAIL],
        "event_type_4-corrida": [EventType.RUN],
        "event_type_4-caminhada": [EventType.WALK],
        "event_type_4-trail": [EventType.TRAIL],
        "event_type_4-sao-silvestre": [EventType.SAINT_SILVESTER],
        "event_type_4-cross": [EventType.CROSS_COUNTRY],
        "event_type_4-maratona": [EventType.MARATHON],
        "event_type_4-meia-maratona": [EventType.HALF_MARATHON],
        "event_type_4-10km": [EventType.TEN_K],
        "event_type_4-5km": [EventType.FIVE_K],
        "event_type_4-estafetas": [EventType.RELAY],
        "event_type_4-kids": [EventType.KIDS],
        "event_type-corrida": [EventType.RUN],
        "event_type-corrida-10-km": [EventType.TEN_K],
        "event_type-corrida-de-15-km": [EventType.FIFTEEN_K],
        "event_type-backyard": [EventType.CROSS_COUNTRY],
        "event_type-canicross": [EventType.CROSS_COUNTRY],
        "event_type-corta-mato": [EventType.CROSS_COUNTRY],
        "event_type-estafetas": [EventType.RELAY],
        "event_type-etapas": [],
        "event_type-kids": [EventType.KIDS],
        "event_type-kids-trail": [EventType.KIDS, EventType.TRAIL],
        "event_type-legua": [EventType.FIVE_K],
        "event_type-maratona": [EventType.MARATHON],
        "event_type-meiamaratona": [EventType.HALF_MARATHON],
        "event_type-milha": [EventType.MILE],
        "event_type-obstaculos": [],
        "event_type-outras": [],
        "event_type-pista": [],
        "event_type-running-tours": [],
        "event_type-sao-silvestre": [EventType.SAINT_SILVESTER],
        "event_type-skyrunning": [],
        "event_type-t-estafeta": [EventType.RELAY],
        "event_type-trail-endurance": [EventType.TRAIL],
        "event_type-trail-ultra": [EventType.TRAIL],
    }

    circuit_mapping = {
        "event_type_5-circuito-4-estacoes": "4 Estacoes",
        "event_type_5-circuito-atrp": "ATRP",
        "event_type_5-circuito-de-atletismo-do-barreiro": "Atletismo do Barreiro",
        "event_type_5-circuito-estrelas-de-portugal": "Estrelas de Portugal",
        "event_type_5-circuito-trail-madeira": "Trail Madeira",
        "event_type_5-majors": "Majors",
        "event_type_5-superhalfs": "SuperHalfs",
        "event_type_5-trofeu-atletismo-de-almada": "Atletismo de Almada",
        "event_type_5-trofeu-de-almada": "Trofeu de Almada",
    }

    event_types = []
    for wp_class in class_list:
        if _ignored_class(wp_class):
            continue

        if wp_class not in type_mapping and wp_class not in circuit_mapping:
            logger.warning(
                f"MAPPING|Unknown WordPress class found|{wp_class}|Add mapping to fix event type extraction"
            )
            continue

        if wp_class in type_mapping:
            for event_type in type_mapping[wp_class]:
                if event_type not in event_types:
                    builder.add_event_type(event_type)
        if wp_class in circuit_mapping:
            builder.add_circuit(circuit_mapping[wp_class])

    return event_types


def _enrich_extract_distances_from_text(text: str) -> List[int]:
    """Extract running distances from text."""
    if not text:
        return []

    distances = []
    text_lower = text.lower()

    # Look for specific distance patterns
    patterns = [
        (r"(\d+)\s*km", 1000),  # X km
        (r"(\d+)\s*k\b", 1000),  # X k
        (r"(\d+)\s*metros", 1),  # X metros
        (r"(\d+)\s*m\b", 1),  # X m
        (r"(\d+),(\d+)\s*km", 1000),  # X,Y km (Portuguese decimal)
        (r"(\d+)\.(\d+)\s*km", 1000),  # X.Y km
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

    # Remove duplicates and sort
    return sorted(list(set(distances)))


async def enrich_from_event_details(
    builder: EventBuilder,
    details: WEvent,
    session: aiohttp.ClientSession,
    cache_config: CacheConfig,
):
    _enrich_from_class_list(builder, details.class_list)

    if details.title != "":
        builder.set_name(details.title)

    if details.content is not None:
        builder.set_description(details.content)

    if details.slug:
        builder.set_slug(details.slug)

    if details.featured_image_src is not None and details.featured_image_src != "":
        image_path = cache_config.media_dir.joinpath(
            cache_get_key(details.featured_image_src)
        )
        try:
            await http_download_file(
                session, cache_config, details.featured_image_src, image_path
            )
            builder.add_image(str(image_path))
        except Exception as e:
            logger.error(
                f"IMAGE|Failed to download image|{builder.id}|{details.featured_image_src}|{str(e)}"
            )
            pass


async def enrich_event_link(
    builder: EventBuilder,
    link: str | None,
    session: aiohttp.ClientSession,
    cache_config: CacheConfig,
):
    if link is None or link == "":
        return

    try:
        content = await http_get_cached(session, cache_config, link)
        content_str = content.decode("utf-8")

        # Use regex to find the event page link
        # Looking for <a class='evcal_evdata_row evo_clik_row ' href='...'> or <a class="evcal_evdata_row evo_clik_row " href="...">
        pattern = r'<a[^>]*class=[\'"][^\'"]*evcal_evdata_row evo_clik_row[^\'"]*[\'"][^>]*href=[\'"]([^\'"]+)[\'"][^>]*>'

        match = re.search(pattern, content_str)
        if match:
            event_page_url = match.group(1)
            builder.set_event_page(event_page_url)
            logger.debug(f"EVENT_LINK|Found event page|{builder.id}|{event_page_url}")
        else:
            logger.warning(f"EVENT_LINK|No event page found|{builder.id}|{link}")

    except Exception as e:
        logger.error(
            f"EVENT_LINK|Error extracting event page|{builder.id}|{link}|{str(e)}"
        )


def enrich_from_event_ics(builder: EventBuilder, ics: WIcs):
    if ics.location is not None:
        builder.set_location(ics.location)
        builder.set_locality(ics.location)

    if ics.start_date is not None:
        builder.set_start_date(ics.start_date)

    if ics.end_date is not None:
        builder.set_end_date(ics.end_date)

    if ics.description is not None and ics.description.strip():
        builder.set_description(ics.description)


async def enrich_from_llm(builder: EventBuilder, llm: LLMClient):
    if builder.description is None:
        return
    short_description = await llm.generate_description(builder.description)
    builder.set_description_short(short_description)

    infer_input = ""
    if builder.name is not None:
        infer_input += builder.name + "\n"
    if builder.description is not None:
        infer_input += builder.description + "\n"
    event_types, event_distances = await llm.infer_event_data(infer_input)
    for event_type in event_types:
        builder.add_event_type(event_type)
    for event_distance in event_distances:
        builder.add_distance(event_distance)


async def encrich_from_google_maps(
    builder: EventBuilder, google: GoogleGeocodingClient
):
    if builder.location is None:
        return

    location = await google.geocode(builder.location)
    if location is None:
        logger.warning(
            f"GEOCODING|Failed to geocode location|{builder.id}|{builder.location}"
        )
        return

    builder.set_location(location.name, overwrite=True)
    builder.set_locality(location.locality, overwrite=True)
    if location.coordinates is not None:
        builder.set_coordinates(location.coordinates, overwrite=True)
    builder.set_country(location.country, overwrite=True)
    if location.administrative_area_level_1:
        builder.set_administrative_area_level_1(location.administrative_area_level_1)
    if location.administrative_area_level_2:
        builder.set_administrative_area_level_2(location.administrative_area_level_2)
    if location.administrative_area_level_3:
        builder.set_administrative_area_level_3(location.administrative_area_level_3)
    if location.district_code:
        builder.set_district_code(location.district_code)


def enrich_distances_from_description(builder: EventBuilder):
    if builder.description is None:
        return
    for distance in _enrich_extract_distances_from_text(builder.description):
        builder.add_distance(distance)


def enrich_distances_from_types(builder: EventBuilder):
    for event_type in builder.types:
        if event_type not in EVENT_TYPE_DISTANCES:
            continue
        distance = EVENT_TYPE_DISTANCES[event_type]
        builder.add_distance(distance)


# ============================================================================
# Subcommand Arguments Dataclasses
# ============================================================================


@dataclass
class EventArgs:
    event_id: int
    model: str


@dataclass
class ScrapeArgs:
    """Arguments for the scrape command."""

    output: str
    limit: Optional[int]
    pages: Optional[int]
    skip_geocoding: bool
    skip_descriptions: bool
    skip_images: bool
    model: str
    batch_size: int
    delay: float
    no_cache: bool = False


@dataclass
class FetchPageArgs:
    """Arguments for the fetch-page command."""

    page: int
    no_cache: bool


@dataclass
class FetchEventArgs:
    """Arguments for the fetch-event command."""

    event_id: int
    no_cache: bool


@dataclass
class GeocodeArgs:
    """Arguments for the geocode command."""

    location: Optional[str]
    no_cache: bool
    clear_cache: bool
    debug: bool
    api_key: Optional[str]


@dataclass
class DescribeArgs:
    """Arguments for the describe command."""

    text: str
    no_cache: bool
    model: str


@dataclass
class CacheArgs:
    """Arguments for the cache command."""

    cache_command: str
    type: Optional[str] = None


@dataclass
class Context:
    """Shared context containing all client instances and configuration."""

    cache_config: CacheConfig
    http_session: aiohttp.ClientSession
    geo_client: GoogleGeocodingClient
    llm_client: LLMClient
    wp_client: WordPressClient


# ============================================================================
# Subcommand Handlers
# ============================================================================


async def scrape_event(ctx: Context, event_id: int) -> Event:
    """Scrape a single event with all enrichment steps."""
    logger.info(f"EVENT_SCRAPE|Starting|{event_id}")
    event_builder = EventBuilder(event_id)
    event_details = await ctx.wp_client.fetch_event_details(event_id)
    event_ics = await ctx.wp_client.fetch_event_ics(event_id)

    logger.info(f"EVENT_SCRAPE|Enriching from event details|{event_id}")
    await enrich_from_event_details(
        event_builder, event_details, ctx.http_session, ctx.cache_config
    )

    logger.info(f"EVENT_SCRAPE|Enriching from event link|{event_id}")
    await enrich_event_link(
        event_builder, event_details.link, ctx.http_session, ctx.cache_config
    )

    logger.info(f"EVENT_SCRAPE|Enriching from ICS data|{event_id}")
    enrich_from_event_ics(event_builder, event_ics)

    logger.info(f"EVENT_SCRAPE|Enriching from LLM|{event_id}")
    await enrich_from_llm(event_builder, ctx.llm_client)

    logger.info(f"EVENT_SCRAPE|Enriching from Google Maps|{event_id}")
    await encrich_from_google_maps(event_builder, ctx.geo_client)

    logger.info(f"EVENT_SCRAPE|Enriching distances from description|{event_id}")
    enrich_distances_from_description(event_builder)

    logger.info(f"EVENT_SCRAPE|Enriching distances from types|{event_id}")
    enrich_distances_from_types(event_builder)

    logger.info(f"EVENT_SCRAPE|Building final event|{event_id}")
    # Build the final event
    return event_builder.build()


async def cmd_event(args: EventArgs, ctx: Context):
    event = await scrape_event(ctx, args.event_id)
    # Print the final event as JSON
    print(json.dumps(event.to_dict(), ensure_ascii=False, indent=2))


async def cmd_scrape(args: ScrapeArgs, ctx: Context):
    """Main scraping pipeline with improved data flow."""
    logger.info("Starting event scraping")

    # Update cache config based on args
    ctx.cache_config.enabled = not args.no_cache

    # Update LLM client with the specific model for this command
    ctx.llm_client = LLMClient(args.model, ctx.cache_config)

    print(f"🔄 Fetching events (limit: {args.limit if args.limit else 'unlimited'})")

    # Step 1: Fetch all event IDs from pages
    current_page = 1
    event_ids = []
    pages_to_fetch = args.pages if args.pages else float("inf")

    while current_page <= pages_to_fetch:
        try:
            print(f"📄 Fetching page {current_page}...")
            page = await ctx.wp_client.fetch_events_page(current_page)
            event_ids.extend(page.event_ids)
            current_page += 1

            # If we got fewer events than expected, we've reached the end
            if len(page.event_ids) == 0:
                break

            # Stop fetching if we already have enough events for the limit
            if args.limit and len(event_ids) >= args.limit:
                print(
                    f"🔢 Collected {len(event_ids)} events, reached limit of {args.limit}"
                )
                break

        except Exception as e:
            logger.warning(f"Failed to fetch page {current_page}: {e}")
            break

    print(f"✅ Found {len(event_ids)} unique event IDs from {current_page - 1} pages")

    # Apply limit if specified
    if args.limit and args.limit < len(event_ids):
        event_ids = event_ids[: args.limit]
        print(f"🔢 Limited to {len(event_ids)} events")

    # Step 2: Scrape events in parallel batches
    events = []

    for i in range(0, len(event_ids), args.batch_size):
        batch_ids = event_ids[i : i + args.batch_size]
        batch_num = (i // args.batch_size) + 1
        total_batches = (len(event_ids) + args.batch_size - 1) // args.batch_size

        print(
            f"🔄 Processing batch {batch_num}/{total_batches} ({len(batch_ids)} events)..."
        )

        # Create tasks for parallel processing
        tasks = [scrape_event(ctx, event_id) for event_id in batch_ids]

        try:
            # Process batch with timeout
            batch_events = await asyncio.gather(*tasks, return_exceptions=True)

            # Filter out exceptions and add successful events
            for j, result in enumerate(batch_events):
                if isinstance(result, Exception):
                    logger.error(f"Failed to scrape event {batch_ids[j]}: {result}")
                    continue
                assert isinstance(result, Event)
                events.append(result.to_dict())

            print(
                f"✅ Completed batch {batch_num} ({len([r for r in batch_events if not isinstance(r, Exception)])} successful)"
            )

        except Exception as e:
            logger.error(f"Batch {batch_num} failed: {e}")

        # Add delay between batches if specified
        if args.delay > 0 and batch_num < total_batches:
            print(f"⏳ Waiting {args.delay} seconds before next batch...")
            await asyncio.sleep(args.delay)

    print(f"✅ Successfully scraped {len(events)} events")
    events.sort(key=lambda e: e["start_date"])

    # Step 3: Save results
    print(f"💾 Saving events to directory {args.output}...")
    await save_events_to_directory(events, args.output)

    print(f"✅ Saved {len(events)} events to directory {args.output}")
    print(
        f"📁 Generated individual event files, events.json, year-*.json, by-district.json, upcoming.json, and upcoming-by-district.json"
    )
    return 0


async def cmd_fetch_page(args: FetchPageArgs, ctx: Context):
    """Fetch a single page of events."""
    page = await ctx.wp_client.fetch_events_page(args.page)

    if page is None:
        logger.error(f"Failed to fetch page {args.page}")
        return 1

    pprint.pprint(page)
    return 0


async def cmd_fetch_event(args: FetchEventArgs, ctx: Context):
    """Fetch detailed event data."""
    event_data = await ctx.wp_client.fetch_event_details(args.event_id)

    if event_data is None:
        logger.error(f"Failed to fetch event {args.event_id}")
        return 1

    pprint.pprint(event_data)
    return 0


async def cmd_geocode(args: GeocodeArgs, ctx: Context):
    """Geocode a location."""
    if not args.location:
        logger.error("No location provided")
        return 1

    result = await ctx.geo_client.geocode(args.location, use_cache=not args.no_cache)

    if result is None:
        logger.error(f"Failed to geocode '{args.location}'")
        return 1

    output = result.to_dict()
    if args.debug:
        output["cache_used"] = not args.no_cache

    print(json.dumps(output, ensure_ascii=False, indent=2))
    return 0


async def cmd_describe(args: DescribeArgs, ctx: Context):
    """Generate event description."""
    description = await ctx.llm_client.generate_description(
        args.text, use_cache=not args.no_cache
    )

    print(description)
    return 0


# ============================================================================
# Main CLI Setup
# ============================================================================


def setup_logging(level: str):
    """Configure logging based on level."""
    numeric_level = getattr(logging, level.upper(), None)
    if not isinstance(numeric_level, int):
        raise ValueError(f"Invalid log level: {level}")

    logging.basicConfig(
        level=numeric_level,
        format="%(levelname)s|%(name)s|%(message)s",
        stream=sys.stderr,
    )


async def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        prog="portugal-running-cli",
        description="Portugal Running Events CLI - Scrape and process running events",
    )

    # Global options
    parser.add_argument(
        "--log-level",
        default="WARNING",
        choices=["DEBUG", "INFO", "WARNING", "ERROR"],
        help="Set logging level",
    )
    parser.add_argument(
        "--model",
        default="openrouter/anthropic/claude-3.5-haiku",
        help="LLM model to use for descriptions and inference",
    )

    # Subcommands
    subparsers = parser.add_subparsers(
        dest="command", help="Available commands", required=True
    )

    # Scrape command
    scrape_parser = subparsers.add_parser(
        "scrape", help="Scrape all events (main pipeline)"
    )
    scrape_parser.add_argument(
        "--output",
        "-o",
        default="events",
        help="Output directory for individual event JSON files",
    )
    scrape_parser.add_argument(
        "--limit", "-l", type=int, help="Limit number of events to scrape"
    )
    scrape_parser.add_argument(
        "--pages", "-p", type=int, help="Limit number of pages to fetch"
    )
    scrape_parser.add_argument(
        "--skip-geocoding", action="store_true", help="Skip geocoding locations"
    )
    scrape_parser.add_argument(
        "--skip-descriptions", action="store_true", help="Skip generating descriptions"
    )
    scrape_parser.add_argument(
        "--skip-images", action="store_true", help="Skip downloading images"
    )
    scrape_parser.add_argument(
        "--no-cache", action="store_true", help="Skip cache and force fresh fetch"
    )
    scrape_parser.add_argument(
        "--batch-size",
        type=int,
        default=50,
        help="Number of events to process in parallel batches",
    )
    scrape_parser.add_argument(
        "--delay",
        type=float,
        default=0,
        help="Delay in seconds between processing batches",
    )
    scrape_parser.set_defaults(func=cmd_scrape)

    # Fetch-page command
    fetch_page_parser = subparsers.add_parser(
        "fetch-page", help="Fetch a single page of events"
    )
    fetch_page_parser.add_argument("page", type=int, help="Page number to fetch")
    fetch_page_parser.add_argument(
        "--no-cache", action="store_true", help="Skip cache and force fresh fetch"
    )
    fetch_page_parser.set_defaults(func=cmd_fetch_page)

    # Fetch-event command
    fetch_event_parser = subparsers.add_parser(
        "fetch-event", help="Fetch detailed data for a single event"
    )
    fetch_event_parser.add_argument("event_id", type=int, help="Event ID to fetch")
    fetch_event_parser.add_argument(
        "--no-cache", action="store_true", help="Skip cache and force fresh fetch"
    )
    fetch_event_parser.set_defaults(func=cmd_fetch_event)

    # Geocode command
    geocode_parser = subparsers.add_parser("geocode", help="Geocode a location string")
    geocode_parser.add_argument("location", nargs="?", help="Location to geocode")
    geocode_parser.add_argument(
        "--no-cache", action="store_true", help="Skip cache and force fresh geocoding"
    )
    geocode_parser.add_argument(
        "--clear-cache", action="store_true", help="Clear geocoding cache"
    )
    geocode_parser.add_argument(
        "--debug", action="store_true", help="Include debug information in output"
    )
    geocode_parser.add_argument(
        "--api-key", help="Google Maps API key (overrides environment)"
    )
    geocode_parser.set_defaults(func=cmd_geocode)

    # Describe command
    describe_parser = subparsers.add_parser(
        "describe", help="Generate short description for text"
    )
    describe_parser.add_argument("text", help="Text to summarize")
    describe_parser.add_argument(
        "--no-cache", action="store_true", help="Skip cache and force fresh generation"
    )
    describe_parser.set_defaults(func=cmd_describe)

    # Event command
    event_parser = subparsers.add_parser(
        "event", help="Fetch and display detailed information for a single event"
    )
    event_parser.add_argument("event_id", type=int, help="Event ID to fetch")
    event_parser.set_defaults(func=cmd_event)

    # Cache command
    cache_parser = subparsers.add_parser("cache", help="Manage cache files")
    cache_subparsers = cache_parser.add_subparsers(
        dest="cache_command", help="Cache management commands", required=True
    )

    # Cache clear
    cache_clear_parser = cache_subparsers.add_parser("clear", help="Clear cache files")
    cache_clear_parser.add_argument(
        "--type",
        choices=["pages", "events", "geocoding", "descriptions", "images"],
        help="Clear specific cache type",
    )

    # Cache stats
    cache_subparsers.add_parser("stats", help="Show cache statistics")

    # Cache list
    cache_list_parser = cache_subparsers.add_parser("list", help="List cache files")
    cache_list_parser.add_argument(
        "--type",
        choices=["pages", "events", "geocoding", "descriptions", "images"],
        help="List specific cache type",
    )

    # Parse arguments
    args = parser.parse_args()

    # Setup logging
    setup_logging(args.log_level)

    # Create shared context with all client instances
    cache_config = CacheConfig()
    cache_config.ensure_directories()

    # Get API key for geocoding
    google_key = os.environ.get(ENV_GOOGLE_MAPS_API_KEY)
    if not google_key:
        logger.error(
            "Missing Google Maps API key. Set GOOGLE_MAPS_API_KEY environment variable."
        )
        return 1

    # Create client instances
    http_session = http_session_create()
    geo_client = GoogleGeocodingClient(google_key, cache_config, http_session)

    # Use global model argument
    llm_client = LLMClient(args.model, cache_config)

    wp_client = WordPressClient(http_session, PORTUGAL_RUNNING_BASE_URL, cache_config)

    ctx = Context(
        cache_config=cache_config,
        http_session=http_session,
        geo_client=geo_client,
        llm_client=llm_client,
        wp_client=wp_client,
    )

    # Execute command
    try:
        # Create dataclass instances from args
        if args.command == "scrape":
            cmd_args = ScrapeArgs(
                output=args.output,
                limit=args.limit,
                pages=args.pages,
                skip_geocoding=args.skip_geocoding,
                skip_descriptions=args.skip_descriptions,
                skip_images=args.skip_images,
                model=args.model,
                batch_size=args.batch_size,
                delay=args.delay,
                no_cache=args.no_cache,
            )
            return await cmd_scrape(cmd_args, ctx)
        elif args.command == "fetch-page":
            cmd_args = FetchPageArgs(page=args.page, no_cache=args.no_cache)
            return await cmd_fetch_page(cmd_args, ctx)
        elif args.command == "fetch-event":
            cmd_args = FetchEventArgs(
                event_id=args.event_id,
                no_cache=args.no_cache,
            )
            return await cmd_fetch_event(cmd_args, ctx)
        elif args.command == "geocode":
            cmd_args = GeocodeArgs(
                location=args.location,
                no_cache=args.no_cache,
                clear_cache=args.clear_cache,
                debug=args.debug,
                api_key=args.api_key,
            )
            return await cmd_geocode(cmd_args, ctx)
        elif args.command == "describe":
            cmd_args = DescribeArgs(
                text=args.text, no_cache=args.no_cache, model=args.model
            )
            return await cmd_describe(cmd_args, ctx)
        elif args.command == "event":
            cmd_args = EventArgs(event_id=args.event_id, model=args.model)
            return await cmd_event(cmd_args, ctx)
        else:
            logger.error(f"Unknown command: {args.command}")
            return 1
    except KeyboardInterrupt:
        print("\n⚠️  Interrupted by user", file=sys.stderr)
        return 130
    except Exception:
        logger.exception("Unhandled exception")
        return 1
    finally:
        # Clean up HTTP session
        await http_session.close()


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))

