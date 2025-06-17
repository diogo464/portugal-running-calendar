#!/usr/bin/env python3
"""
Parse events from events_clean.json and extract specific fields into a structured format.
"""

import json
from dataclasses import dataclass, asdict
from datetime import datetime


@dataclass
class ParsedEvent:
    """Dataclass representing a parsed event with the required fields."""
    event_id: int
    event_title: str
    unix_start: int
    unix_end: int
    event_type: str
    evcal_lmlink: str
    thumbnail_id: list[str]


def extract_event_data(event: dict) -> ParsedEvent:
    """Extract required fields from an event dictionary."""
    # Extract basic fields
    event_id = event.get('event_id', 0)
    event_title = event.get('event_title', '')
    unix_start = event.get('unix_start', 0)
    unix_end = event.get('unix_end', 0)
    event_type = event.get('event_type', '')
    
    # Validate required fields
    if not event_id:
        raise ValueError(f"Missing or invalid event_id in event: {event.get('event_title', 'Unknown')}")
    if not event_title:
        raise ValueError(f"Missing event_title for event_id: {event_id}")
    if not unix_start:
        raise ValueError(f"Missing unix_start for event: {event_title} (ID: {event_id})")
    if not unix_end:
        raise ValueError(f"Missing unix_end for event: {event_title} (ID: {event_id})")
    
    # Extract from event_pmv nested dict
    event_pmv = event.get('event_pmv', {})
    if not event_pmv:
        raise ValueError(f"Missing event_pmv section for event: {event_title} (ID: {event_id})")
    
    # Extract evcal_lmlink - must be exactly 1 element
    evcal_lmlink_raw = event_pmv.get('evcal_lmlink', [])
    if not isinstance(evcal_lmlink_raw, list):
        evcal_lmlink_raw = [evcal_lmlink_raw] if evcal_lmlink_raw else []
    
    if len(evcal_lmlink_raw) == 0:
        raise ValueError(f"No evcal_lmlink found for event: {event_title} (ID: {event_id})")
    elif len(evcal_lmlink_raw) > 1:
        raise ValueError(f"Multiple evcal_lmlink entries ({len(evcal_lmlink_raw)}) found for event: {event_title} (ID: {event_id}), expected exactly 1. Links: {evcal_lmlink_raw}")
    
    evcal_lmlink = evcal_lmlink_raw[0]
    if not evcal_lmlink or not isinstance(evcal_lmlink, str):
        raise ValueError(f"Invalid evcal_lmlink value for event: {event_title} (ID: {event_id}), got: {evcal_lmlink}")
    
    # Extract _thumbnail_id - it's a list in the event_pmv
    thumbnail_id = event_pmv.get('_thumbnail_id', [])
    if not isinstance(thumbnail_id, list):
        thumbnail_id = [thumbnail_id] if thumbnail_id else []
    
    return ParsedEvent(
        event_id=event_id,
        event_title=event_title,
        unix_start=unix_start,
        unix_end=unix_end,
        event_type=event_type,
        evcal_lmlink=evcal_lmlink,
        thumbnail_id=thumbnail_id
    )


def parse_events_json(input_file: str, output_file: str) -> None:
    """Parse events from input JSON file and save to output JSON file."""
    print(f"Loading events from {input_file}...")
    
    with open(input_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    parsed_events = []
    errors = []
    
    # Iterate through all calendar keys in cals
    cals = data.get('cals', {})
    
    for cal_key, cal_data in cals.items():
        print(f"Processing calendar: {cal_key}")
        
        # Get the json array from each calendar
        events_list = cal_data.get('json', [])
        
        for event in events_list:
            try:
                parsed_event = extract_event_data(event)
                parsed_events.append(asdict(parsed_event))
            except Exception as e:
                # Get unix_start for human readable date
                unix_start = event.get('unix_start', 0)
                if unix_start:
                    readable_date = datetime.fromtimestamp(unix_start).strftime('%Y-%m-%d %H:%M:%S')
                    error_msg = f"Failed to parse event on {readable_date} - {e}"
                else:
                    error_msg = f"Failed to parse event - {e}"
                errors.append(error_msg)
                continue
    
    print(f"Successfully parsed {len(parsed_events)} events")
    
    # Save parsed events to output file
    print(f"Saving parsed events to {output_file}...")
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(parsed_events, f, indent=2, ensure_ascii=False)
    
    # Output all errors at the end
    if errors:
        print(f"\n{len(errors)} PARSING ERRORS:")
        print("=" * 50)
        for error in errors:
            print(f"ERROR: {error}")
    
    print("Done!")


if __name__ == "__main__":
    input_file = "events_clean.json"
    output_file = "events_parsed.json"
    
    parse_events_json(input_file, output_file)