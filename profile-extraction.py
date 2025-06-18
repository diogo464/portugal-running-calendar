#!/usr/bin/env python3
import time
import subprocess
import json
import sys

def time_operation(name, func, *args):
    """Time an operation and print the result."""
    start = time.time()
    result = func(*args)
    duration = time.time() - start
    print(f"{name}: {duration:.3f}s")
    return result

def test_fetch_page():
    """Test page fetching."""
    result = subprocess.run(['./fetch-event-page.sh', '1'], 
                           capture_output=True, text=True, timeout=30)
    return result.returncode == 0

def test_fetch_event_data():
    """Test event data fetching."""
    # Get an event ID first
    result = subprocess.run(['./fetch-event-page.sh', '1'], 
                           capture_output=True, text=True, timeout=30)
    if result.returncode == 0:
        events = json.loads(result.stdout)
        if events:
            event_id = events[0]['id']
            result2 = subprocess.run(['./fetch-event-data.sh', str(event_id)], 
                                   capture_output=True, text=True, timeout=30)
            return result2.returncode == 0
    return False

def test_fetch_ics():
    """Test ICS fetching."""
    # Get an event ID first
    result = subprocess.run(['./fetch-event-page.sh', '1'], 
                           capture_output=True, text=True, timeout=30)
    if result.returncode == 0:
        events = json.loads(result.stdout)
        if events:
            event_id = events[0]['id']
            result2 = subprocess.run(['./fetch-event-ics.sh', str(event_id)], 
                                   capture_output=True, text=True, timeout=30)
            return result2.returncode == 0
    return False

def test_geocoding():
    """Test geocoding."""
    result = subprocess.run(['./geocode-location.sh', 'Lisboa, Portugal'], 
                           capture_output=True, text=True, timeout=30)
    return result.returncode == 0

def test_description():
    """Test description generation."""
    result = subprocess.run(['./generate-one-line-description.sh', 'Test event description'], 
                           capture_output=True, text=True, timeout=30)
    return result.returncode == 0

def test_taxonomy():
    """Test taxonomy fetching."""
    result = subprocess.run(['./fetch-taxonomy-name.sh', 'ajde_events_category', '1'], 
                           capture_output=True, text=True, timeout=30)
    return result.returncode == 0

def test_image_download():
    """Test image downloading."""
    result = subprocess.run(['./download-image.sh', 'https://www.portugalrunning.com/wp-content/uploads/2024/01/logo-header.png', '/tmp/test-image.png'], 
                           capture_output=True, text=True, timeout=30)
    return result.returncode == 0

def main():
    print("🕰️  Profiling individual operations...")
    print("=" * 50)
    
    # Test each operation
    time_operation("Fetch page", test_fetch_page)
    time_operation("Fetch event data", test_fetch_event_data)
    time_operation("Fetch ICS", test_fetch_ics)
    time_operation("Geocoding", test_geocoding)
    time_operation("Description generation", test_description)
    time_operation("Taxonomy lookup", test_taxonomy)
    time_operation("Image download", test_image_download)
    
    print("\n🏃‍♂️ Now testing full extraction with timing...")
    print("=" * 50)
    
    start_total = time.time()
    result = subprocess.run(['./extract-events.py', '--limit', '2', '--output', 'profile-test.json'], 
                           capture_output=True, text=True)
    total_duration = time.time() - start_total
    
    print(f"Total extraction time: {total_duration:.3f}s")
    print(f"Exit code: {result.returncode}")
    if result.stderr:
        print(f"Errors: {result.stderr}")
    
    # Clean up
    subprocess.run(['rm', '-f', 'profile-test.json', '/tmp/test-image.png'], 
                   capture_output=True)

if __name__ == "__main__":
    main()