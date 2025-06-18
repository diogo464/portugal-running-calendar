#!/usr/bin/env python3

import json
import requests
import subprocess
import re
import time
from typing import Optional, List, Dict, Any

def fetch_all_events() -> List[Dict]:
    """Fetch all events from WordPress API until no more pages."""
    events = []
    page = 1
    
    while True:
        print(f"Fetching page {page}...")
        try:
            result = subprocess.run(['./fetch-event-page.sh', str(page)], 
                                  capture_output=True, text=True, timeout=30)
            if result.returncode != 0:
                print(f"Error fetching page {page}: {result.stderr}")
                break
                
            page_data = json.loads(result.stdout)
            if not page_data:  # Empty page means we've reached the end
                print(f"No more events found at page {page}. Stopping.")
                break
                
            events.extend(page_data)
            print(f"  -> Found {len(page_data)} events on page {page}")
            page += 1
            time.sleep(0.3)  # Be respectful to the API
            
        except Exception as e:
            print(f"Error on page {page}: {e}")
            break
    
    return events

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
        except Exception:
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
            try:
                geo_data = json.loads(json_part)
                return {
                    'coordinates': geo_data.get('coordinates', {}),
                    'bounding_box': geo_data.get('boundingbox', {}),
                    'display_name': geo_data.get('display_name', '')
                }
            except json.JSONDecodeError:
                pass
                
    except Exception:
        pass
        
    return None

def extract_distances_and_types(description: str, event_types: List[str]) -> tuple[List[str], List[str]]:
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

def process_event(event_data: dict) -> Dict[str, Any]:
    """Process a single event and return enriched data."""
    event_id = event_data['id']
    event_name = event_data['title']['rendered']
    
    # Get taxonomy names (with error handling)
    event_types = fetch_taxonomy_names('event_type', event_data.get('event_type', []))
    circuits = fetch_taxonomy_names('event_type_5', event_data.get('event_type_5', []))
    
    # Get ICS data
    ics_data = fetch_ics_data(event_id) or {}
    location = ics_data.get('location', '')
    start_date = ics_data.get('start_date')
    end_date = ics_data.get('end_date')
    description = ics_data.get('description', '') or event_data['content']['rendered']
    
    # Geocode location
    geo_data = geocode_location(location)
    coordinates = geo_data.get('coordinates') if geo_data else None
    bounding_box = geo_data.get('bounding_box') if geo_data else None
    
    # Extract distances and types
    distances, extracted_types = extract_distances_and_types(description, event_types)
    all_types = list(set(event_types + extracted_types))
    
    # Get images
    images = []
    if event_data.get('featured_image_src'):
        images.append(event_data['featured_image_src'])
    
    return {
        'event_id': event_id,
        'event_name': event_name,
        'event_location': location,
        'event_coordinates': coordinates,
        'event_bounding_box': bounding_box,
        'event_distances': distances,
        'event_types': all_types,
        'event_images': images,
        'event_start_date': start_date,
        'event_end_date': end_date,
        'event_circuit': circuits,
        'event_description': description
    }

def main():
    print("🏃‍♂️ Portugal Running Events Extractor")
    print("======================================")
    
    # Fetch all events
    print("\n📥 Fetching all events from WordPress API...")
    all_events = fetch_all_events()
    print(f"✅ Found {len(all_events)} total events")
    
    # Process events
    print(f"\n🔄 Processing {len(all_events)} events...")
    processed_events = []
    errors = []
    
    for i, event in enumerate(all_events):
        try:
            if i % 50 == 0:
                print(f"   Progress: {i}/{len(all_events)} events processed ({i/len(all_events)*100:.1f}%)")
            
            processed_event = process_event(event)
            processed_events.append(processed_event)
            
            # Add delay every 10 events to be respectful
            if i % 10 == 0:
                time.sleep(0.5)
                
        except Exception as e:
            error_msg = f"Error processing event {event.get('id', 'unknown')}: {str(e)[:100]}"
            errors.append(error_msg)
            continue
    
    # Save results
    output_file = 'portugal-running-events.json'
    print(f"\n💾 Saving results to {output_file}...")
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(processed_events, f, indent=2, ensure_ascii=False)
    
    # Summary
    print(f"\n🎉 Extraction completed!")
    print(f"   📊 Total events processed: {len(processed_events)}")
    print(f"   ❌ Events with errors: {len(errors)}")
    print(f"   📄 Output file: {output_file}")
    
    # Statistics
    events_with_coordinates = sum(1 for e in processed_events if e['event_coordinates'])
    events_with_dates = sum(1 for e in processed_events if e['event_start_date'])
    events_with_distances = sum(1 for e in processed_events if e['event_distances'])
    
    print(f"\n📈 Data quality:")
    print(f"   🗺️  Events with coordinates: {events_with_coordinates} ({events_with_coordinates/len(processed_events)*100:.1f}%)")
    print(f"   📅 Events with dates: {events_with_dates} ({events_with_dates/len(processed_events)*100:.1f}%)")
    print(f"   🏃‍♀️ Events with distances: {events_with_distances} ({events_with_distances/len(processed_events)*100:.1f}%)")
    
    if errors:
        print(f"\n⚠️  Some errors occurred (showing last 5):")
        for error in errors[-5:]:
            print(f"   • {error}")

if __name__ == "__main__":
    main()