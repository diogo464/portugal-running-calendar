#!/usr/bin/env python3
"""
Fetch ICS files for all events from events_parsed.json
Downloads from http://www.portugalrunning.com/export-events/<ID>_0/ to ics/<ID>.ics
"""

import json
import os
import requests
from pathlib import Path


def fetch_ics_files(events_file: str, ics_dir: str) -> None:
    """Fetch ICS files for all events."""
    print(f"Loading events from {events_file}...")
    
    with open(events_file, 'r', encoding='utf-8') as f:
        events = json.load(f)
    
    print(f"Found {len(events)} events to process")
    
    # Create ics directory if it doesn't exist
    ics_path = Path(ics_dir)
    ics_path.mkdir(exist_ok=True)
    print(f"Created/verified directory: {ics_dir}")
    
    downloaded = 0
    skipped = 0
    errors = []
    
    for event in events:
        event_id = event['event_id']
        event_title = event['event_title']
        ics_filename = f"{event_id}.ics"
        ics_file_path = ics_path / ics_filename
        
        # Skip if file already exists
        if ics_file_path.exists():
            skipped += 1
            continue
        
        # Construct download URL
        url = f"http://www.portugalrunning.com/export-events/{event_id}_0/"
        
        try:
            print(f"Downloading {event_title} (ID: {event_id})...")
            response = requests.get(url, timeout=30)
            response.raise_for_status()
            
            # Save to file
            with open(ics_file_path, 'w', encoding='utf-8') as f:
                f.write(response.text)
            
            downloaded += 1
            
        except requests.exceptions.RequestException as e:
            error_msg = f"Failed to download event {event_title} (ID: {event_id}) from {url}: {e}"
            errors.append(error_msg)
            continue
        except Exception as e:
            error_msg = f"Unexpected error for event {event_title} (ID: {event_id}): {e}"
            errors.append(error_msg)
            continue
    
    # Summary
    print(f"\nDownload Summary:")
    print(f"- Downloaded: {downloaded} files")
    print(f"- Skipped (already exist): {skipped} files")
    print(f"- Errors: {len(errors)} files")
    
    # Output errors at the end
    if errors:
        print(f"\n{len(errors)} DOWNLOAD ERRORS:")
        print("=" * 50)
        for error in errors:
            print(f"ERROR: {error}")
    
    print("Done!")


if __name__ == "__main__":
    events_file = "events-clean.json"
    ics_dir = "ics"
    
    fetch_ics_files(events_file, ics_dir)