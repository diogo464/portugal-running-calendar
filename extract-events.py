#!/usr/bin/env python3
"""
Portugal Running Events Extractor

A comprehensive tool for extracting, enriching, and processing running events
from the Portugal Running website.

Features:
- Fetches events from WordPress API with pagination
- Geocodes locations for coordinates and bounding boxes
- Generates short descriptions using LLM
- Downloads and processes event images
- Supports limiting extraction for testing
- Configurable output and processing options
"""

import json
import subprocess
import re
import time
import hashlib
import os
import argparse
import sys
from enum import Enum
from urllib.parse import urlparse
from pathlib import Path
from typing import Optional, List, Dict, Any


class EventType(Enum):
    """Canonical event types"""

    MARATHON = "marathon"
    HALF_MARATHON = "half-marathon"
    TEN_K = "10k"
    FIVE_K = "5k"
    RUN = "run"
    TRAIL = "trail"
    WALK = "walk"
    CROSS_COUNTRY = "cross-country"
    SAINT_SILVESTER = "saint-silvester"


# Distance constants in meters
DISTANCES = {
    EventType.MARATHON: 42195,
    EventType.HALF_MARATHON: 21097,
    EventType.TEN_K: 10000,
    EventType.FIVE_K: 5000,
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


class EventExtractor:
    def __init__(self, args):
        self.args = args
        self.events = []
        self.processed_events = []
        self.errors = []

        # Canonical event type mapping
        # Maps original event types to clean, standardized types
        # Add mappings as we discover new types during extraction
        self.event_type_mapping = {
            # Marathon types
            "Maratona": EventType.MARATHON.value,
            "Meia-Maratona": EventType.HALF_MARATHON.value,
            "marathon": EventType.MARATHON.value,
            # Trail types
            "T-Trail": EventType.TRAIL.value,
            "T-Trail Curto": EventType.TRAIL.value,
            "T-Trail Longo": EventType.TRAIL.value,
            "Trail": EventType.TRAIL.value,
            # Running types
            "Corrida": EventType.RUN.value,
            "Corrida 10 km": EventType.TEN_K.value,
            "Corrida 5 km": EventType.FIVE_K.value,
            # Walking types
            "Caminhada": EventType.WALK.value,
            # Cross country
            "Cross": EventType.CROSS_COUNTRY.value,
            # Class List
            "event_type-corrida-10-km": EventType.TEN_K.value,
            "event_type-meiamaratona": EventType.HALF_MARATHON.value,
            "event_type-maratona": EventType.MARATHON.value,
            "event_type-corrida": EventType.RUN.value,
            "event_type-trail": EventType.TRAIL.value,
            "event_type-trail-curto": EventType.TRAIL.value,
            "event_type-trail-longo": EventType.TRAIL.value,
            "event_type-caminhada": EventType.WALK.value,
            "São Silvestre": EventType.SAINT_SILVESTER.value,
            "event_type-sao-silvestre": EventType.SAINT_SILVESTER.value,
            # Ignore
            "ajde_events": None,
            "type-ajde_events": None,
            "status-publish": None,
            "has-post-thumbnail": None,
            "hentry": None,
            # Circuit and organization categories to ignore
            "event_type_5-circuito-atrp": None,
        }

    def fetch_all_events(self) -> List[Dict]:
        """Fetch events from WordPress API with optional limits."""
        events = []
        page = 1
        total_fetched = 0

        print(
            f"🔄 Fetching events (limit: {self.args.limit if self.args.limit else 'unlimited'})..."
        )

        while True:
            if self.args.pages and page > self.args.pages:
                print(f"   Reached page limit ({self.args.pages})")
                break

            if self.args.limit and total_fetched >= self.args.limit:
                print(f"   Reached event limit ({self.args.limit})")
                break

            print(f"   Fetching page {page}...")
            try:
                result = subprocess.run(
                    ["./fetch-event-page.sh", str(page)],
                    capture_output=True,
                    text=True,
                    timeout=30,
                )
                if result.returncode != 0:
                    log_error("HTTP", f"Failed to fetch page {page}", result.stderr.strip())
                    break

                page_data = json.loads(result.stdout)

                # Check for WordPress API error responses
                if isinstance(page_data, dict) and "code" in page_data:
                    if page_data.get("code") == "rest_post_invalid_page_number":
                        log_info("PAGINATION", f"Reached end of available pages at page {page}", verbose=self.args.verbose)
                        break
                    else:
                        log_error("API", f"WordPress API error at page {page}", page_data.get('message', 'Unknown error'))
                        break

                if not page_data:  # Empty page means we've reached the end
                    log_info("PAGINATION", f"No more events found at page {page}", verbose=self.args.verbose)
                    break

                # Apply limit if specified
                if self.args.limit:
                    remaining = self.args.limit - total_fetched
                    if remaining <= 0:
                        break
                    page_data = page_data[:remaining]

                events.extend(page_data)
                total_fetched += len(page_data)
                print(f"   -> Found {len(page_data)} events (total: {total_fetched})")

                page += 1
                time.sleep(self.args.delay)

            except json.JSONDecodeError as e:
                log_error("JSON", f"Invalid JSON response from page {page}", str(e))
                break
            except subprocess.TimeoutExpired:
                log_error("TIMEOUT", f"Request timeout fetching page {page}")
                break
            except Exception as e:
                log_error("UNKNOWN", f"Unexpected error on page {page}", str(e))
                break

        print(f"✅ Fetched {len(events)} total events")
        return events

    def fetch_taxonomy_names(
        self, taxonomy_type: str, taxonomy_ids: List[int]
    ) -> List[str]:
        """Fetch taxonomy names from IDs."""
        if not taxonomy_ids:
            return []

        names = []
        for tax_id in taxonomy_ids:
            try:
                result = subprocess.run(
                    ["./fetch-taxonomy-name.sh", taxonomy_type, str(tax_id)],
                    capture_output=True,
                    text=True,
                    timeout=30,
                )
                if result.returncode == 0 and result.stdout.strip():
                    data = json.loads(result.stdout)
                    names.append(data.get("name", ""))
                else:
                    log_warning("TAXONOMY", f"Failed to fetch {taxonomy_type} name for ID {tax_id}", result.stderr.strip() if result.stderr else "Empty response")
            except json.JSONDecodeError as e:
                log_error("JSON", f"Invalid JSON from taxonomy lookup {taxonomy_type}:{tax_id}", str(e))
            except subprocess.TimeoutExpired:
                log_error("TIMEOUT", f"Taxonomy lookup timeout {taxonomy_type}:{tax_id}")
            except Exception as e:
                log_error("TAXONOMY", f"Unexpected error fetching {taxonomy_type}:{tax_id}", str(e))

        return [name for name in names if name]

    def fix_encoding(self, text: str) -> str:
        """Fix common UTF-8 encoding issues where text was incorrectly interpreted as ISO-8859-1.
        
        This handles cases like:
        - "SantarÃ©m" -> "Santarém"
        - "EdiÃ§Ã£o" -> "Edição"
        - "CÃ¢mara" -> "Câmara"
        """
        if not text:
            return text
            
        # First pass: Common UTF-8 sequences that were misinterpreted as ISO-8859-1
        replacements = {
            'Ã¡': 'á',  # á
            'Ã ': 'à',  # à
            'Ã¢': 'â',  # â
            'Ã£': 'ã',  # ã
            'Ã©': 'é',  # é
            'Ãª': 'ê',  # ê
            'Ã­': 'í',  # í
            'Ã³': 'ó',  # ó
            'Ã´': 'ô',  # ô
            'Ãµ': 'õ',  # õ
            'Ãº': 'ú',  # ú
            'Ã§': 'ç',  # ç
            'Ã±': 'ñ',  # ñ
            'Ã': 'Á',  # Á
            'Ã': 'À',  # À
            'Ã': 'É',  # É
            'Ã': 'Í',  # Í
            'Ã': 'Ó',  # Ó
            'Ã': 'Ú',  # Ú
            'Ã': 'Ç',  # Ç
            'â': '"',  # left quote
            'â': '"',  # right quote
            'â': '–',  # en dash
            'â': '—',  # em dash
            'â¢': '•',  # bullet
            'â¦': '…',  # ellipsis
        }
        
        result = text
        for wrong, correct in replacements.items():
            result = result.replace(wrong, correct)
            
        # Second pass: Handle specific problematic patterns
        # These are cases where the encoding was corrupted differently
        additional_fixes = {
            'C—mara': 'Câmara',  # Common in Portuguese text
            'Dist—ncias': 'Distâncias',
            'Const—ncia': 'Constância',
            'dist—ncia': 'distância',
            'compet—ncia': 'competência',
            'experi—ncia': 'experiência',
            'import—ncia': 'importância',
            'ORGANIZAÇÇO': 'ORGANIZAÇÃO',
            'APRESENTAÇÇO': 'APRESENTAÇÃO',
            'SÇO': 'SÃO',  # Common in São Silvestre races
            'EdiÃ§Ã£o': 'Edição',
            'organizaÃ§Ã£o': 'organização',
            'AssociaÃ§Ã£o': 'Associação',
            'FundaÃ§Ã£o': 'Fundação',
            'InscriÃ§Ã£o': 'Inscrição',
            'ParticipacÃ£o': 'Participação',
            'ClassificaÃ§Ã£o': 'Classificação',
            'RealizaÃ§Ã£o': 'Realização',
            'OrganizaÃ§Ã£o': 'Organização',
            'localizaÃ§Ã£o': 'localização',
            'ConclusÃ£o': 'Conclusão',
            'InformaÃ§Ã£o': 'Informação',
            'DireÃ§Ã£o': 'Direção',
            'PromoÃ§Ã£o': 'Promoção',
            'CompetiÃ§Ã£o': 'Competição',
            'FederaÃ§Ã£o': 'Federação',
            'DuraÃ§Ã£o': 'Duração',
            'CoordenaÃ§Ã£o': 'Coordenação',
            'SituaÃ§Ã£o': 'Situação',
            'PopulaÃ§Ã£o': 'População',
            'AlimentaÃ§Ã£o': 'Alimentação',
            'HidrataÃ§Ã£o': 'Hidratação',
            'AvaliaÃ§Ã£o': 'Avaliação',
            'DescriÃ§Ã£o': 'Descrição',
        }
        
        for wrong, correct in additional_fixes.items():
            result = result.replace(wrong, correct)
            # Also handle lowercase versions
            result = result.replace(wrong.lower(), correct.lower())
            
        return result

    def fetch_ics_data(self, event_id: int) -> Optional[Dict[str, str]]:
        """Fetch ICS data for an event with encoding detection and fallback."""
        try:
            # First try to get raw bytes to handle encoding issues
            result = subprocess.run(
                ["./fetch-event-ics.sh", str(event_id)],
                capture_output=True,
                timeout=30,
            )
            if result.returncode != 0:
                log_warning("ICS", f"Failed to fetch ICS data for event {event_id}", result.stderr.decode('utf-8', errors='replace').strip() if result.stderr else "Unknown error")
                return None

            # Try multiple encodings to decode the content
            ics_content = None
            raw_content = result.stdout
            
            # List of encodings to try in order
            encodings = ['utf-8', 'latin-1', 'cp1252', 'iso-8859-1']
            
            for encoding in encodings:
                try:
                    ics_content = raw_content.decode(encoding)
                    if self.args.verbose:
                        log_info("ICS", f"Successfully decoded ICS for event {event_id} using {encoding}", verbose=True)
                    break
                except UnicodeDecodeError:
                    continue
            
            if ics_content is None:
                # Last resort: decode with errors='replace' to avoid complete failure
                ics_content = raw_content.decode('utf-8', errors='replace')
                log_warning("ICS", f"Used fallback decoding for event {event_id}", "May contain corrupted characters")
            
            # Clean the content of any problematic characters
            ics_content = ics_content.replace('\x00', '')  # Remove null bytes
            ics_content = ''.join(c for c in ics_content if ord(c) >= 32 or c in '\n\r\t')  # Remove control chars except whitespace
            
            # Basic ICS validation
            if not ics_content.strip():
                log_warning("ICS", f"Empty ICS content for event {event_id}")
                return None
                
            if "BEGIN:VCALENDAR" not in ics_content:
                log_warning("ICS", f"Invalid ICS format for event {event_id}", "Missing VCALENDAR header")
                return None
            
            ics_data = {}

            # Extract and clean location
            location_match = re.search(r"LOCATION:(.+)", ics_content)
            if location_match:
                location = location_match.group(1).strip()
                location = location.replace("\\,", ",").replace("  ", " ")
                # Remove duplicate parts
                parts = location.split()
                unique_parts = []
                for part in parts:
                    if part not in unique_parts:
                        unique_parts.append(part)
                ics_data["location"] = self.fix_encoding(" ".join(unique_parts))

            # Extract dates
            dtstart_match = re.search(r"DTSTART:(\d+)", ics_content)
            if dtstart_match:
                date_str = dtstart_match.group(1)
                if len(date_str) == 8:
                    ics_data["start_date"] = (
                        f"{date_str[:4]}-{date_str[4:6]}-{date_str[6:8]}"
                    )

            dtend_match = re.search(r"DTEND:(\d+)", ics_content)
            if dtend_match:
                date_str = dtend_match.group(1)
                if len(date_str) == 8:
                    ics_data["end_date"] = (
                        f"{date_str[:4]}-{date_str[4:6]}-{date_str[6:8]}"
                    )

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
                ics_data["description"] = self.fix_encoding(desc.strip())

            return ics_data

        except subprocess.TimeoutExpired:
            log_error("TIMEOUT", f"ICS fetch timeout for event {event_id}")
            return None
        except Exception as e:
            log_error("ICS", f"Unexpected error fetching ICS for event {event_id}", str(e))
            return None

    def geocode_location(self, location: str) -> Optional[Dict[str, Any]]:
        """Geocode location using the enhanced Python geocoding script."""
        if not location or self.args.skip_geocoding:
            return None

        try:
            # Use the enhanced Python geocoder (handles all strategies internally)
            cmd = ["python3", "./geocode-location.py", location]
            if self.args.verbose:
                cmd.append("--verbose")

            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=30,
            )
            if result.returncode != 0:
                log_warning("GEOCODING", f"Geocoding failed for location: {location}", result.stderr.strip() if result.stderr else "Unknown error")
                return None

            # Parse the clean JSON output
            output = result.stdout.strip()
            if output == "null" or not output:
                return None

            try:
                geo_data = json.loads(output)
                if not geo_data:
                    return None

                return {
                    "coordinates": geo_data.get("coordinates", {}),
                    "bounding_box": geo_data.get("boundingbox", {}),
                    "display_name": geo_data.get("display_name", ""),
                    "name": geo_data.get("name", ""),
                    "addresstype": geo_data.get("addresstype", ""),
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
        """Generate a short description using the existing script with caching."""
        if not description or self.args.skip_descriptions:
            return None

        try:
            # Use longer timeout for LLM generation, but caching makes this much faster
            result = subprocess.run(
                ["./generate-one-line-description.sh", description],
                capture_output=True,
                text=True,
                timeout=60,
            )
            if result.returncode == 0:
                short_desc = result.stdout.strip()
                # Clean up any extra content
                if short_desc and len(short_desc) < 200:  # Sanity check
                    return short_desc
            else:
                log_warning("LLM", f"Description generation failed for event", result.stderr.strip() if result.stderr else f"Return code: {result.returncode}")
        except subprocess.TimeoutExpired:
            log_error("TIMEOUT", "Description generation timeout after 60 seconds")
        except Exception as e:
            log_error("LLM", "Unexpected error generating short description", str(e))

        return None

    def download_image(self, image_url: str, media_dir: str = "media") -> Optional[str]:
        """Download image from URL and save with hash filename. Return local path."""
        if not image_url or self.args.skip_images:
            return None

        try:
            # Create media directory if it doesn't exist
            Path(media_dir).mkdir(exist_ok=True)

            # Generate filename from URL hash
            url_hash = hashlib.md5(image_url.encode()).hexdigest()

            # Get file extension from URL
            parsed_url = urlparse(image_url)
            path_parts = parsed_url.path.split(".")
            extension = path_parts[-1].lower() if len(path_parts) > 1 else "jpg"

            # Ensure valid extension
            if extension not in ["jpg", "jpeg", "png", "gif", "webp"]:
                extension = "jpg"

            filename = f"{url_hash}.{extension}"
            filepath = os.path.join(media_dir, filename)

            # Skip if already downloaded
            if os.path.exists(filepath):
                return filepath

            # Download the image using cached script
            result = subprocess.run(
                ["./download-image.sh", image_url, filepath],
                capture_output=True,
                text=True,
                timeout=60,
            )
            if result.returncode != 0:
                log_warning("IMAGE", f"Failed to download image: {image_url}", result.stderr.strip() if result.stderr else "Unknown error")
                return None

            if self.args.verbose:
                print(f"   Downloaded: {image_url} -> {filepath}")
            return filepath

        except subprocess.TimeoutExpired:
            log_error("TIMEOUT", f"Image download timeout: {image_url}")
            return None
        except Exception as e:
            log_error("IMAGE", f"Unexpected error downloading image: {image_url}", str(e))
            return None

    def map_event_types(self, original_types: List[str]) -> List[str]:
        """Map original event types to canonical types."""
        canonical_types = set()

        for original_type in original_types:
            if original_type.startswith("post-"):
                continue
            if original_type.startswith("event_location-"):
                continue
            if original_type.startswith("event_type_2-"):
                continue
            if original_type.startswith("event_organizer-"):
                continue
            if original_type in self.event_type_mapping:
                canonical_type = self.event_type_mapping[original_type]
                if canonical_type is not None:
                    canonical_types.add(canonical_type)
            else:
                # Warning - unmapped type found, but continue processing
                log_warning("MAPPING", f"Unmapped event type found: {original_type}", f"All types: {original_types}")
                # Continue processing without this type

        return list(canonical_types)

    def extract_distances_and_types(
        self, description: str, event_types: List[str], class_list: List[str]
    ) -> tuple[List[int], List[str]]:
        """Extract distances and event types from description and taxonomies."""
        # Map event types using canonical mapping
        canonical_types = set(self.map_event_types(event_types + class_list))

        # Search description for additional event types
        desc_lower = description.lower()

        # Marathon patterns
        if (
            any(word in desc_lower for word in ["maratona", "marathon"])
            and "meia" not in desc_lower
        ):
            canonical_types.add(EventType.MARATHON.value)
        elif any(
            word in desc_lower
            for word in ["meia-maratona", "meia maratona", "half marathon"]
        ):
            canonical_types.add(EventType.HALF_MARATHON.value)

        # Distance patterns
        if any(word in desc_lower for word in ["10 km", "10km", "10k"]):
            canonical_types.add(EventType.TEN_K.value)
        if any(word in desc_lower for word in ["5 km", "5km", "5k"]):
            canonical_types.add(EventType.FIVE_K.value)

        # Trail patterns
        if any(word in desc_lower for word in ["trail", "trilho", "montanha"]):
            canonical_types.add(EventType.TRAIL.value)

        # Walking patterns
        if any(word in desc_lower for word in ["caminhada", "walk"]):
            canonical_types.add(EventType.WALK.value)

        # Cross country patterns
        if any(word in desc_lower for word in ["cross", "corta-mato"]):
            canonical_types.add(EventType.CROSS_COUNTRY.value)

        # Extract distances
        distances = set()

        # Add standard distances for known event types
        for event_type in canonical_types:
            event_enum = EventType(event_type)
            if event_enum in DISTANCES:
                distances.add(DISTANCES[event_enum])

        # Extract custom distances from description
        # Match patterns like "15km", "15 km", "15K", "15 K", "15000m", "15000 m"
        distance_patterns = [
            r"(\d+(?:\.\d+)?)\s*km?\b",  # 15km, 15 km, 15k, 15 k
            r"(\d+(?:\.\d+)?)\s*K\b",  # 15K, 15 K
            r"(\d+)\s*m\b",  # 15000m, 15000 m (meters)
        ]

        for pattern in distance_patterns:
            matches = re.findall(pattern, desc_lower, re.IGNORECASE)
            for match in matches:
                try:
                    distance = float(match)
                    if pattern.endswith("m\\b"):  # meters pattern
                        if 100 <= distance <= 50000:  # reasonable range in meters
                            distances.add(int(distance))
                    else:  # km/K patterns
                        if 0.1 <= distance <= 50:  # reasonable range in km
                            distances.add(int(distance * 1000))  # convert to meters
                except ValueError:
                    continue

        return sorted(list(distances)), sorted(list(canonical_types))

    def process_event(self, event_data: dict) -> Dict[str, Any]:
        """Process a single event and return enriched data."""
        event_start_time = time.time()
        event_id = event_data["id"]
        event_name = self.fix_encoding(event_data["title"]["rendered"])
        class_list = event_data.get("class_list", [])

        if self.args.verbose:
            print(f"   Processing event {event_id}: {event_name}")

        # Get taxonomy names (with error handling)
        start_time = time.time()
        event_types = self.fetch_taxonomy_names(
            "event_type", event_data.get("event_type", [])
        )
        circuits = self.fetch_taxonomy_names(
            "event_type_5", event_data.get("event_type_5", [])
        )
        taxonomy_time = time.time() - start_time
        if self.args.verbose:
            print(f"     Taxonomy lookups took {taxonomy_time:.3f}s")

        # Get ICS data
        start_time = time.time()
        ics_data = self.fetch_ics_data(event_id) or {}
        location = ics_data.get("location", "")
        start_date = ics_data.get("start_date")
        end_date = ics_data.get("end_date")
        description = (
            ics_data.get("description", "") or event_data["content"]["rendered"]
        )
        ics_time = time.time() - start_time
        if self.args.verbose:
            print(f"     ICS data fetch took {ics_time:.3f}s")

        # Geocode location
        start_time = time.time()
        geo_data = self.geocode_location(location)
        coordinates = geo_data.get("coordinates") if geo_data else None
        bounding_box = geo_data.get("bounding_box") if geo_data else None
        location_display_name = geo_data.get("display_name") if geo_data else location
        geocoding_time = time.time() - start_time

        # Warning if geocoding failed for events with location data
        if location and not geo_data:
            log_warning("GEOCODING", f"Geocoding failed for event {event_id}", f"Location: {location}")

        if self.args.verbose:
            print(f"     Geocoding took {geocoding_time:.3f}s")

        # Extract distances and canonical types
        start_time = time.time()
        distances, canonical_types = self.extract_distances_and_types(
            description, event_types, class_list
        )
        extraction_time = time.time() - start_time
        if self.args.verbose:
            print(f"     Distance/type extraction took {extraction_time:.3f}s")

        # Generate short description
        start_time = time.time()
        short_description = self.generate_short_description(description)
        description_time = time.time() - start_time
        if self.args.verbose:
            print(f"     Description generation took {description_time:.3f}s")

        # Download and process images
        start_time = time.time()
        images = []
        if event_data.get("featured_image_src"):
            image_url = event_data["featured_image_src"]
            local_path = self.download_image(image_url)
            if local_path:
                images.append(local_path)
            else:
                # Fallback to original URL if download fails
                images.append(image_url)
        image_time = time.time() - start_time
        if self.args.verbose:
            print(f"     Image downloading took {image_time:.3f}s")

        # Calculate total event processing time
        total_event_time = time.time() - event_start_time
        if self.args.verbose:
            print(f"     Total event processing took {total_event_time:.3f}s")

        return {
            "event_id": event_id,
            "event_name": event_name,
            "event_location": location_display_name,
            "event_coordinates": coordinates,
            "event_bounding_box": bounding_box,
            "event_distances": distances,
            "event_types": canonical_types,
            "event_images": images,
            "event_start_date": start_date,
            "event_end_date": end_date,
            "event_circuit": circuits,
            "event_description": description,
            "description_short": short_description,
        }

    def run(self):
        """Main extraction process."""
        print("🏃‍♂️ Portugal Running Events Extractor")
        print("=" * 40)

        if self.args.verbose:
            print(f"Configuration:")
            print(f"  Limit: {self.args.limit if self.args.limit else 'unlimited'}")
            print(f"  Pages: {self.args.pages if self.args.pages else 'unlimited'}")
            print(f"  Skip geocoding: {self.args.skip_geocoding}")
            print(f"  Skip descriptions: {self.args.skip_descriptions}")
            print(f"  Skip images: {self.args.skip_images}")
            print(f"  Output: {self.args.output}")
            print()

        # Fetch all events
        self.events = self.fetch_all_events()

        if not self.events:
            print("❌ No events found to process")
            return

        # Process events
        print(f"\n🔄 Processing {len(self.events)} events...")

        for i, event in enumerate(self.events):
            try:
                if not self.args.verbose and i % 10 == 0:
                    print(
                        f"   Progress: {i}/{len(self.events)} events processed ({i/len(self.events)*100:.1f}%)"
                    )

                processed_event = self.process_event(event)
                self.processed_events.append(processed_event)

                # Add delay every few events to be respectful
                if i % 5 == 0:
                    time.sleep(self.args.delay)

            except Exception as e:
                event_id = event.get('id', 'unknown')
                error_msg = f"Error processing event {event_id}: {str(e)[:100]}"
                self.errors.append(error_msg)
                log_error("PROCESSING", f"Failed to process event {event_id}", str(e))
                continue

        # Sort events by date (earliest first, latest last)
        print(f"\n📅 Sorting events by date...")

        def get_event_date(event):
            """Get event date for sorting, using start_date or fallback to event_id"""
            date_str = event.get("event_start_date")
            if date_str:
                try:
                    # Parse date string (YYYY-MM-DD format)
                    return date_str
                except:
                    pass
            # Fallback to event_id for consistent ordering
            return f"9999-12-31-{event.get('event_id', 0):06d}"

        self.processed_events.sort(key=get_event_date)

        # Save results
        print(f"\n💾 Saving results to {self.args.output}...")

        with open(self.args.output, "w", encoding="utf-8") as f:
            json.dump(self.processed_events, f, indent=2, ensure_ascii=False)

        # Summary
        print(f"\n🎉 Extraction completed!")
        print(f"   📊 Total events processed: {len(self.processed_events)}")
        print(f"   ❌ Events with errors: {len(self.errors)}")
        print(f"   📄 Output file: {self.args.output}")

        # Statistics
        if self.processed_events:
            events_with_coordinates = sum(
                1 for e in self.processed_events if e["event_coordinates"]
            )
            events_with_dates = sum(
                1 for e in self.processed_events if e["event_start_date"]
            )
            events_with_distances = sum(
                1 for e in self.processed_events if e["event_distances"]
            )
            events_with_short_desc = sum(
                1 for e in self.processed_events if e["description_short"]
            )
            events_with_images = sum(
                1 for e in self.processed_events if e["event_images"]
            )

            total_events = len(self.processed_events)
            print(f"\n📈 Data quality:")
            print(
                f"   🗺️  Events with coordinates: {events_with_coordinates} ({events_with_coordinates/total_events*100:.1f}%)"
            )
            print(
                f"   📅 Events with dates: {events_with_dates} ({events_with_dates/total_events*100:.1f}%)"
            )
            print(
                f"   🏃‍♀️ Events with distances: {events_with_distances} ({events_with_distances/total_events*100:.1f}%)"
            )
            print(
                f"   📝 Events with short descriptions: {events_with_short_desc} ({events_with_short_desc/total_events*100:.1f}%)"
            )
            print(
                f"   🖼️  Events with images: {events_with_images} ({events_with_images/total_events*100:.1f}%)"
            )
        else:
            print(f"\n📈 No events were successfully processed")

            # Show discovered types to help with mapping
            if self.errors:
                print(
                    f"\n🔍 To resolve mapping errors, add these types to event_type_mapping:"
                )
                unique_types = set()
                for error in self.errors:
                    if "Unmapped event type:" in error:
                        # Extract the type from error message
                        import re

                        match = re.search(r"Unmapped event type: '([^']+)'", error)
                        if match:
                            unique_types.add(match.group(1))

                for event_type in sorted(unique_types):
                    print(f'   "{event_type}": "canonical-name",')
                print(
                    f"\n   💡 Suggested canonical names: marathon, half-marathon, 10k, 5k, trail, run, walk, cross-country"
                )

        if self.errors and self.args.verbose:
            print(f"\n⚠️  Errors encountered:")
            for error in self.errors[-5:]:  # Show last 5 errors
                print(f"   • {error}")


def main():
    parser = argparse.ArgumentParser(
        description="Extract and process Portugal Running events",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s                           # Extract all events
  %(prog)s --limit 10                # Extract only 10 events
  %(prog)s --pages 2                 # Extract only first 2 pages
  %(prog)s --skip-images             # Skip image downloading
  %(prog)s --verbose --limit 5       # Detailed output for 5 events
  %(prog)s --output my-events.json   # Custom output filename
        """,
    )

    # Limiting options
    parser.add_argument(
        "--limit",
        "-l",
        type=int,
        help="Maximum number of events to extract (default: unlimited)",
    )
    parser.add_argument(
        "--pages",
        "-p",
        type=int,
        help="Maximum number of pages to fetch (default: unlimited)",
    )

    # Processing options
    parser.add_argument(
        "--skip-geocoding",
        action="store_true",
        help="Skip geocoding to speed up extraction",
    )
    parser.add_argument(
        "--skip-descriptions",
        action="store_true",
        help="Skip short description generation",
    )
    parser.add_argument(
        "--skip-images", action="store_true", help="Skip image downloading"
    )

    # Output options
    parser.add_argument(
        "--output",
        "-o",
        default="portugal-running-events.json",
        help="Output JSON filename (default: portugal-running-events.json)",
    )
    parser.add_argument(
        "--verbose",
        "-v",
        action="store_true",
        help="Verbose output with detailed progress",
    )

    # Performance options
    parser.add_argument(
        "--delay",
        type=float,
        default=0.0,
        help="Delay between API requests in seconds (default: 0.0)",
    )

    args = parser.parse_args()

    # Validate arguments
    if args.limit and args.limit <= 0:
        parser.error("--limit must be positive")
    if args.pages and args.pages <= 0:
        parser.error("--pages must be positive")
    if args.delay < 0:
        parser.error("--delay must be non-negative")

    # Run the extractor
    extractor = EventExtractor(args)
    extractor.run()


if __name__ == "__main__":
    main()
