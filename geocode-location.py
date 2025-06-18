#!/usr/bin/env python3
"""
Geocode location using OpenStreetMap Nominatim API with caching

A Python implementation of the geocoding script with enhanced features:
- Caching for performance
- Configurable filtering of address types
- Verbose output for debugging
- Rate limiting for API compliance
"""

import argparse
import json
import hashlib
import re
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Optional, Dict, List, Any


class Geocoder:
    def __init__(self, cache_dir: str = "geocoding_cache", all_types: bool = False):
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(exist_ok=True)
        self.all_types = all_types

        # Relevant address types for places (excluding transport infrastructure, etc.)
        self.relevant_types = {
            "city",
            "town",
            "village",
            "hamlet",
            "municipality",
            "county",
            "suburb",
            "city_district",
            "neighbourhood",
            "quarter",
        }

        # User agent for API compliance
        self.user_agent = "portugal-running-geocoder/1.0"

        # Common Portuguese location corrections
        self.location_corrections = {
            "mondim de basto bastos": "mondim de basto",
            "vila real vila real": "vila real",
            "porto porto": "porto",
            "lisboa lisboa": "lisboa",
        }

    def clean_location(self, location: str) -> str:
        """Clean up location string by removing duplicates and normalizing spaces."""
        if not location:
            return location

        # Remove escaped commas, normalize spaces
        cleaned = location.replace("\\,", ",")
        cleaned = re.sub(r"\s+", " ", cleaned).strip()

        # Remove duplicate words (e.g. "Lisboa Lisboa" -> "Lisboa")
        words = cleaned.split()
        unique_words = []
        for word in words:
            if word not in unique_words:
                unique_words.append(word)

        return " ".join(unique_words)

    def preprocess_location(self, location: str) -> List[str]:
        """Generate multiple cleaned variations of the location."""
        if not location:
            return []

        location_lower = location.lower().strip()
        variants = [location_lower]

        # Apply known corrections
        for wrong, correct in self.location_corrections.items():
            if wrong in location_lower:
                variants.append(location_lower.replace(wrong, correct))

        # Remove duplicate words (like "Basto Bastos" -> "Basto")
        words = location_lower.split()
        deduplicated = []
        for word in words:
            if word not in deduplicated:
                deduplicated.append(word)
        if len(deduplicated) != len(words):
            variants.append(" ".join(deduplicated))

        # Remove duplicates while preserving order
        seen = set()
        unique_variants = []
        for variant in variants:
            if variant not in seen:
                seen.add(variant)
                unique_variants.append(variant)

        return unique_variants

    def get_cache_key(self, location: str) -> str:
        """Generate cache key for location."""
        return hashlib.md5(location.encode()).hexdigest()

    def get_cached_result(self, cache_key: str) -> tuple[Optional[Dict[str, Any]], bool]:
        """Get cached geocoding result. Returns (result, cache_hit)."""
        cache_file = self.cache_dir / f"{cache_key}.json"
        if cache_file.exists():
            try:
                with open(cache_file, "r", encoding="utf-8") as f:
                    content = f.read().strip()
                    if content == "null":
                        return None, True  # Cached negative result
                    return json.loads(content), True  # Cached positive result
            except (json.JSONDecodeError, IOError):
                # Remove corrupted cache file
                cache_file.unlink(missing_ok=True)
        return None, False  # Cache miss

    def cache_result(self, cache_key: str, result: Optional[Dict[str, Any]]) -> None:
        """Cache geocoding result."""
        cache_file = self.cache_dir / f"{cache_key}.json"
        try:
            with open(cache_file, "w", encoding="utf-8") as f:
                if result is None:
                    f.write("null")
                else:
                    json.dump(result, f, indent=2, ensure_ascii=False)
        except IOError:
            pass  # Ignore cache write errors

    def query_nominatim(self, location: str) -> Optional[List[Dict[str, Any]]]:
        """Query Nominatim API for location."""
        encoded_location = urllib.parse.quote_plus(location)
        url = f"https://nominatim.openstreetmap.org/search?format=json&q={encoded_location}"

        try:
            request = urllib.request.Request(url)
            request.add_header("User-Agent", self.user_agent)

            with urllib.request.urlopen(request, timeout=30) as response:
                data = json.loads(response.read().decode("utf-8"))
                return data if isinstance(data, list) else None

        except Exception as e:
            print(f"HTTP request failed: {e}", file=sys.stderr)
            raise  # Re-raise to trigger non-zero exit code

    def prioritize_results(self, results: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Prioritize results by address type relevance, but include all types."""
        if self.all_types:
            return results

        # Separate relevant and non-relevant types
        relevant_results = []
        other_results = []

        for result in results:
            address_type = result.get("addresstype", "")
            if address_type in self.relevant_types:
                relevant_results.append(result)
            else:
                other_results.append(result)

        # Return relevant types first, then others (de-prioritized but not filtered out)
        return relevant_results + other_results

    def format_result(self, result: Dict[str, Any]) -> Dict[str, Any]:
        """Format result into clean structure."""
        try:
            lat = float(result.get("lat", 0))
            lon = float(result.get("lon", 0))

            # Parse bounding box
            bbox = result.get("boundingbox", [])
            if len(bbox) >= 4:
                south = float(bbox[0])
                north = float(bbox[1])
                west = float(bbox[2])
                east = float(bbox[3])
            else:
                # Fallback bbox around coordinates
                south = north = lat
                west = east = lon

            return {
                "name": result.get("name", ""),
                "display_name": result.get("display_name", ""),
                "addresstype": result.get("addresstype", ""),
                "coordinates": {"lat": lat, "lon": lon},
                "boundingbox": {
                    "south": south,
                    "north": north,
                    "west": west,
                    "east": east,
                },
            }
        except (ValueError, TypeError):
            return None

    def _try_single_location(
        self, location: str, verbose: bool = False
    ) -> Optional[Dict[str, Any]]:
        """Try to geocode a single location string."""
        # Clean location
        cleaned_location = self.clean_location(location)

        # Check cache
        cache_key = self.get_cache_key(cleaned_location)
        cached_result, cache_hit = self.get_cached_result(cache_key)
        if cache_hit:
            if verbose:
                result_type = "cached result" if cached_result else "cached negative result"
                print(f"Using {result_type} for: '{location}'", file=sys.stderr)
            return cached_result

        # Query API
        results = self.query_nominatim(cleaned_location)
        if not results:
            self.cache_result(cache_key, None)
            return None

        # Prioritize results (relevant types first, but include all)
        prioritized_results = self.prioritize_results(results)

        # Get best result (highest importance, with relevant types having priority)
        best_result = max(
            prioritized_results, key=lambda x: float(x.get("importance", 0))
        )
        formatted_result = self.format_result(best_result)

        if formatted_result:
            self.cache_result(cache_key, formatted_result)
            return formatted_result

        self.cache_result(cache_key, None)
        return None

    def geocode(self, location: str, verbose: bool = False) -> Optional[Dict[str, Any]]:
        """Enhanced geocoding with preprocessing and multiple fallback strategies."""
        if not location:
            return None

        # Check cache for the original location first
        original_cache_key = self.get_cache_key(location.lower().strip())
        cached_result, cache_hit = self.get_cached_result(original_cache_key)
        if cache_hit:
            if verbose:
                result_type = "cached result" if cached_result else "cached negative result"
                print(f"Using {result_type} for original location: '{location}'", file=sys.stderr)
            return cached_result

        if verbose:
            print(f"Enhanced geocoding for: '{location}'", file=sys.stderr)

        # Strategy 1: Try preprocessed variants (handles duplicates, common errors)
        variants = self.preprocess_location(location)
        if len(variants) > 1 and verbose:
            print(
                f"Generated {len(variants)} preprocessed variants: {variants}",
                file=sys.stderr,
            )

        for variant in variants:
            if verbose:
                print(f"Trying variant: '{variant}'", file=sys.stderr)
            result = self._try_single_location(variant, verbose)
            if result:
                if verbose:
                    print(f"✓ Success with variant: '{variant}'", file=sys.stderr)
                # Cache the successful result for the original location too
                self.cache_result(original_cache_key, result)
                return result

        # Strategy 2: Comma-based progressive fallback
        location_parts = [part.strip() for part in location.split(",") if part.strip()]
        if len(location_parts) > 1:
            if verbose:
                print(
                    f"Trying comma-based fallback with {len(location_parts)} parts",
                    file=sys.stderr,
                )

            for i in range(len(location_parts)):
                current_location = ", ".join(location_parts[i:])

                if verbose:
                    print(
                        f"Fallback attempt {i+1}: '{current_location}'", file=sys.stderr
                    )

                result = self._try_single_location(current_location, verbose)
                if result:
                    if verbose:
                        print(
                            f"✓ Success with fallback: '{current_location}'",
                            file=sys.stderr,
                        )
                    # Cache the successful result for the original location too
                    self.cache_result(original_cache_key, result)
                    return result
                elif verbose:
                    print(f"✗ Failed fallback: '{current_location}'", file=sys.stderr)

        # All strategies failed - cache the negative result for the original location
        if verbose:
            print(f"All geocoding strategies failed for: '{location}'", file=sys.stderr)
        
        # Cache the negative result to avoid retrying all strategies for the same location
        self.cache_result(original_cache_key, None)
        return None


def main():
    parser = argparse.ArgumentParser(
        description="Geocode location using OpenStreetMap Nominatim API",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s "Lisboa"                    # Geocode Lisboa
  %(prog)s "Lisboa" --verbose          # With detailed output
  %(prog)s "Lisboa" --all-types        # Include all address types
  %(prog)s "Lisboa" --cache-dir /tmp   # Custom cache directory
        """,
    )

    parser.add_argument("location", help="Location to geocode")

    parser.add_argument(
        "--all-types",
        action="store_true",
        help="Include all address types, not just relevant ones (cities, towns, etc.)",
    )

    parser.add_argument(
        "--verbose", "-v", action="store_true", help="Verbose output for debugging"
    )

    parser.add_argument(
        "--cache-dir",
        default="geocoding_cache",
        help="Cache directory for results (default: geocoding_cache)",
    )

    parser.add_argument(
        "--no-cache", action="store_true", help="Skip cache and always query API"
    )

    args = parser.parse_args()

    # Create geocoder
    geocoder = Geocoder(cache_dir=args.cache_dir, all_types=args.all_types)

    # If no-cache is specified, clear any existing cache for this location
    if args.no_cache:
        cleaned_location = geocoder.clean_location(args.location)
        cache_key = geocoder.get_cache_key(cleaned_location)
        cache_file = geocoder.cache_dir / f"{cache_key}.json"
        cache_file.unlink(missing_ok=True)

    # Geocode
    try:
        result = geocoder.geocode(args.location, verbose=args.verbose)

        # Output result
        if result:
            print(json.dumps(result, indent=2, ensure_ascii=False))
        else:
            print("null")
    except Exception as e:
        print(f"Geocoding failed: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
