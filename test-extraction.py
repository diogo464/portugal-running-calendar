#!/usr/bin/env python3

import json
import subprocess
import sys

def test_basic_fetching():
    """Test basic event fetching functionality."""
    print("Testing basic event fetching...")
    
    # Test fetching first page
    try:
        result = subprocess.run(['./fetch-event-page.sh', '1'], 
                              capture_output=True, text=True, timeout=30)
        if result.returncode == 0:
            events = json.loads(result.stdout)
            print(f"✓ Successfully fetched {len(events)} events from page 1")
            
            # Test fetching individual event
            if events:
                event_id = events[0]['id']
                print(f"Testing individual event fetch for ID {event_id}...")
                
                result = subprocess.run(['./fetch-event-data.sh', str(event_id)], 
                                      capture_output=True, text=True, timeout=30)
                if result.returncode == 0:
                    event_data = json.loads(result.stdout)
                    print(f"✓ Successfully fetched detailed data for event {event_id}")
                    print(f"  Title: {event_data['title']['rendered']}")
                    
                    # Test ICS fetching
                    print(f"Testing ICS fetch for event {event_id}...")
                    result = subprocess.run(['./fetch-event-ics.sh', str(event_id)], 
                                          capture_output=True, text=True, timeout=30)
                    if result.returncode == 0:
                        print(f"✓ Successfully fetched ICS data for event {event_id}")
                        ics_lines = result.stdout.split('\n')
                        for line in ics_lines:
                            if line.startswith('LOCATION:'):
                                location = line.replace('LOCATION:', '').strip()
                                print(f"  Location: {location}")
                                
                                # Test geocoding
                                if location:
                                    print(f"Testing geocoding for location: {location}")
                                    result = subprocess.run(['./geocode-location.sh', location], 
                                                          capture_output=True, text=True, timeout=30)
                                    if result.returncode == 0:
                                        print("✓ Geocoding successful")
                                    else:
                                        print("✗ Geocoding failed")
                                break
                    else:
                        print(f"✗ Failed to fetch ICS data: {result.stderr}")
                else:
                    print(f"✗ Failed to fetch event details: {result.stderr}")
            else:
                print("✗ No events found in page 1")
        else:
            print(f"✗ Failed to fetch page 1: {result.stderr}")
            
    except Exception as e:
        print(f"✗ Test failed: {e}")

if __name__ == "__main__":
    test_basic_fetching()