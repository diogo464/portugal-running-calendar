#!/usr/bin/env python3

import json
import requests
import subprocess
import re
import time
import hashlib
import os
from urllib.parse import urlparse
from pathlib import Path
from dataclasses import dataclass
from typing import Optional, List, Dict, Any

@dataclass
class EventData:
    event_id: int
    event_name: str
    event_location: str
    event_coordinates: Optional[Dict[str, float]]
    event_bounding_box: Optional[Dict[str, float]]
    event_distances: List[str]
    event_types: List[str]
    event_images: List[str]
    event_start_date: Optional[str]
    event_end_date: Optional[str]
    event_circuit: List[str]
    event_description: str
    description_short: Optional[str]

def fetch_taxonomy_names(taxonomy_type: str, taxonomy_ids: List[int]) -> List[str]:
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
        except Exception as e:
            print(f"Error fetching taxonomy {tax_id}: {e}")
            continue
    
    return [name for name in names if name]

def fetch_ics_data(event_id: int) -> Optional[Dict[str, str]]:
    """Fetch ICS data for an event."""
    try:
        result = subprocess.run(['./fetch-event-ics.sh', str(event_id)], 
                              capture_output=True, text=True, timeout=30)
        if result.returncode != 0:
            return None
            
        ics_content = result.stdout
        ics_data = {}
        
        # Extract location
        location_match = re.search(r'LOCATION:(.+)', ics_content)
        if location_match:
            location = location_match.group(1).strip()
            # Clean up location string: remove escaped commas, duplicates
            location = location.replace('\\,', ',').replace('  ', ' ')
            # Remove duplicate parts (e.g. "Lisboa Lisboa" -> "Lisboa")
            parts = location.split()
            unique_parts = []
            for part in parts:
                if part not in unique_parts:
                    unique_parts.append(part)
            ics_data['location'] = ' '.join(unique_parts)
        
        # Extract start date
        dtstart_match = re.search(r'DTSTART:(\d+)', ics_content)
        if dtstart_match:
            date_str = dtstart_match.group(1)
            if len(date_str) == 8:  # YYYYMMDD format
                formatted_date = f"{date_str[:4]}-{date_str[4:6]}-{date_str[6:8]}"
                ics_data['start_date'] = formatted_date
        
        # Extract end date
        dtend_match = re.search(r'DTEND:(\d+)', ics_content)
        if dtend_match:
            date_str = dtend_match.group(1)
            if len(date_str) == 8:  # YYYYMMDD format
                formatted_date = f"{date_str[:4]}-{date_str[4:6]}-{date_str[6:8]}"
                ics_data['end_date'] = formatted_date
        
        # Extract description
        desc_match = re.search(r'DESCRIPTION:(.+?)(?=\n[A-Z]|\nEND:)', ics_content, re.DOTALL)
        if desc_match:
            desc = desc_match.group(1).replace('\n ', '').replace('\\n', '\n').replace('\\,', ',')
            ics_data['description'] = desc.strip()
            
        return ics_data
        
    except Exception as e:
        print(f"Error fetching ICS for event {event_id}: {e}")
        return None

def geocode_location(location: str) -> Optional[Dict[str, Any]]:
    """Geocode location using the existing script."""
    if not location:
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
                print(f"JSON decode error for '{location}': {e}")
                return None
                
    except Exception as e:
        print(f"Geocoding error for '{location}': {e}")
        
    return None

def generate_short_description(description: str) -> Optional[str]:
    """Generate a short description using the existing script."""
    if not description:
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
        print(f"Error generating short description: {e}")
        
    return None

def download_image(image_url: str, media_dir: str = "media") -> Optional[str]:
    """Download image from URL and save with hash filename. Return local path."""
    if not image_url:
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
                
        print(f"Downloaded: {image_url} -> {filepath}")
        return filepath
        
    except Exception as e:
        print(f"Error downloading image {image_url}: {e}")
        return None

def extract_distances_and_types(description: str, event_types: List[str]) -> tuple[List[str], List[str]]:
    """Extract distances and event types from description and taxonomies."""
    distances = []
    types = []
    
    # Extract distances from description using regex
    distance_patterns = [
        r'(\d+)\s*k?m',
        r'(\d+\.?\d*)\s*quilómetros?',
        r'(\d+\.?\d*)\s*quilômetros?',
        r'maratona',
        r'meia\s*maratona',
        r'mini\s*maratona'
    ]
    
    desc_lower = description.lower()
    for pattern in distance_patterns:
        matches = re.findall(pattern, desc_lower)
        for match in matches:
            if match == 'maratona':
                distances.append('42.2km')
                types.append('marathon')
            elif 'meia' in match:
                distances.append('21.1km')
                types.append('half marathon')
            elif 'mini' in match:
                distances.append('10km')
                types.append('mini marathon')
            elif match and match.replace('.', '').isdigit():
                distances.append(f"{match}km")
    
    # Process event types from taxonomies
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
        elif '10' in type_lower and 'km' in type_lower:
            distances.append('10km')
            types.append('10k run')
        elif '5' in type_lower and 'km' in type_lower:
            distances.append('5km')
            types.append('5k run')
    
    return list(set(distances)), list(set(types))

def process_event(event_data: dict) -> EventData:
    """Process a single event and return enriched EventData."""
    event_id = event_data['id']
    event_name = event_data['title']['rendered']
    
    print(f"Processing event {event_id}: {event_name}")
    
    # Get taxonomy names
    event_types = fetch_taxonomy_names('event_type', event_data.get('event_type', []))
    location_districts = fetch_taxonomy_names('event_type_2', event_data.get('event_type_2', []))
    circuits = fetch_taxonomy_names('event_type_5', event_data.get('event_type_5', []))
    
    # Get ICS data for location and dates
    ics_data = fetch_ics_data(event_id)
    location = ics_data.get('location', '') if ics_data else ''
    start_date = ics_data.get('start_date') if ics_data else None
    end_date = ics_data.get('end_date') if ics_data else None
    description = ics_data.get('description', '') if ics_data else event_data['content']['rendered']
    
    # Geocode location
    geo_data = geocode_location(location)
    coordinates = geo_data.get('coordinates') if geo_data else None
    bounding_box = geo_data.get('bounding_box') if geo_data else None
    location_display_name = geo_data.get('display_name') if geo_data else location
    
    # Extract distances and types
    distances, extracted_types = extract_distances_and_types(description, event_types)
    all_types = list(set(event_types + extracted_types))
    
    # Generate short description
    short_description = generate_short_description(description)
    
    # Download and process images
    images = []
    if event_data.get('featured_image_src'):
        image_url = event_data['featured_image_src']
        local_path = download_image(image_url)
        if local_path:
            images.append(local_path)
        else:
            # Fallback to original URL if download fails
            images.append(image_url)
    
    return EventData(
        event_id=event_id,
        event_name=event_name,
        event_location=location_display_name,
        event_coordinates=coordinates,
        event_bounding_box=bounding_box,
        event_distances=distances,
        event_types=all_types,
        event_images=images,
        event_start_date=start_date,
        event_end_date=end_date,
        event_circuit=circuits,
        event_description=description,
        description_short=short_description
    )

def main():
    print("Testing sample event data extraction...")
    
    # Fetch just the first page
    print("Fetching first page of events...")
    result = subprocess.run(['./fetch-event-page.sh', '1'], 
                          capture_output=True, text=True, timeout=30)
    if result.returncode != 0:
        print(f"Error fetching events: {result.stderr}")
        return
    
    events = json.loads(result.stdout)
    print(f"Found {len(events)} events on first page")
    
    # Process only first 3 events as a test
    sample_events = events[:3]
    processed_events = []
    
    for event in sample_events:
        try:
            processed_event = process_event(event)
            processed_events.append(processed_event)
            time.sleep(1)  # Be respectful to APIs
        except Exception as e:
            print(f"Error processing event {event.get('id', 'unknown')}: {e}")
            continue
    
    # Convert to JSON-serializable format
    events_json = []
    for event in processed_events:
        events_json.append({
            'event_id': event.event_id,
            'event_name': event.event_name,
            'event_location': event.event_location,
            'event_coordinates': event.event_coordinates,
            'event_bounding_box': event.event_bounding_box,
            'event_distances': event.event_distances,
            'event_types': event.event_types,
            'event_images': event.event_images,
            'event_start_date': event.event_start_date,
            'event_end_date': event.event_end_date,
            'event_circuit': event.event_circuit,
            'event_description': event.event_description,
            'description_short': event.description_short
        })
    
    # Save sample results
    output_file = 'sample-events.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(events_json, f, indent=2, ensure_ascii=False)
    
    print(f"\nSample processing completed! Processed {len(processed_events)} events")
    print(f"Results saved to {output_file}")
    
    # Show summary
    for event in events_json:
        print(f"\nEvent: {event['event_name']}")
        print(f"  ID: {event['event_id']}")
        print(f"  Location: {event['event_location']}")
        print(f"  Coordinates: {event['event_coordinates']}")
        print(f"  Dates: {event['event_start_date']} to {event['event_end_date']}")
        print(f"  Types: {event['event_types']}")
        print(f"  Distances: {event['event_distances']}")
        print(f"  Short Description: {event['description_short']}")

if __name__ == "__main__":
    main()