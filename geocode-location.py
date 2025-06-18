#!/usr/bin/env python3
"""
Geocode location using Google Maps Geocoding API with caching

A Python implementation with enhanced features:
- Google Maps API for superior accuracy
- Dataclass-based clean data structures
- API client class for proper separation of concerns
- Caching for performance and cost optimization
- Comprehensive CLI for debugging and testing
- Rate limiting and error handling
"""

import argparse
import json
import hashlib
import os
import sys
import time
import urllib.parse
import urllib.request
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Optional, Dict, List, Any, Union


@dataclass
class LocationResult:
    """Standard location result format."""
    name: str
    country: str
    locality: str
    lat: float
    lon: float

    def to_dict(self) -> Dict[str, Union[str, float]]:
        """Convert to dictionary for JSON serialization."""
        return asdict(self)


@dataclass
class GoogleGeocodingResponse:
    """Full Google Geocoding API response data."""
    status: str
    results: List[Dict[str, Any]]
    error_message: Optional[str] = None


class GoogleGeocodingClient:
    """Google Maps Geocoding API client with caching and rate limiting."""
    
    def __init__(self, api_key: str, cache_dir: str = "geocoding_cache"):
        self.api_key = api_key
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(exist_ok=True)
        
        # Rate limiting: Google allows 50 QPS but we'll be conservative
        self.min_request_interval = 0.1  # 10 requests per second
        self.last_request_time = 0
        
        # Base URL for Google Geocoding API
        self.base_url = "https://maps.googleapis.com/maps/api/geocode/json"
    
    def _wait_for_rate_limit(self) -> None:
        """Enforce rate limiting between requests."""
        current_time = time.time()
        time_since_last = current_time - self.last_request_time
        if time_since_last < self.min_request_interval:
            sleep_time = self.min_request_interval - time_since_last
            time.sleep(sleep_time)
        self.last_request_time = time.time()
    
    def _get_cache_key(self, location: str) -> str:
        """Generate cache key for location."""
        # Include API provider in cache key to avoid conflicts with old OSM cache
        cache_input = f"google:{location.lower().strip()}"
        return hashlib.md5(cache_input.encode()).hexdigest()
    
    def _get_cached_result(self, cache_key: str) -> tuple[Optional[LocationResult], bool]:
        """Get cached geocoding result. Returns (result, cache_hit)."""
        cache_file = self.cache_dir / f"{cache_key}.json"
        if cache_file.exists():
            try:
                with open(cache_file, "r", encoding="utf-8") as f:
                    content = f.read().strip()
                    if content == "null":
                        return None, True  # Cached negative result
                    data = json.loads(content)
                    return LocationResult(**data), True  # Cached positive result
            except (json.JSONDecodeError, IOError, TypeError) as e:
                # Remove corrupted cache file
                cache_file.unlink(missing_ok=True)
                print(f"Warning: Removed corrupted cache file {cache_file}: {e}", file=sys.stderr)
        return None, False  # Cache miss
    
    def _cache_result(self, cache_key: str, result: Optional[LocationResult]) -> None:
        """Cache geocoding result."""
        cache_file = self.cache_dir / f"{cache_key}.json"
        try:
            with open(cache_file, "w", encoding="utf-8") as f:
                if result is None:
                    f.write("null")
                else:
                    json.dump(result.to_dict(), f, indent=2, ensure_ascii=False)
        except IOError as e:
            print(f"Warning: Failed to write cache file {cache_file}: {e}", file=sys.stderr)
    
    def _make_api_request(self, location: str, region: str = "pt") -> GoogleGeocodingResponse:
        """Make request to Google Geocoding API."""
        # Enforce rate limiting
        self._wait_for_rate_limit()
        
        # Build request URL with Portugal region bias
        params = {
            "address": location,
            "region": region,  # Bias results towards Portugal
            "key": self.api_key
        }
        url = f"{self.base_url}?{urllib.parse.urlencode(params)}"
        
        # Debug: Print URL (temporary)
        # print(f"DEBUG: API URL: {url}", file=sys.stderr)
        
        try:
            request = urllib.request.Request(url)
            request.add_header("User-Agent", "portugal-running-geocoder/2.0")
            
            with urllib.request.urlopen(request, timeout=30) as response:
                data = json.loads(response.read().decode("utf-8"))
                return GoogleGeocodingResponse(
                    status=data.get("status", "UNKNOWN"),
                    results=data.get("results", []),
                    error_message=data.get("error_message")
                )
        
        except urllib.error.HTTPError as e:
            if e.code == 400:
                return GoogleGeocodingResponse(
                    status="INVALID_REQUEST",
                    results=[],
                    error_message=f"Bad request (400): {e.reason}"
                )
            elif e.code == 403:
                return GoogleGeocodingResponse(
                    status="REQUEST_DENIED", 
                    results=[],
                    error_message=f"API key issue (403): {e.reason}"
                )
            else:
                raise
        except Exception as e:
            raise Exception(f"HTTP request failed: {e}")
    
    def _extract_location_components(self, result: Dict[str, Any]) -> tuple[str, str, str]:
        """Extract country and locality from Google's address_components."""
        country = ""
        locality = ""
        
        address_components = result.get("address_components", [])
        for component in address_components:
            types = component.get("types", [])
            
            # Extract country
            if "country" in types:
                country = component.get("long_name", "")
            
            # Extract locality (city/town/village)
            # Priority order: locality > administrative_area_level_3 > administrative_area_level_2
            if "locality" in types and not locality:
                locality = component.get("long_name", "")
            elif "administrative_area_level_3" in types and not locality:
                locality = component.get("long_name", "")
            elif "administrative_area_level_2" in types and not locality:
                locality = component.get("long_name", "")
        
        return country, locality
    
    def _parse_google_result(self, result: Dict[str, Any]) -> Optional[LocationResult]:
        """Parse Google API result into LocationResult."""
        try:
            # Get coordinates
            geometry = result.get("geometry", {})
            location = geometry.get("location", {})
            lat = float(location.get("lat", 0))
            lon = float(location.get("lng", 0))  # Note: Google uses 'lng', not 'lon'
            
            # Get formatted address as name
            name = result.get("formatted_address", "")
            
            # Extract country and locality
            country, locality = self._extract_location_components(result)
            
            # Skip country-level results (too generic)
            types = result.get("types", [])
            if "country" in types and not locality:
                if name == "Portugal":  # Only skip if it's just the country
                    return None
                
            return LocationResult(
                name=name,
                country=country,
                locality=locality,
                lat=lat,
                lon=lon
            )
        
        except (ValueError, TypeError, KeyError) as e:
            print(f"Warning: Failed to parse Google result: {e}", file=sys.stderr)
            return None
    
    def geocode(self, location: str, verbose: bool = False, skip_cache: bool = False, region: str = "pt", use_fallbacks: bool = True) -> Optional[LocationResult]:
        """
        Geocode a location using Google Maps API.
        
        Args:
            location: Location string to geocode
            verbose: Enable verbose logging
            skip_cache: Skip cache lookup and always query API
            region: Country code for regional bias (default: 'pt' for Portugal)
            use_fallbacks: Enable fallback strategies for Portuguese locations
            
        Returns:
            LocationResult or None if geocoding failed
        """
        if not location or not location.strip():
            return None
        
        location = location.strip()
        
        # Check cache first (unless skipping)
        cache_key = self._get_cache_key(location)
        if not skip_cache:
            cached_result, cache_hit = self._get_cached_result(cache_key)
            if cache_hit:
                if verbose:
                    result_type = "cached result" if cached_result else "cached negative result"
                    print(f"INFO: Using {result_type} for '{location}'", file=sys.stderr)
                return cached_result
        
        # Try primary location first
        result = self._try_geocode_single(location, region, verbose)
        if result:
            self._cache_result(cache_key, result)
            return result
        
        # If no result and fallbacks enabled, try Portuguese location patterns
        if use_fallbacks:
            fallback_variants = self._generate_portuguese_fallbacks(location)
            if verbose and fallback_variants:
                print(f"INFO: Generated {len(fallback_variants)} fallback variants", file=sys.stderr)
            for variant in fallback_variants:
                if verbose:
                    print(f"INFO: Trying fallback variant: '{variant}'", file=sys.stderr)
                
                variant_result = self._try_geocode_single(variant, region, verbose)
                if variant_result:
                    if verbose:
                        print(f"SUCCESS: Found with fallback variant: '{variant}'", file=sys.stderr)
                    # Cache successful result for the original location
                    self._cache_result(cache_key, variant_result)
                    return variant_result
        
        # All attempts failed
        if verbose:
            print(f"WARNING: All geocoding attempts failed for '{location}'", file=sys.stderr)
        
        # Cache negative result
        self._cache_result(cache_key, None)
        return None
    
    def _generate_portuguese_fallbacks(self, location: str) -> List[str]:
        """Generate fallback location variations for Portuguese locations."""
        fallbacks = []
        
        # Common Portuguese location prefixes
        prefixes = [
            "Alameda",    # Avenue/Boulevard  
            "Avenida",    # Avenue
            "Rua",        # Street
            "Largo",      # Square
            "Praça",      # Plaza/Square
            "Estrada",    # Road
            "Travessa",   # Lane
        ]
        
        # Try with Portugal suffix
        if not location.lower().endswith(", portugal"):
            fallbacks.append(f"{location}, Portugal")
        
        # Try with common prefixes (for parks that might actually be streets/avenues)
        for prefix in prefixes:
            if not location.lower().startswith(prefix.lower()):
                fallbacks.append(f"{prefix} {location}")
                # Also try with Portugal suffix
                fallbacks.append(f"{prefix} {location}, Portugal")
        
        # Try removing "Parque" prefix if present (parks might be named after streets)
        if location.lower().startswith("parque "):
            base_name = location[7:]  # Remove "Parque "
            fallbacks.append(base_name)
            fallbacks.append(f"{base_name}, Portugal")
            
            # Try with street prefixes - put Alameda first as it's most likely for Keil do Amaral
            priority_prefixes = ["Alameda"] + [p for p in prefixes if p != "Alameda"]
            for prefix in priority_prefixes:
                fallbacks.append(f"{prefix} {base_name}")
                fallbacks.append(f"{prefix} {base_name}, Portugal")
        
        return fallbacks
    
    def _try_geocode_single(self, location: str, region: str, verbose: bool) -> Optional[LocationResult]:
        """Try to geocode a single location variant."""
        if verbose:
            print(f"INFO: Geocoding '{location}' using Google Maps API", file=sys.stderr)
        
        # Make API request
        try:
            response = self._make_api_request(location, region)
            
            if verbose:
                print(f"INFO: Google API status: {response.status}", file=sys.stderr)
            
            # Handle API response status
            if response.status == "OK" and response.results:
                # Use the first result (Google orders by relevance)
                best_result = response.results[0]
                location_result = self._parse_google_result(best_result)
                
                if location_result:
                    if verbose:
                        print(f"SUCCESS: Found coordinates {location_result.lat}, {location_result.lon}", file=sys.stderr)
                    return location_result
                else:
                    if verbose:
                        print(f"ERROR: Failed to parse Google API result", file=sys.stderr)
            
            elif response.status == "ZERO_RESULTS":
                if verbose:
                    print(f"WARNING: No results found for '{location}'", file=sys.stderr)
            
            elif response.status == "OVER_QUERY_LIMIT":
                print(f"ERROR: Google API quota exceeded", file=sys.stderr)
                raise Exception("Google API quota exceeded")
            
            elif response.status == "REQUEST_DENIED":
                error_msg = f"Google API request denied: {response.error_message or 'Unknown reason'}"
                print(f"ERROR: {error_msg}", file=sys.stderr)
                raise Exception(error_msg)
            
            elif response.status == "INVALID_REQUEST":
                if verbose:
                    print(f"ERROR: Invalid request: {response.error_message or 'Unknown reason'}", file=sys.stderr)
            
            else:
                if verbose:
                    print(f"ERROR: Unexpected status '{response.status}': {response.error_message or 'No details'}", file=sys.stderr)
            
            return None
            
        except Exception as e:
            print(f"ERROR: Geocoding failed: {e}", file=sys.stderr)
            # Don't cache errors - they might be temporary
            raise
    
    def clear_cache(self, location: str) -> bool:
        """Clear cache for a specific location."""
        cache_key = self._get_cache_key(location)
        cache_file = self.cache_dir / f"{cache_key}.json"
        if cache_file.exists():
            cache_file.unlink()
            return True
        return False


def get_api_key() -> str:
    """Get Google Maps API key from environment or error."""
    api_key = os.getenv("GOOGLE_MAPS_API_KEY")
    if not api_key:
        print("ERROR: GOOGLE_MAPS_API_KEY environment variable not set", file=sys.stderr)
        print("Set it with: export GOOGLE_MAPS_API_KEY=your_api_key", file=sys.stderr)
        print("Or use: ./geocode-location.py \"Location\" --api-key YOUR_KEY", file=sys.stderr)
        sys.exit(1)
    return api_key


def main():
    parser = argparse.ArgumentParser(
        description="Geocode location using Google Maps Geocoding API",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s "Lisboa, Portugal"                   # Basic geocoding
  %(prog)s "Lisboa" --verbose                   # With detailed logging
  %(prog)s "Lisboa" --api-key YOUR_KEY          # Custom API key
  %(prog)s "Lisboa" --clear-cache               # Clear cache for location
  %(prog)s "Lisboa" --no-cache                  # Skip cache, always query API
  %(prog)s "Lisboa" --cache-dir /tmp/geocache   # Custom cache directory
  %(prog)s "Lisboa" --debug                     # Show raw Google API response

Environment:
  GOOGLE_MAPS_API_KEY: Google Maps API key (required unless --api-key used)
        """,
    )
    
    parser.add_argument("location", help="Location to geocode")
    
    parser.add_argument(
        "--api-key", 
        help="Google Maps API key (overrides GOOGLE_MAPS_API_KEY env var)"
    )
    
    parser.add_argument(
        "--verbose", "-v", 
        action="store_true", 
        help="Enable verbose logging to stderr"
    )
    
    parser.add_argument(
        "--debug",
        action="store_true",
        help="Show raw Google API response for debugging"
    )
    
    parser.add_argument(
        "--cache-dir",
        default="geocoding_cache",
        help="Cache directory for results (default: geocoding_cache)",
    )
    
    parser.add_argument(
        "--no-cache", 
        action="store_true", 
        help="Skip cache and always query API"
    )
    
    parser.add_argument(
        "--clear-cache", 
        action="store_true", 
        help="Clear cache for this location and exit (does not geocode)"
    )
    
    parser.add_argument(
        "--region",
        default="pt",
        help="Region bias for geocoding (default: 'pt' for Portugal)"
    )
    
    parser.add_argument(
        "--show-fallbacks",
        action="store_true",
        help="Show fallback variants that would be tried (no geocoding)"
    )
    
    args = parser.parse_args()
    
    # Get API key
    api_key = args.api_key or get_api_key()
    
    # Create client
    client = GoogleGeocodingClient(api_key=api_key, cache_dir=args.cache_dir)
    
    # Handle cache clearing
    if args.clear_cache:
        if client.clear_cache(args.location):
            if args.verbose:
                print(f"INFO: Cache cleared for '{args.location}'", file=sys.stderr)
            print(f"Cache cleared for: {args.location}")
        else:
            if args.verbose:
                print(f"INFO: No cache found for '{args.location}'", file=sys.stderr)
            print(f"No cache found for: {args.location}")
        return
    
    # Handle show fallbacks
    if args.show_fallbacks:
        fallbacks = client._generate_portuguese_fallbacks(args.location)
        print(f"Fallback variants for '{args.location}':")
        for i, variant in enumerate(fallbacks, 1):
            print(f"  {i:2d}. {variant}")
        return
    
    # Handle debug mode - show raw API response
    if args.debug:
        try:
            response = client._make_api_request(args.location, region=args.region)
            print("=== Raw Google API Response ===", file=sys.stderr)
            print(json.dumps({
                "status": response.status,
                "results": response.results,
                "error_message": response.error_message
            }, indent=2), file=sys.stderr)
            print("=== End Raw Response ===", file=sys.stderr)
        except Exception as e:
            print(f"ERROR: Failed to get debug response: {e}", file=sys.stderr)
            sys.exit(1)
    
    # Geocode the location
    try:
        result = client.geocode(
            args.location, 
            verbose=args.verbose, 
            skip_cache=args.no_cache,
            region=args.region
        )
        
        # Output result as JSON
        if result:
            print(json.dumps(result.to_dict(), indent=2, ensure_ascii=False))
        else:
            print("null")
    
    except Exception as e:
        print(f"ERROR: Geocoding failed: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()