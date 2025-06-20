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
import time
import re
import urllib.parse
import asyncio
import aiohttp
import aiofiles
import pprint

from pathlib import Path
from typing import Optional, List, Dict, Any, Tuple
from dataclasses import dataclass, asdict, field
from enum import Enum


# Constants
PORTUGAL_RUNNING_BASE_URL = "https://www.portugalrunning.com"

ENV_GOOGLE_MAPS_API_KEY = "GOOGLE_MAPS_API_KEY"


# Configure logging
logger = logging.getLogger(__name__)


# ============================================================================
# Data Classes
# ============================================================================


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
EVENT_TYPE_DISTANCES = {
    EventType.MARATHON: 42195,
    EventType.HALF_MARATHON: 21097,
    EventType.TEN_K: 10000,
    EventType.FIVE_K: 5000,
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

    def to_dict(self) -> Dict[str, Any]:
        result = {"name": self.name, "country": self.country, "locality": self.locality}
        if self.coordinates:
            result["coordinates"] = self.coordinates.to_dict()  # type: ignore
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
    slug: str
    title: str
    class_list: list[str]
    content: Optional[str] = None
    featured_media: Optional[int] = None
    featured_image_src: Optional[str] = None


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


class EventBuilder:
    event_id: int
    event_name: str | None = None
    event_location: str | None = None
    event_coordinates: Coordinates | None = None
    event_country: str | None = None
    event_locality: str | None = None
    event_distances: list[int] = []
    event_types: list[EventType] = []
    event_images: list[str] = []
    event_start_date: str | None = None
    event_end_date: str | None = None
    event_circuit: list[str] = []
    event_description: str | None = None
    event_description_short: str | None = None

    def __init__(self, event_id: int):
        self.event_id = event_id
        self.event_distances = []
        self.event_types = []
        self.event_images = []
        self.event_circuit = []

    def add_event_type(self, event_type: EventType):
        if event_type in self.event_types:
            return
        self.event_types.append(event_type)

    def set_name(self, name: str, overwrite: bool = False):
        if self.event_name is None or overwrite:
            self.event_name = name

    def set_location(self, location: str, overwrite: bool = False):
        if self.event_location is None or overwrite:
            self.event_location = location

    def set_coordinates(self, coordinates: Coordinates, overwrite: bool = False):
        if self.event_coordinates is None or overwrite:
            self.event_coordinates = coordinates

    def set_country(self, country: str, overwrite: bool = False):
        if self.event_country is None or overwrite:
            self.event_country = country

    def set_locality(self, locality: str, overwrite: bool = False):
        if self.event_locality is None or overwrite:
            self.event_locality = locality

    def add_distance(self, distance: int):
        if distance not in self.event_distances:
            self.event_distances.append(distance)
            self.event_distances.sort()

    def add_image(self, image_url: str):
        if image_url not in self.event_images:
            self.event_images.append(image_url)

    def set_start_date(self, start_date: str, overwrite: bool = False):
        if self.event_start_date is None or overwrite:
            self.event_start_date = start_date

    def set_end_date(self, end_date: str, overwrite: bool = False):
        if self.event_end_date is None or overwrite:
            self.event_end_date = end_date

    def add_circuit(self, circuit: str):
        if circuit not in self.event_circuit:
            self.event_circuit.append(circuit)

    def set_description(self, description: str, overwrite: bool = False):
        if self.event_description is None or overwrite:
            self.event_description = description

    def set_description_short(self, description_short: str, overwrite: bool = False):
        if self.event_description_short is None or overwrite:
            self.event_description_short = description_short

    def build(self) -> Event:
        """Build an Event instance from the builder, using default values for any None fields."""
        # Convert EventType enums to strings
        event_type_strings = [et.value for et in self.event_types]

        return Event(
            event_id=self.event_id,
            event_name=self.event_name or "Unknown Event",
            event_location=self.event_location or "Unknown Location",
            event_coordinates=self.event_coordinates,  # Can be None
            event_country=self.event_country or "Portugal",
            event_locality=self.event_locality or "Unknown",
            event_distances=self.event_distances or [],
            event_types=event_type_strings or [],
            event_images=self.event_images or [],
            event_start_date=self.event_start_date or "1970-01-01",
            event_end_date=self.event_end_date or self.event_start_date or "1970-01-01",
            event_circuit=self.event_circuit or [],
            event_description=self.event_description or "",
            description_short=self.event_description_short,  # Can be None
        )


@dataclass
class CacheConfig:
    """Cache directory configuration."""

    enabled: bool = True
    http_dir: Path = field(default_factory=lambda: Path("http_cache"))
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
) -> bytes:
    """
    Perform cached async HTTP GET request.
    Returns content string or None on error.
    """
    cache_path = cache_config.http_dir.joinpath(cache_get_key(url))
    cache_data = await cache_read(cache_path)
    if cache_data is not None:
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
            raise Exception(
                f"http request returned invalid code {status}"
            )  # TODO(claude): improve exception message
    except Exception as e:
        logger.error(f"HTTP|Request failed|{url}|{str(e)}")
        raise e  # TODO(claude): improve exception message


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
            # TODO(claude): write a nice error message here
            raise Exception()

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

    async def _fetch(self, url: str) -> bytes:
        async with self.semaphore:  # Rate limiting
            try:
                content = await http_get_cached(self.session, self.cache_config, url)
                return content
            except Exception as e:
                logger.error("TODO(claude): improve error message")
                raise e

    async def fetch_events_page(self, page: int) -> WPage:
        """Fetch a page of events from WordPress API asynchronously."""
        url = f"{self.api_base}/ajde_events?page={page}"
        content = await self._fetch(url)
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
            slug=json_data["slug"],
            title=json_data["title"]["rendered"],
            class_list=json_data["class_list"],
            content=json_data["content"]["rendered"],
            featured_media=featured_media,
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
            raise Exception("invalid ics file")  # TODO(claude): improve message

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

    def __init__(self, api_key: str, cache_config: CacheConfig):
        self.api_key = api_key
        self.cache_config = cache_config
        self.base_url = "https://maps.googleapis.com/maps/api/geocode/json"
        self.min_request_interval = 0.1
        self.last_request_time = 0
        self.session: Optional["aiohttp.ClientSession"] = None

    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()

    async def _wait_for_rate_limit(self):
        """Enforce rate limiting between requests."""
        current_time = time.time()
        time_since_last = current_time - self.last_request_time
        if time_since_last < self.min_request_interval:
            await asyncio.sleep(self.min_request_interval - time_since_last)
        self.last_request_time = time.time()

    async def geocode(
        self, location: str, use_cache: bool = True
    ) -> Optional[EventLocation]:
        """Geocode a location string asynchronously."""
        cache_key = cache_get_key(location.lower().strip(), prefix="google")
        cache_path = self.cache_config.geocoding_dir / f"{cache_key}.json"

        if use_cache and cache_path.exists():
            try:
                async with aiofiles.open(cache_path, "r", encoding="utf-8") as f:
                    content = await f.read()
                    data = json.loads(content)
                    if data:
                        return EventLocation(
                            name=data["name"],
                            country=data["country"],
                            locality=data["locality"],
                            coordinates=Coordinates(lat=data["lat"], lon=data["lon"]),
                        )
                    return None
            except (json.JSONDecodeError, IOError) as e:
                logger.warning(f"Cache read error for {cache_path}: {e}")

        # Rate limiting
        await self._wait_for_rate_limit()

        # Build request
        params = {
            "address": location,
            "key": self.api_key,
            "region": "pt",
            "language": "pt",
        }
        url = f"{self.base_url}?{urllib.parse.urlencode(params)}"

        try:
            assert self.session is not None
            status, content = await http_get(self.session, url)
            if status != 200:
                logger.error(f"GEOCODING|Bad status|{location}|{status}")
                return None

            data = json.loads(content)
            if data["status"] != "OK" or not data["results"]:
                logger.warning(f"GEOCODING|No results|{location}|{data['status']}")
                # Cache negative result
                cache_path.parent.mkdir(parents=True, exist_ok=True)
                async with aiofiles.open(cache_path, "w", encoding="utf-8") as f:
                    await f.write("null")
                return None

            # Extract location data
            result = data["results"][0]
            location_data = {
                "name": location,
                "lat": result["geometry"]["location"]["lat"],
                "lon": result["geometry"]["location"]["lng"],
                "country": "Portugal",
                "locality": location.split(",")[0].strip(),
            }

            # Find country and locality from address components
            for component in result["address_components"]:
                types = component["types"]
                if "country" in types:
                    location_data["country"] = component["long_name"]
                elif "locality" in types:
                    location_data["locality"] = component["long_name"]
                elif (
                    "administrative_area_level_1" in types
                    and location_data["locality"] == location.split(",")[0].strip()
                ):
                    location_data["locality"] = component["long_name"]

            # Cache the result
            cache_path.parent.mkdir(parents=True, exist_ok=True)
            async with aiofiles.open(cache_path, "w", encoding="utf-8") as f:
                await f.write(json.dumps(location_data, ensure_ascii=False, indent=2))

            return EventLocation(
                name=location,
                country=location_data["country"],
                locality=location_data["locality"],
                coordinates=Coordinates(
                    lat=location_data["lat"], lon=location_data["lon"]
                ),
            )

        except Exception as e:
            logger.error(f"GEOCODING|Error|{location}|{str(e)}")
            return None


class LLMClient:
    """Client for LLM description generation."""

    def __init__(self, model: str, cache_config: CacheConfig):
        self.model = model
        self.cache_config = cache_config

    async def _cached_llm_call(self, system_prompt: str, user_prompt: str, cache_suffix: str = "", use_cache: bool = True) -> str:
        """Execute cached LLM call with system and user prompts."""
        # Create cache key from system + user prompt + model
        cache_input = f"{system_prompt}|{user_prompt}|{self.model}"
        cache_key = cache_get_key(cache_input)
        cache_filename = f"{cache_key}{cache_suffix}.txt"
        cache_path = self.cache_config.descriptions_dir / cache_filename
        
        # Check cache first
        if use_cache and cache_path.exists():
            async with aiofiles.open(cache_path, "r", encoding="utf-8") as f:
                return (await f.read()).strip()
        
        # Make LLM call
        try:
            _, stdout, stderr = await subprocess_run(
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

        return await self._cached_llm_call(system_prompt, text, "_description", use_cache)

    async def infer_event_data(self, text: str, use_cache: bool = True) -> Tuple[List[EventType], List[int]]:
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
            output = await self._cached_llm_call(system_prompt, text, "_infer", use_cache)
            
            # Parse the output
            lines = output.split('\n')
            event_types = []
            distances = []
            
            for line in lines:
                if line.startswith("event_types:"):
                    types_str = line.replace("event_types:", "").strip()
                    if types_str:
                        for type_str in types_str.split(','):
                            type_str = type_str.strip()
                            try:
                                # Validate that it's a valid EventType
                                event_type = EventType(type_str)
                                event_types.append(event_type)
                            except ValueError:
                                logger.warning(f"LLM returned invalid event type: {type_str}")
                
                elif line.startswith("distances:"):
                    distances_str = line.replace("distances:", "").strip()
                    if distances_str:
                        for dist_str in distances_str.split(','):
                            try:
                                distance = int(dist_str.strip())
                                if 100 <= distance <= 200000:  # Reasonable range
                                    distances.append(distance)
                            except ValueError:
                                logger.warning(f"LLM returned invalid distance: {dist_str}")
            
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


async def save_events(events: List[Event], output_path: str) -> None:
    """
    Save events to JSON file asynchronously.

    Args:
        events: List of event dictionaries
        output_path: Path to output JSON file
    """
    output_file = Path(output_path)
    async with aiofiles.open(output_file, "w", encoding="utf-8") as f:
        await f.write(json.dumps(events, ensure_ascii=False, indent=2))


# ============================================================================
# Event Builder Enrichment
# ============================================================================


def _enrich_extract_event_types_from_word_press_class_list(
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
            ]
        )

        ignored = wp_class in ignored_classes
        ignored |= wp_class.startswith("post-")
        ignored |= wp_class.startswith("event_location-")

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
    }

    event_types = []
    for wp_class in class_list:
        if _ignored_class(wp_class):
            continue

        if wp_class not in type_mapping:
            # TODO(claude): you should print a descriptive warning here so we can later fix this missing type mapping
            continue

        for event_type in type_mapping[wp_class]:
            if event_type not in event_types:
                event_types.append(event_type)

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


def enrich_from_event_details(builder: EventBuilder, details: WEvent):
    event_types = _enrich_extract_event_types_from_word_press_class_list(
        details.class_list
    )
    for event_type in event_types:
        builder.add_event_type(event_type)

    if details.title != "":
        builder.set_name(details.title)

    if details.content is not None:
        builder.set_description(details.content)

    if details.featured_image_src is not None:
        builder.add_image(details.featured_image_src)


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
    if builder.event_description is None:
        return
    short_description = await llm.generate_description(builder.event_description)
    builder.set_description_short(short_description)


async def encrich_from_google_maps(
    builder: EventBuilder, google: GoogleGeocodingClient
):
    if builder.event_location is None:
        return

    location = await google.geocode(builder.event_location)
    if location is None:
        # TODO(claude): put a nice warning here saying that we failed to geocode the event location
        return

    builder.event_location = location.name
    builder.event_locality = location.locality
    builder.event_coordinates = location.coordinates
    builder.event_country = location.country


def enrich_distances_from_description(builder: EventBuilder):
    if builder.event_description is None:
        return
    for distance in _enrich_extract_distances_from_text(builder.event_description):
        builder.add_distance(distance)


def enrich_distances_from_types(builder: EventBuilder):
    for event_type in builder.event_types:
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
    delay: float
    model: str
    max_concurrent: int
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
    include_all: bool


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
class DownloadImageArgs:
    """Arguments for the download-image command."""

    url: str
    output: str


@dataclass
class ProfileArgs:
    """Arguments for the profile command."""

    operations: Optional[List[str]]


@dataclass
class CacheArgs:
    """Arguments for the cache command."""

    cache_command: str
    type: Optional[str] = None


# ============================================================================
# Subcommand Handlers
# ============================================================================


async def cmd_event(args: EventArgs):
    # Setup
    cache_config = CacheConfig()
    cache_config.ensure_directories()

    google_key = os.environ.get(ENV_GOOGLE_MAPS_API_KEY)
    assert google_key is not None, "missing google maps api key"

    http_session = http_session_create()
    geo_client = GoogleGeocodingClient(google_key, cache_config)
    llm_client = LLMClient(args.model, cache_config)
    wp_client = WordPressClient(http_session, PORTUGAL_RUNNING_BASE_URL, cache_config)

    event_builder = EventBuilder(args.event_id)
    event_details = await wp_client.fetch_event_details(args.event_id)
    event_ics = await wp_client.fetch_event_ics(args.event_id)

    pprint.pprint(event_details)
    pprint.pprint(event_ics)

    enrich_from_event_details(event_builder, event_details)
    enrich_from_event_ics(event_builder, event_ics)
    await enrich_from_llm(event_builder, llm_client)
    await encrich_from_google_maps(event_builder, geo_client)
    enrich_distances_from_description(event_builder)
    enrich_distances_from_types(event_builder)

    # Build the final event
    event = event_builder.build()

    # Print the final event as JSON
    print(json.dumps(event.to_dict(), ensure_ascii=False, indent=2))

    await http_session.close()


async def cmd_scrape(args: ScrapeArgs):
    """Main scraping pipeline with improved data flow."""
    logger.info("Starting event scraping")

    # Setup
    cache_config = CacheConfig()
    cache_config.enabled = not args.no_cache
    cache_config.ensure_directories()

    print(
        f"🔄 Fetching events (limit: {args.limit if args.limit else 'unlimited'}) with {args.max_concurrent} concurrent requests..."
    )

    google_key = os.environ.get(ENV_GOOGLE_MAPS_API_KEY)
    assert google_key is not None, "missing google maps api key"

    http_session = http_session_create()
    geo_client = GoogleGeocodingClient(google_key, cache_config)
    llm_client = LLMClient(args.model, cache_config)
    wp_client = WordPressClient(
        http_session, PORTUGAL_RUNNING_BASE_URL, cache_config, args.max_concurrent
    )

    # Step 1: Fetch all pages in parallel
    pages = await fetch_pages(wp_client, args)
    print(f"✅ Fetched {len(pages)} pages")

    # Step 2: Extract event IDs from pages
    event_ids = extract_event_ids_from_pages(pages)
    print(f"✅ Found {len(event_ids)} unique event IDs")

    # Step 3: Fetch raw event data in parallel (placeholder for now)
    events = await fetch_events(wp_client, event_ids)
    print(f"✅ Fetched raw data for {len(events)} events")

    # Step 4: Fetch ICS data in parallel
    events_ics = await fetch_events_ics(wp_client, event_ids)
    print(f"✅ Fetched ICS data for {len(events_ics)} events")

    # Step 5: Extract metadata from events and ICS
    events_metadata = extract_events_metadata(events, events_ics)
    print(f"✅ Extracted metadata for {len(events_metadata)} events")

    # Step 6: Generate descriptions in parallel (if not skipped)
    if not args.skip_descriptions:
        events_with_descriptions = await generate_descriptions(events_metadata, args)
        print("✅ Generated descriptions for events")
    else:
        events_with_descriptions = events_metadata
        print("⏭️  Skipped description generation")

    # Step 7: Build final event instances
    final_events = build_final_events(events_with_descriptions)
    print(f"✅ Built {len(final_events)} final events")

    # Step 8: Save results
    await save_events(final_events, args.output)
    print(f"✅ Saved {len(final_events)} events to {args.output}")

    return 0


async def cmd_fetch_page(args: FetchPageArgs):
    """Fetch a single page of events."""
    cache_config = CacheConfig()
    cache_config.ensure_directories()

    async with WordPressClient(PORTUGAL_RUNNING_BASE_URL, cache_config) as wp_client:
        events = await wp_client.fetch_events_page(
            args.page, use_cache=not args.no_cache
        )

        if events is None:
            logger.error(f"Failed to fetch page {args.page}")
            return 1

        print(json.dumps(events, ensure_ascii=False, indent=2))
        return 0


async def cmd_fetch_event(args: FetchEventArgs):
    """Fetch detailed event data."""
    cache_config = CacheConfig()
    cache_config.ensure_directories()

    async with WordPressClient(PORTUGAL_RUNNING_BASE_URL, cache_config) as wp_client:
        event_data = await wp_client.fetch_event_details(
            args.event_id, use_cache=not args.no_cache
        )

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


async def cmd_geocode(args: GeocodeArgs):
    """Geocode a location."""
    cache_config = CacheConfig()
    cache_config.ensure_directories()

    # Get API key
    api_key = args.api_key or os.environ.get("GOOGLE_MAPS_API_KEY")
    if not api_key:
        logger.error(
            "No Google Maps API key found. Set GOOGLE_MAPS_API_KEY environment variable or use --api-key"
        )
        return 1

    # Clear cache if requested
    if args.clear_cache:
        count = cache_clear(cache_config.geocoding_dir)
        print(f"Cleared {count} cache files")
        if not args.location:
            return 0

    if not args.location:
        logger.error("No location provided")
        return 1

    async with GoogleGeocodingClient(api_key, cache_config) as client:
        result = await client.geocode(args.location, use_cache=not args.no_cache)

    if result is None:
        logger.error(f"Failed to geocode '{args.location}'")
        return 1

    output = result.to_dict()
    if args.debug:
        output["cache_used"] = not args.no_cache

    print(json.dumps(output, ensure_ascii=False, indent=2))
    return 0


async def cmd_describe(args: DescribeArgs):
    """Generate event description."""
    cache_config = CacheConfig()
    cache_config.ensure_directories()

    client = LLMClient(args.model, cache_config)
    description = await client.generate_description(
        args.text, use_cache=not args.no_cache
    )

    if description is None:
        logger.error("Failed to generate description")
        return 1

    print(description)
    return 0


async def cmd_download_image(args: DownloadImageArgs):
    """Download an image."""
    output_path = Path(args.output)

    async with aiohttp.ClientSession() as session:
        if await http_download_file(session, args.url, output_path):
            print(str(output_path))
            return 0
        else:
            logger.error(f"Failed to download {args.url}")
            return 1


def cmd_profile(args: ProfileArgs):
    """Profile extraction performance."""
    print("🔬 Profiling extraction pipeline...")

    # This would implement performance profiling
    # For now, just a placeholder
    print("Profile functionality not yet implemented")
    return 0


def cmd_cache(args: CacheArgs):
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
                count = cache_clear(cache_dirs[args.type])
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
                count = cache_clear(cache_dir)
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
            stats = cache_get_stats(cache_dir)
            if stats["exists"]:
                print(
                    f"{name:.<20} {stats['files']:>6} files, {stats['size_mb']:>8.2f} MB"
                )
                total_files += stats["files"]
                total_size += stats["size"]
            else:
                print(f"{name:.<20} (not found)")

        print(
            f"\n{'Total':.<20} {total_files:>6} files, {total_size / 1024 / 1024:>8.2f} MB"
        )

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
            print(
                "Available cache types: pages, events, geocoding, descriptions, images"
            )

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
        help="Set logging level (default: WARNING)",
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
        default="portugal-running-events.json",
        help="Output JSON file (default: portugal-running-events.json)",
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
        "--delay",
        type=float,
        default=0.5,
        help="Delay between page requests in seconds (default: 0.5)",
    )
    scrape_parser.add_argument(
        "--model",
        default="claude-3.5-haiku",
        help="LLM model for descriptions (default: claude-3.5-haiku)",
    )
    scrape_parser.add_argument(
        "--max-concurrent",
        type=int,
        default=10,
        help="Maximum concurrent requests (default: 10)",
    )
    scrape_parser.add_argument(
        "--no-cache", action="store_true", help="Skip cache and force fresh fetch"
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
    fetch_event_parser.add_argument(
        "--include-all",
        action="store_true",
        help="Include geocoding, descriptions, and images",
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
    describe_parser.add_argument(
        "--model",
        default="claude-3.5-haiku",
        help="LLM model to use (default: claude-3.5-haiku)",
    )
    describe_parser.set_defaults(func=cmd_describe)

    # Event command
    event_parser = subparsers.add_parser(
        "event", help="Fetch and display detailed information for a single event"
    )
    event_parser.add_argument("event_id", type=int, help="Event ID to fetch")
    event_parser.add_argument(
        "--model",
        default="claude-3.5-haiku",
        help="LLM model to use (default: claude-3.5-haiku)",
    )
    event_parser.set_defaults(func=cmd_event)

    # Download-image command
    download_parser = subparsers.add_parser(
        "download-image", help="Download an image from URL"
    )
    download_parser.add_argument("url", help="Image URL to download")
    download_parser.add_argument("output", help="Output file path")
    download_parser.set_defaults(func=cmd_download_image)

    # Profile command
    profile_parser = subparsers.add_parser(
        "profile", help="Profile extraction performance"
    )
    profile_parser.add_argument(
        "--operations", nargs="+", help="Specific operations to profile"
    )
    profile_parser.set_defaults(func=cmd_profile)

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
        help="Clear specific cache type (default: all)",
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

    cache_parser.set_defaults(func=cmd_cache)

    # Parse arguments
    args = parser.parse_args()

    # Setup logging
    setup_logging(args.log_level)

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
                delay=args.delay,
                model=args.model,
                max_concurrent=args.max_concurrent,
                no_cache=args.no_cache,
            )
            return await cmd_scrape(cmd_args)
        elif args.command == "fetch-page":
            cmd_args = FetchPageArgs(page=args.page, no_cache=args.no_cache)
            return await cmd_fetch_page(cmd_args)
        elif args.command == "fetch-event":
            cmd_args = FetchEventArgs(
                event_id=args.event_id,
                no_cache=args.no_cache,
                include_all=args.include_all,
            )
            return await cmd_fetch_event(cmd_args)
        elif args.command == "geocode":
            cmd_args = GeocodeArgs(
                location=args.location,
                no_cache=args.no_cache,
                clear_cache=args.clear_cache,
                debug=args.debug,
                api_key=args.api_key,
            )
            return await cmd_geocode(cmd_args)
        elif args.command == "describe":
            cmd_args = DescribeArgs(
                text=args.text, no_cache=args.no_cache, model=args.model
            )
            return await cmd_describe(cmd_args)
        elif args.command == "event":
            cmd_args = EventArgs(event_id=args.event_id, model=args.model)
            return await cmd_event(cmd_args)
        elif args.command == "download-image":
            cmd_args = DownloadImageArgs(url=args.url, output=args.output)
            return await cmd_download_image(cmd_args)
        elif args.command == "profile":
            cmd_args = ProfileArgs(operations=args.operations)
            return cmd_profile(cmd_args)
        elif args.command == "cache":
            cmd_args = CacheArgs(
                cache_command=args.cache_command,
                type=args.type if hasattr(args, "type") else None,
            )
            return cmd_cache(cmd_args)
        else:
            logger.error(f"Unknown command: {args.command}")
            return 1
    except KeyboardInterrupt:
        print("\n⚠️  Interrupted by user", file=sys.stderr)
        return 130
    except Exception:
        logger.exception("Unhandled exception")
        return 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))

    # async def _geocode_location(self, location: str) -> Optional[Dict]:
    #     """Geocode location using async geocoding client."""
    #     try:
    #         # Get API key
    #         api_key = os.environ.get("GOOGLE_MAPS_API_KEY")
    #         if not api_key:
    #             logger.error(
    #                 "GEOCODING|No API key|Set GOOGLE_MAPS_API_KEY environment variable"
    #             )
    #             return None
    #
    #         # Use async geocoding client
    #         async with GoogleGeocodingClient(
    #             api_key, self.cache_config
    #         ) as geocoding_client:
    #             location_result = await geocoding_client.geocode(location)
    #
    #             if location_result:
    #                 return {
    #                     "coordinates": {
    #                         "lat": location_result.coordinates.lat,
    #                         "lon": location_result.coordinates.lon,
    #                     },
    #                     "display_name": location_result.name,
    #                     "country": location_result.country,
    #                     "locality": location_result.locality,
    #                 }
    #             return None
    #
    #     except Exception as e:
    #         logger.error(f"GEOCODING|Error|{location}|{str(e)}")
    #         return None
    #
    # async def _generate_description(self, description: str) -> Optional[str]:
    #     """Generate short description using async LLM client."""
    #     try:
    #         llm_client = LLMClient("claude-3.5-haiku", self.cache_config)
    #         return await llm_client.generate_description(description)
    #     except Exception as e:
    #         logger.error(f"LLM|Error|{str(e)}")
    #         return None

