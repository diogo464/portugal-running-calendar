#!/usr/bin/env python3
"""
Generate descriptions for events by extracting DESCRIPTION from ICS files
and processing them through generate-one-line-description.sh
"""

import json
import os
import subprocess
import re
from pathlib import Path


def extract_description_from_ics(ics_file_path: str) -> str:
    """Extract the DESCRIPTION field from an ICS file."""
    try:
        with open(ics_file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Look for DESCRIPTION field - it can span multiple lines
        # ICS format uses line folding with CRLF + space/tab
        description_match = re.search(r'^DESCRIPTION:(.*?)(?=^[A-Z]|\Z)', content, re.MULTILINE | re.DOTALL)
        
        if description_match:
            description = description_match.group(1)
            # Remove line folding (CRLF + space/tab becomes nothing)
            description = re.sub(r'\r?\n[ \t]', '', description)
            # Remove any remaining newlines and normalize whitespace
            description = re.sub(r'\s+', ' ', description.strip())
            return description
        
        return ""
    
    except Exception as e:
        print(f"Error reading ICS file {ics_file_path}: {e}")
        return ""


def generate_description(input_text: str) -> str:
    """Generate one-line description using the external script."""
    try:
        result = subprocess.run(
            ['./generate-one-line-description.sh'],
            input=input_text,
            text=True,
            capture_output=True,
            timeout=30
        )
        
        if result.returncode == 0:
            return result.stdout.strip()
        else:
            print(f"Script failed with return code {result.returncode}: {result.stderr}")
            return ""
    
    except subprocess.TimeoutExpired:
        print("Description generation timed out")
        return ""
    except Exception as e:
        print(f"Error running description generator: {e}")
        return ""


def generate_descriptions_for_events(events_file: str, ics_dir: str, descriptions_dir: str) -> None:
    """Generate descriptions for all events."""
    print(f"Loading events from {events_file}...")
    
    try:
        with open(events_file, 'r', encoding='utf-8') as f:
            events = json.load(f)
    except Exception as e:
        print(f"Error loading events file: {e}")
        return
    
    print(f"Found {len(events)} events to process")
    
    # Create descriptions directory if it doesn't exist
    descriptions_path = Path(descriptions_dir)
    descriptions_path.mkdir(exist_ok=True)
    print(f"Created/verified directory: {descriptions_dir}")
    
    ics_path = Path(ics_dir)
    processed = 0
    skipped = 0
    errors = []
    
    for event in events:
        event_id = event['event_id']
        event_title = event['event_title']
        
        # Check if description already exists
        description_file = descriptions_path / f"{event_id}.txt"
        if description_file.exists():
            skipped += 1
            continue
        
        # Look for ICS file
        ics_file = ics_path / f"{event_id}.ics"
        if not ics_file.exists():
            error_msg = f"ICS file not found for event: {event_title} (ID: {event_id})"
            errors.append(error_msg)
            continue
        
        print(f"Processing {event_title} (ID: {event_id})...")
        
        # Extract description from ICS
        ics_description = extract_description_from_ics(str(ics_file))
        if not ics_description:
            error_msg = f"No description found in ICS for event: {event_title} (ID: {event_id})"
            errors.append(error_msg)
            continue
        
        # Generate one-line description
        generated_description = generate_description(ics_description)
        if not generated_description:
            error_msg = f"Failed to generate description for event: {event_title} (ID: {event_id})"
            errors.append(error_msg)
            continue
        
        # Save to file
        try:
            with open(description_file, 'w', encoding='utf-8') as f:
                f.write(generated_description)
            processed += 1
        except Exception as e:
            error_msg = f"Failed to save description for event: {event_title} (ID: {event_id}): {e}"
            errors.append(error_msg)
            continue
    
    # Summary
    print(f"\nDescription Generation Summary:")
    print(f"- Processed: {processed} events")
    print(f"- Skipped (already exist): {skipped} events") 
    print(f"- Errors: {len(errors)} events")
    
    # Output errors at the end
    if errors:
        print(f"\n{len(errors)} DESCRIPTION GENERATION ERRORS:")
        print("=" * 60)
        for error in errors:
            print(f"ERROR: {error}")
    
    print("Done!")


if __name__ == "__main__":
    events_file = "events-clean.json"
    ics_dir = "ics"
    descriptions_dir = "descriptions"
    
    generate_descriptions_for_events(events_file, ics_dir, descriptions_dir)