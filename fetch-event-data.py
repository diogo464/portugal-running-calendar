#!/usr/bin/env python3
"""
Fetch detailed event data for a specific event ID with caching.

This script fetches ICS data, geocoding, descriptions, and images for a single event,
using aggressive caching to avoid redundant API calls.

Usage:
    python3 fetch-event-data.py <event_id> [--verbose]
    
Returns JSON with structured event data including:
- ICS calendar data (dates, location, description)
- Geocoding coordinates
- Short description (LLM-generated)
- Downloaded images

All external API calls are cached using MD5 hashes for performance.
"""

import json
import subprocess
import re
import time
import hashlib
import os
import sys
import argparse
from pathlib import Path
from typing import Optional, Dict, Any
from dataclasses import dataclass


@dataclass
class IcsData:
    """Structured data extracted from ICS calendar files."""
    location: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    description: Optional[str] = None
    summary: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "location": self.location,
            "start_date": self.start_date,
            "end_date": self.end_date,
            "description": self.description,
            "summary": self.summary
        }


def log_error(category, message, context=None):
    """Log structured error message to stderr."""
    if context:
        print(f"ERROR|{category}|{message}|{context}", file=sys.stderr)
    else:
        print(f"ERROR|{category}|{message}", file=sys.stderr)


def log_warning(category, message, context=None):
    """Log structured warning message to stderr."""
    if context:
        print(f"WARNING|{category}|{message}|{context}", file=sys.stderr)
    else:
        print(f"WARNING|{category}|{message}", file=sys.stderr)


def log_info(category, message, context=None, verbose=False):
    """Log structured info message to stderr."""
    if verbose:
        if context:
            print(f"INFO|{category}|{message}|{context}", file=sys.stderr)
        else:
            print(f"INFO|{category}|{message}", file=sys.stderr)


class EventDataFetcher:
    def __init__(self, verbose=False):
        self.verbose = verbose
        self.cache_dir = Path("event_data_cache")
        self.cache_dir.mkdir(exist_ok=True)
        
    def get_cache_path(self, event_id: int) -> Path:
        """Get cache file path for an event ID."""
        return self.cache_dir / f"event_{event_id}.json"
        
    def load_from_cache(self, event_id: int) -> Optional[Dict[str, Any]]:
        """Load event data from cache if available."""
        cache_path = self.get_cache_path(event_id)
        if cache_path.exists():
            try:
                with open(cache_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    log_info("CACHE", f"Loaded event {event_id} from cache", verbose=self.verbose)
                    return data
            except Exception as e:
                log_warning("CACHE", f"Failed to load cache for event {event_id}", str(e))
        return None
        
    def save_to_cache(self, event_id: int, data: Dict[str, Any]):
        """Save event data to cache."""
        cache_path = self.get_cache_path(event_id)
        try:
            with open(cache_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
                log_info("CACHE", f"Saved event {event_id} to cache", verbose=self.verbose)
        except Exception as e:
            log_warning("CACHE", f"Failed to save cache for event {event_id}", str(e))

    def fix_encoding(self, text: str) -> str:
        """Fix common UTF-8 encoding issues where text was incorrectly interpreted as ISO-8859-1."""
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
            '—': 'â', 'C—mara': 'Câmara', 'Dist—ncias': 'Distâncias',
            'Const—ncia': 'Constância', 'Gr—ndola': 'Grândola',
            'ORGANIZAÇÇO': 'ORGANIZAÇÃO', 'SÇO': 'SÃO',
            'EdiÃ§Ã£o': 'Edição', 'organizaÃ§Ã£o': 'organização',
        }
        
        for wrong, correct in additional_fixes.items():
            result = result.replace(wrong, correct)
            result = result.replace(wrong.lower(), correct.lower())
            
        return result

    def extract_ics_data(self, event_id: int) -> Optional[IcsData]:
        """Fetch ICS data for an event with encoding detection and fallback."""
        try:
            result = subprocess.run(
                ["./fetch-event-ics.sh", str(event_id)],
                capture_output=True,
                timeout=30,
            )
            if result.returncode != 0:
                log_warning("ICS", f"Failed to fetch ICS data for event {event_id}", 
                           result.stderr.decode('utf-8', errors='replace').strip() if result.stderr else "Unknown error")
                return None

            # Try multiple encodings to decode the content
            raw_content = result.stdout
            
            try:
                ics_content = raw_content.decode('utf-8', errors='replace')
                log_info("ICS", f"Successfully decoded ICS for event {event_id} using UTF-8", verbose=self.verbose)
            except Exception:
                encodings = ['latin-1', 'cp1252', 'iso-8859-1']
                ics_content = None
                
                for encoding in encodings:
                    try:
                        ics_content = raw_content.decode(encoding)
                        log_info("ICS", f"Successfully decoded ICS for event {event_id} using {encoding}", verbose=self.verbose)
                        break
                    except UnicodeDecodeError:
                        continue
                
                if ics_content is None:
                    log_error("ICS", f"Could not decode ICS for event {event_id} with any encoding")
                    return None
            
            # Clean the content
            ics_content = ics_content.replace('\x00', '')
            ics_content = ''.join(c for c in ics_content if ord(c) >= 32 or c in '\n\r\t')
            
            if not ics_content.strip() or "BEGIN:VCALENDAR" not in ics_content:
                log_warning("ICS", f"Invalid ICS content for event {event_id}")
                return None
            
            ics_data = IcsData()

            # Extract location
            location_match = re.search(r"LOCATION:(.+)", ics_content)
            if location_match:
                location = location_match.group(1).strip()
                location = location.replace("\\,", ",").replace("  ", " ")
                parts = location.split()
                unique_parts = []
                for part in parts:
                    if part not in unique_parts:
                        unique_parts.append(part)
                ics_data.location = " ".join(unique_parts)

            # Extract summary
            summary_match = re.search(r"SUMMARY:(.+)", ics_content)
            if summary_match:
                ics_data.summary = summary_match.group(1).strip()

            # Extract dates
            dtstart_match = re.search(r"DTSTART:(\d+)", ics_content)
            if dtstart_match:
                date_str = dtstart_match.group(1)
                if len(date_str) == 8:
                    ics_data.start_date = f"{date_str[:4]}-{date_str[4:6]}-{date_str[6:8]}"

            dtend_match = re.search(r"DTEND:(\d+)", ics_content)
            if dtend_match:
                date_str = dtend_match.group(1)
                if len(date_str) == 8:
                    ics_data.end_date = f"{date_str[:4]}-{date_str[4:6]}-{date_str[6:8]}"

            # Extract description
            desc_match = re.search(r"DESCRIPTION:(.+?)(?=\n[A-Z]|\nEND:)", ics_content, re.DOTALL)
            if desc_match:
                desc = (desc_match.group(1)
                       .replace("\n ", "")
                       .replace("\\n", "\n")
                       .replace("\\,", ","))
                ics_data.description = self.fix_encoding(desc.strip())

            return ics_data

        except subprocess.TimeoutExpired:
            log_error("TIMEOUT", f"ICS fetch timeout for event {event_id}")
            return None
        except Exception as e:
            log_error("ICS", f"Unexpected error fetching ICS for event {event_id}", str(e))
            return None

    def geocode_location(self, location: str) -> Optional[Dict[str, Any]]:
        """Geocode location using Google Maps API via the Python geocoding script."""
        if not location:
            return None

        try:
            cmd = ["python3", "./geocode-location.py", location]
            if self.verbose:
                cmd.append("--verbose")

            result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
            if result.returncode != 0:
                log_warning("GEOCODING", f"Geocoding failed for location: {location}", 
                           result.stderr.strip() if result.stderr else "Unknown error")
                return None

            output = result.stdout.strip()
            if output == "null" or not output:
                return None

            try:
                geo_data = json.loads(output)
                if not geo_data:
                    return None

                lat = geo_data.get("lat", 0)
                lon = geo_data.get("lon", 0)
                
                return {
                    "coordinates": {"lat": lat, "lon": lon},
                    "display_name": geo_data.get("name", ""),
                    "country": geo_data.get("country", ""),
                    "locality": geo_data.get("locality", ""),
                }
            except json.JSONDecodeError as e:
                log_error("JSON", f"Invalid JSON from geocoding for location: {location}", str(e))
                return None

        except subprocess.TimeoutExpired:
            log_error("TIMEOUT", f"Geocoding timeout for location: {location}")
            return None
        except Exception as e:
            log_error("GEOCODING", f"Unexpected geocoding error for location: {location}", str(e))
            return None

    def generate_short_description(self, description: str) -> Optional[str]:
        """Generate a short description using LLM with caching."""
        if not description:
            return None

        try:
            result = subprocess.run(
                ["./generate-one-line-description.sh", description],
                capture_output=True,
                text=True,
                timeout=60,
            )
            if result.returncode == 0:
                short_desc = result.stdout.strip()
                if short_desc and len(short_desc) < 200:
                    return short_desc
            else:
                log_warning("LLM", f"Description generation failed", 
                           result.stderr.strip() if result.stderr else f"Return code: {result.returncode}")
        except subprocess.TimeoutExpired:
            log_error("TIMEOUT", "Description generation timeout after 60 seconds")
        except Exception as e:
            log_error("LLM", "Unexpected error generating short description", str(e))

        return None

    def download_image(self, image_url: str, media_dir: str = "media") -> Optional[str]:
        """Download image from URL and save with hash filename."""
        if not image_url:
            return None

        try:
            Path(media_dir).mkdir(exist_ok=True)

            url_hash = hashlib.md5(image_url.encode()).hexdigest()
            from urllib.parse import urlparse
            parsed_url = urlparse(image_url)
            path_parts = parsed_url.path.split(".")
            extension = path_parts[-1].lower() if len(path_parts) > 1 else "jpg"

            if extension not in ["jpg", "jpeg", "png", "gif", "webp"]:
                extension = "jpg"

            filename = f"{url_hash}.{extension}"
            filepath = os.path.join(media_dir, filename)

            if os.path.exists(filepath):
                return filepath

            result = subprocess.run(
                ["./download-image.sh", image_url, filepath],
                capture_output=True,
                text=True,
                timeout=60,
            )
            if result.returncode != 0:
                log_warning("IMAGE", f"Failed to download image: {image_url}", 
                           result.stderr.strip() if result.stderr else "Unknown error")
                return None

            log_info("IMAGE", f"Downloaded: {image_url} -> {filepath}", verbose=self.verbose)
            return filepath

        except subprocess.TimeoutExpired:
            log_error("TIMEOUT", f"Image download timeout: {image_url}")
            return None
        except Exception as e:
            log_error("IMAGE", f"Unexpected error downloading image: {image_url}", str(e))
            return None

    def fetch_event_data(self, event_id: int, 
                        skip_geocoding: bool = False,
                        skip_descriptions: bool = False, 
                        skip_images: bool = False) -> Dict[str, Any]:
        """Fetch complete event data for a single event ID."""
        
        # Check cache first
        cached_data = self.load_from_cache(event_id)
        if cached_data:
            return cached_data
        
        log_info("FETCH", f"Fetching data for event {event_id}", verbose=self.verbose)
        
        # Extract ICS data
        ics_data = self.extract_ics_data(event_id)
        
        # Geocode location if available
        geo_data = None
        if not skip_geocoding and ics_data and ics_data.location:
            geo_data = self.geocode_location(ics_data.location)
        
        # Generate short description
        short_description = None
        if not skip_descriptions and ics_data and ics_data.description:
            short_description = self.generate_short_description(ics_data.description)
        
        # Prepare result
        result = {
            "event_id": event_id,
            "ics_data": ics_data.to_dict() if ics_data else None,
            "geo_data": geo_data,
            "short_description": short_description,
            "images": [],
            "fetched_at": time.time()
        }
        
        # Save to cache
        self.save_to_cache(event_id, result)
        
        return result


def main():
    parser = argparse.ArgumentParser(
        description="Fetch detailed event data for a specific event ID",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s 12345                    # Fetch all data for event 12345
  %(prog)s 12345 --verbose          # Fetch with detailed logging
  %(prog)s 12345 --skip-geocoding   # Skip geocoding step
        """,
    )
    
    parser.add_argument("event_id", type=int, help="Event ID to fetch data for")
    parser.add_argument("--verbose", "-v", action="store_true", help="Verbose output")
    parser.add_argument("--skip-geocoding", action="store_true", help="Skip geocoding")
    parser.add_argument("--skip-descriptions", action="store_true", help="Skip description generation")
    parser.add_argument("--skip-images", action="store_true", help="Skip image downloading")
    
    args = parser.parse_args()
    
    if args.event_id <= 0:
        parser.error("event_id must be positive")
    
    # Fetch the data
    fetcher = EventDataFetcher(verbose=args.verbose)
    data = fetcher.fetch_event_data(
        args.event_id,
        skip_geocoding=args.skip_geocoding,
        skip_descriptions=args.skip_descriptions,
        skip_images=args.skip_images
    )
    
    # Output JSON
    print(json.dumps(data, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()