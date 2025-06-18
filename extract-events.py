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
import requests
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
                url = f"https://www.portugalrunning.com/wp-json/wp/v2/{taxonomy_type}/{tax_id}"
                response = requests.get(url, timeout=10)
                if response.status_code == 200:
                    data = response.json()
                    names.append(data.get('name', ''))
                time.sleep(0.1)
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
            
            # Look for the final JSON result in the output
            output = result.stdout
            if "Most relevant result (JSON):" in output:
                json_part = output.split("Most relevant result (JSON):")[1].strip()
                # Clean up any extra content after the JSON
                lines = json_part.split('\n')
                json_lines = []
                brace_count = 0
                for line in lines:
                    json_lines.append(line)
                    brace_count += line.count('{') - line.count('}')
                    if brace_count == 0 and '}' in line:
                        break
                
                json_content = '\n'.join(json_lines)
                try:
                    geo_data = json.loads(json_content)
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
        """Generate a short description using the existing script."""
        if not description or self.args.skip_descriptions:
            return None
            
        try:
            result = subprocess.run(['./generate-one-line-description.sh', description], 
                                  capture_output=True, text=True, timeout=30)
            if result.returncode == 0:
                short_desc = result.stdout.strip()
                # Clean up any extra content
                if short_desc and len(short_desc) < 200:  # Sanity check
                    return short_desc
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
                
            # Download the image
            response = requests.get(image_url, timeout=30, stream=True)
            response.raise_for_status()
            
            # Save to file
            with open(filepath, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)
                    
            if self.args.verbose:
                print(f"   Downloaded: {image_url} -> {filepath}")
            return filepath
            
        except Exception as e:
            if self.args.verbose:
                print(f"   Error downloading image {image_url}: {e}")
            return None

    def extract_distances_and_types(self, description: str, event_types: List[str]) -> tuple[List[str], List[str]]:
        """Extract distances and event types from description and taxonomies."""
        distances = []
        types = []
        
        # Extract distances from description
        desc_lower = description.lower()
        
        # Common distance patterns
        if 'maratona' in desc_lower and 'meia' not in desc_lower:
            distances.append('42.2km')
            types.append('marathon')
        if 'meia' in desc_lower and 'maratona' in desc_lower:
            distances.append('21.1km')
            types.append('half marathon')
        
        # Extract numeric distances
        distance_matches = re.findall(r'(\d+)\s*k?m', desc_lower)
        for match in distance_matches:
            if match.isdigit():
                distances.append(f"{match}km")
        
        # Process taxonomies
        for event_type in event_types:
            type_lower = event_type.lower()
            if 'trail' in type_lower:
                types.append('trail')
            elif 'maratona' in type_lower:
                types.append('marathon')
            elif 'corrida' in type_lower:
                types.append('run')
            elif 'caminhada' in type_lower:
                types.append('walk')
            elif 'cross' in type_lower:
                types.append('cross country')
        
        return list(set(distances)), list(set(types))

    def process_event(self, event_data: dict) -> Dict[str, Any]:
        """Process a single event and return enriched data."""
        event_id = event_data['id']
        event_name = event_data['title']['rendered']
        
        if self.args.verbose:
            print(f"   Processing event {event_id}: {event_name}")
        
        # Get taxonomy names (with error handling)
        event_types = self.fetch_taxonomy_names('event_type', event_data.get('event_type', []))
        circuits = self.fetch_taxonomy_names('event_type_5', event_data.get('event_type_5', []))
        
        # Get ICS data
        ics_data = self.fetch_ics_data(event_id) or {}
        location = ics_data.get('location', '')
        start_date = ics_data.get('start_date')
        end_date = ics_data.get('end_date')
        description = ics_data.get('description', '') or event_data['content']['rendered']
        
        # Geocode location
        geo_data = self.geocode_location(location)
        coordinates = geo_data.get('coordinates') if geo_data else None
        bounding_box = geo_data.get('bounding_box') if geo_data else None
        location_display_name = geo_data.get('display_name') if geo_data else location
        
        # Extract distances and types
        distances, extracted_types = self.extract_distances_and_types(description, event_types)
        all_types = list(set(event_types + extracted_types))
        
        # Generate short description
        short_description = self.generate_short_description(description)
        
        # Download and process images
        images = []
        if event_data.get('featured_image_src'):
            image_url = event_data['featured_image_src']
            local_path = self.download_image(image_url)
            if local_path:
                images.append(local_path)
            else:
                # Fallback to original URL if download fails
                images.append(image_url)
        
        return {
            'event_id': event_id,
            'event_name': event_name,
            'event_location': location_display_name,
            'event_coordinates': coordinates,
            'event_bounding_box': bounding_box,
            'event_distances': distances,
            'event_types': all_types,
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
        events_with_coordinates = sum(1 for e in self.processed_events if e['event_coordinates'])
        events_with_dates = sum(1 for e in self.processed_events if e['event_start_date'])
        events_with_distances = sum(1 for e in self.processed_events if e['event_distances'])
        events_with_short_desc = sum(1 for e in self.processed_events if e['description_short'])
        events_with_images = sum(1 for e in self.processed_events if e['event_images'])
        
        print(f"\n📈 Data quality:")
        print(f"   🗺️  Events with coordinates: {events_with_coordinates} ({events_with_coordinates/len(self.processed_events)*100:.1f}%)")
        print(f"   📅 Events with dates: {events_with_dates} ({events_with_dates/len(self.processed_events)*100:.1f}%)")
        print(f"   🏃‍♀️ Events with distances: {events_with_distances} ({events_with_distances/len(self.processed_events)*100:.1f}%)")
        print(f"   📝 Events with short descriptions: {events_with_short_desc} ({events_with_short_desc/len(self.processed_events)*100:.1f}%)")
        print(f"   🖼️  Events with images: {events_with_images} ({events_with_images/len(self.processed_events)*100:.1f}%)")
        
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
    parser.add_argument('--delay', type=float, default=0.3,
                       help='Delay between API requests in seconds (default: 0.3)')
    
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