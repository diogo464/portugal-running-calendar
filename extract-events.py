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
from urllib.parse import urlparse
from pathlib import Path
from typing import Optional, List, Dict, Any

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
            "Maratona": "marathon",
            "Meia-Maratona": "half-marathon",
            "marathon": "marathon",
            
            # Trail types  
            "T-Trail": "trail",
            "Trail": "trail",
            
            # Running types
            "Corrida": "run",
            "Corrida 10 km": "10k",
            "Corrida 5 km": "5k",
            
            # Walking types
            "Caminhada": "walk",
            
            # Cross country
            "Cross": "cross-country",
        }

        self.canonical_type_to_distance = {
            "10k": "10k",
            "5k": "5k",
            "marathon": "42.2K",
            "half-marathon": "21.1K",
        }
        
    def fetch_all_events(self) -> List[Dict]:
        """Fetch events from WordPress API with optional limits."""
        events = []
        page = 1
        total_fetched = 0
        
        print(f"🔄 Fetching events (limit: {self.args.limit if self.args.limit else 'unlimited'})...")
        
        while True:
            if self.args.pages and page > self.args.pages:
                print(f"   Reached page limit ({self.args.pages})")
                break
                
            if self.args.limit and total_fetched >= self.args.limit:
                print(f"   Reached event limit ({self.args.limit})")
                break
                
            print(f"   Fetching page {page}...")
            try:
                result = subprocess.run(['./fetch-event-page.sh', str(page)], 
                                      capture_output=True, text=True, timeout=30)
                if result.returncode != 0:
                    print(f"   Error fetching page {page}: {result.stderr}")
                    break
                    
                page_data = json.loads(result.stdout)
                if not page_data:  # Empty page means we've reached the end
                    print(f"   No more events found at page {page}")
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
                
            except Exception as e:
                print(f"   Error on page {page}: {e}")
                break
        
        print(f"✅ Fetched {len(events)} total events")
        return events

    def fetch_taxonomy_names(self, taxonomy_type: str, taxonomy_ids: List[int]) -> List[str]:
        """Fetch taxonomy names from IDs."""
        if not taxonomy_ids:
            return []
        
        names = []
        for tax_id in taxonomy_ids:
            try:
                result = subprocess.run(
                    ['./fetch-taxonomy-name.sh', taxonomy_type, str(tax_id)],
                    capture_output=True, text=True, timeout=30
                )
                if result.returncode == 0 and result.stdout.strip():
                    data = json.loads(result.stdout)
                    names.append(data.get('name', ''))
            except Exception:
                continue
        
        return [name for name in names if name]

    def fetch_ics_data(self, event_id: int) -> Optional[Dict[str, str]]:
        """Fetch ICS data for an event."""
        try:
            result = subprocess.run(['./fetch-event-ics.sh', str(event_id)], 
                                  capture_output=True, text=True, timeout=30)
            if result.returncode != 0:
                return None
                
            ics_content = result.stdout
            ics_data = {}
            
            # Extract and clean location
            location_match = re.search(r'LOCATION:(.+)', ics_content)
            if location_match:
                location = location_match.group(1).strip()
                location = location.replace('\\,', ',').replace('  ', ' ')
                # Remove duplicate parts
                parts = location.split()
                unique_parts = []
                for part in parts:
                    if part not in unique_parts:
                        unique_parts.append(part)
                ics_data['location'] = ' '.join(unique_parts)
            
            # Extract dates
            dtstart_match = re.search(r'DTSTART:(\d+)', ics_content)
            if dtstart_match:
                date_str = dtstart_match.group(1)
                if len(date_str) == 8:
                    ics_data['start_date'] = f"{date_str[:4]}-{date_str[4:6]}-{date_str[6:8]}"
            
            dtend_match = re.search(r'DTEND:(\d+)', ics_content)
            if dtend_match:
                date_str = dtend_match.group(1)
                if len(date_str) == 8:
                    ics_data['end_date'] = f"{date_str[:4]}-{date_str[4:6]}-{date_str[6:8]}"
            
            # Extract description
            desc_match = re.search(r'DESCRIPTION:(.+?)(?=\n[A-Z]|\nEND:)', ics_content, re.DOTALL)
            if desc_match:
                desc = desc_match.group(1).replace('\n ', '').replace('\\n', '\n').replace('\\,', ',')
                ics_data['description'] = desc.strip()
                
            return ics_data
            
        except Exception:
            return None

    def geocode_location(self, location: str) -> Optional[Dict[str, Any]]:
        """Geocode location using the existing script."""
        if not location or self.args.skip_geocoding:
            return None
            
        try:
            result = subprocess.run(['./geocode-location.sh', location], 
                                  capture_output=True, text=True, timeout=30)
            if result.returncode != 0:
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
                    'coordinates': geo_data.get('coordinates', {}),
                    'bounding_box': geo_data.get('boundingbox', {}),
                    'display_name': geo_data.get('display_name', ''),
                    'name': geo_data.get('name', ''),
                    'addresstype': geo_data.get('addresstype', '')
                }
            except json.JSONDecodeError as e:
                    if self.args.verbose:
                        print(f"   JSON decode error for '{location}': {e}")
                    return None
                    
        except Exception as e:
            if self.args.verbose:
                print(f"   Geocoding error for '{location}': {e}")
            
        return None

    def generate_short_description(self, description: str) -> Optional[str]:
        """Generate a short description using the existing script with caching."""
        if not description or self.args.skip_descriptions:
            return None
            
        try:
            # Use longer timeout for LLM generation, but caching makes this much faster
            result = subprocess.run(['./generate-one-line-description.sh', description], 
                                  capture_output=True, text=True, timeout=60)
            if result.returncode == 0:
                short_desc = result.stdout.strip()
                # Clean up any extra content
                if short_desc and len(short_desc) < 200:  # Sanity check
                    return short_desc
            elif self.args.verbose:
                print(f"   Description generation failed with return code {result.returncode}")
                if result.stderr:
                    print(f"   Error: {result.stderr.strip()}")
        except subprocess.TimeoutExpired:
            if self.args.verbose:
                print(f"   Description generation timed out after 60 seconds")
        except Exception as e:
            if self.args.verbose:
                print(f"   Error generating short description: {e}")
            
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
            path_parts = parsed_url.path.split('.')
            extension = path_parts[-1].lower() if len(path_parts) > 1 else 'jpg'
            
            # Ensure valid extension
            if extension not in ['jpg', 'jpeg', 'png', 'gif', 'webp']:
                extension = 'jpg'
                
            filename = f"{url_hash}.{extension}"
            filepath = os.path.join(media_dir, filename)
            
            # Skip if already downloaded
            if os.path.exists(filepath):
                return filepath
                
            # Download the image using cached script
            result = subprocess.run(
                ['./download-image.sh', image_url, filepath],
                capture_output=True, text=True, timeout=60
            )
            if result.returncode != 0:
                if self.args.verbose:
                    print(f"   ❌ Failed to download image {image_url}: {result.stderr}")
                return None
                    
            if self.args.verbose:
                print(f"   Downloaded: {image_url} -> {filepath}")
            return filepath
            
        except Exception as e:
            if self.args.verbose:
                print(f"   ❌ Error downloading image {image_url}: {e}")
            return None

    def map_event_types(self, original_types: List[str]) -> List[str]:
        """Map original event types to canonical types."""
        canonical_types = set()
        
        for original_type in original_types:
            if original_type in self.event_type_mapping:
                canonical_type = self.event_type_mapping[original_type]
                canonical_types.add(canonical_type)
            else:
                # Fatal error - unmapped type found
                print(f"\n❌ FATAL ERROR: Unmapped event type found: '{original_type}'")
                print(f"   Please add this mapping to the event_type_mapping dictionary")
                print(f"   Example: \"{original_type}\": \"canonical-type-name\"")
                print(f"\n   All original types in this event: {original_types}")
                raise ValueError(f"Unmapped event type: '{original_type}'")
        
        return list(canonical_types)

    def extract_distances_and_types(self, description: str, event_types: List[str]) -> tuple[List[str], List[str]]:
        """Extract distances and event types from description and taxonomies."""
        # Map event types using canonical mapping
        canonical_types = self.map_event_types(event_types)

        # lets ignore the distances for now 
        return [], canonical_types

    def process_event(self, event_data: dict) -> Dict[str, Any]:
        """Process a single event and return enriched data."""
        event_start_time = time.time()
        event_id = event_data['id']
        event_name = event_data['title']['rendered']
        
        if self.args.verbose:
            print(f"   Processing event {event_id}: {event_name}")
        
        # Get taxonomy names (with error handling)
        start_time = time.time()
        event_types = self.fetch_taxonomy_names('event_type', event_data.get('event_type', []))
        circuits = self.fetch_taxonomy_names('event_type_5', event_data.get('event_type_5', []))
        taxonomy_time = time.time() - start_time
        if self.args.verbose:
            print(f"     Taxonomy lookups took {taxonomy_time:.3f}s")
        
        # Get ICS data
        start_time = time.time()
        ics_data = self.fetch_ics_data(event_id) or {}
        location = ics_data.get('location', '')
        start_date = ics_data.get('start_date')
        end_date = ics_data.get('end_date')
        description = ics_data.get('description', '') or event_data['content']['rendered']
        ics_time = time.time() - start_time
        if self.args.verbose:
            print(f"     ICS data fetch took {ics_time:.3f}s")
        
        # Geocode location
        start_time = time.time()
        geo_data = self.geocode_location(location)
        coordinates = geo_data.get('coordinates') if geo_data else None
        bounding_box = geo_data.get('bounding_box') if geo_data else None
        location_display_name = geo_data.get('display_name') if geo_data else location
        geocoding_time = time.time() - start_time
        if self.args.verbose:
            print(f"     Geocoding took {geocoding_time:.3f}s")
        
        # Extract distances and canonical types
        start_time = time.time()
        distances, canonical_types = self.extract_distances_and_types(description, event_types)
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
        if event_data.get('featured_image_src'):
            image_url = event_data['featured_image_src']
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
            'event_id': event_id,
            'event_name': event_name,
            'event_location': location_display_name,
            'event_coordinates': coordinates,
            'event_bounding_box': bounding_box,
            'event_distances': distances,
            'event_types': canonical_types,
            'event_images': images,
            'event_start_date': start_date,
            'event_end_date': end_date,
            'event_circuit': circuits,
            'event_description': description,
            'description_short': short_description
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
                    print(f"   Progress: {i}/{len(self.events)} events processed ({i/len(self.events)*100:.1f}%)")
                
                processed_event = self.process_event(event)
                self.processed_events.append(processed_event)
                
                # Add delay every few events to be respectful
                if i % 5 == 0:
                    time.sleep(self.args.delay)
                    
            except Exception as e:
                error_msg = f"Error processing event {event.get('id', 'unknown')}: {str(e)[:100]}"
                self.errors.append(error_msg)
                if self.args.verbose:
                    print(f"   {error_msg}")
                continue
        
        # Save results
        print(f"\n💾 Saving results to {self.args.output}...")
        
        with open(self.args.output, 'w', encoding='utf-8') as f:
            json.dump(self.processed_events, f, indent=2, ensure_ascii=False)
        
        # Summary
        print(f"\n🎉 Extraction completed!")
        print(f"   📊 Total events processed: {len(self.processed_events)}")
        print(f"   ❌ Events with errors: {len(self.errors)}")
        print(f"   📄 Output file: {self.args.output}")
        
        # Statistics
        if self.processed_events:
            events_with_coordinates = sum(1 for e in self.processed_events if e['event_coordinates'])
            events_with_dates = sum(1 for e in self.processed_events if e['event_start_date'])
            events_with_distances = sum(1 for e in self.processed_events if e['event_distances'])
            events_with_short_desc = sum(1 for e in self.processed_events if e['description_short'])
            events_with_images = sum(1 for e in self.processed_events if e['event_images'])
            
            total_events = len(self.processed_events)
            print(f"\n📈 Data quality:")
            print(f"   🗺️  Events with coordinates: {events_with_coordinates} ({events_with_coordinates/total_events*100:.1f}%)")
            print(f"   📅 Events with dates: {events_with_dates} ({events_with_dates/total_events*100:.1f}%)")
            print(f"   🏃‍♀️ Events with distances: {events_with_distances} ({events_with_distances/total_events*100:.1f}%)")
            print(f"   📝 Events with short descriptions: {events_with_short_desc} ({events_with_short_desc/total_events*100:.1f}%)")
            print(f"   🖼️  Events with images: {events_with_images} ({events_with_images/total_events*100:.1f}%)")
        else:
            print(f"\n📈 No events were successfully processed")
            
            # Show discovered types to help with mapping
            if self.errors:
                print(f"\n🔍 To resolve mapping errors, add these types to event_type_mapping:")
                unique_types = set()
                for error in self.errors:
                    if "Unmapped event type:" in error:
                        # Extract the type from error message
                        import re
                        match = re.search(r"Unmapped event type: '([^']+)'", error)
                        if match:
                            unique_types.add(match.group(1))
                
                for event_type in sorted(unique_types):
                    print(f"   \"{event_type}\": \"canonical-name\",")
                print(f"\n   💡 Suggested canonical names: marathon, half-marathon, 10k, 5k, trail, run, walk, cross-country")
        
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
        """
    )
    
    # Limiting options
    parser.add_argument('--limit', '-l', type=int, 
                       help='Maximum number of events to extract (default: unlimited)')
    parser.add_argument('--pages', '-p', type=int,
                       help='Maximum number of pages to fetch (default: unlimited)')
    
    # Processing options
    parser.add_argument('--skip-geocoding', action='store_true',
                       help='Skip geocoding to speed up extraction')
    parser.add_argument('--skip-descriptions', action='store_true', 
                       help='Skip short description generation')
    parser.add_argument('--skip-images', action='store_true',
                       help='Skip image downloading')
    
    # Output options
    parser.add_argument('--output', '-o', default='portugal-running-events.json',
                       help='Output JSON filename (default: portugal-running-events.json)')
    parser.add_argument('--verbose', '-v', action='store_true',
                       help='Verbose output with detailed progress')
    
    # Performance options
    parser.add_argument('--delay', type=float, default=0.0,
                       help='Delay between API requests in seconds (default: 0.0)')
    
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
