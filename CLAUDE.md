# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Portugal Running Event Scraper

## Overview
This project scrapes running events from the Portugal Running calendar website and processes them into structured JSON data. It consists of a comprehensive data extraction pipeline with Python/Shell scripts that scrape, enrich, and process event data.

## Common Commands

### Data Extraction & Processing
- `python3 extract-events.py` - Main extraction script (requires Python 3.7+)
- `python3 extract-events.py --limit 10` - Extract limited events for testing
- `./extract-events.py --output events.json --skip-descriptions` - **Standard test command for error checking**
- `python3 profile-extraction.py` - Performance profiling of extraction pipeline
- `./fetch-event-page.sh <page_num>` - Fetch single page of events (cached)
- `./geocode-location.sh "Location"` - Geocode location with caching
- `./generate-one-line-description.sh "description"` - Generate LLM short descriptions
- `black *.py` - Format Python code after editing
- `use $(pass google-geocoding-api-key) to obtain the API key for google`


## Architecture & Data Flow

### Extraction Pipeline
1. **Event Pages** → `fetch-event-page.sh` → Cached JSON in `pages/`
2. **Event Details** → `fetch-event-data.sh` → Cached JSON in `event_data_cache/`
3. **Geocoding** → `geocode-location.sh` → Cached coordinates in `geocoding_cache/`
4. **Images** → `download-image.sh` → Hash-named files in `media/`
5. **Descriptions** → `generate-one-line-description.sh` → Cached in `description_cache/`
6. **Final Processing** → `extract-events.py` → `portugal-running-events.json`

### Caching Strategy
All external API calls are aggressively cached using MD5 hashes:
- Event pages cached by page number
- Geocoding cached by location string hash
- LLM descriptions cached by content hash
- Images cached by content hash as filename

### Event Data Structure
Events follow this canonical structure:
```json
{
  "event_id": 180,
  "event_name": "Event Name",
  "event_location": "City, Portugal", 
  "event_coordinates": {"lat": 38.707, "lon": -9.136},
  "event_country": "Portugal",
  "event_locality": "City",
  "event_distances": ["42.2km"],
  "event_types": ["marathon"],
  "event_images": ["media/hash.jpg"],
  "event_start_date": "2020-10-11",
  "event_end_date": "2020-10-12",
  "event_description": "Full description...",
  "description_short": "One-line summary"
}
```

## API Details & Authentication

### WordPress API
- Website: https://www.portugalrunning.com/calendario-de-corridas/
- REST API: `https://portugalrunning.com/wp-json/wp/v2/ajde_events`
- EventON AJAX: `https://www.portugalrunning.com/?evo-ajax=eventon_get_events`
- Authentication: X-WP-Nonce header (extract from main page)

### External Services
- **Geocoding**: OpenStreetMap Nominatim API (rate-limited)
- **LLM Descriptions**: Requires LLM API configuration
- **Images**: Direct download from Portugal Running CDN


## Error Handling & Logging

### Structured Logging Format
All scripts use structured logging to stderr for machine-readable error handling:
- **Format**: `LEVEL|CATEGORY|MESSAGE|CONTEXT`
- **Levels**: ERROR, WARNING, INFO
- **Categories**: HTTP, JSON, GEOCODING, TIMEOUT, MAPPING, LLM, IMAGE, ICS, TAXONOMY, etc.
- **Context**: Additional details for debugging

### Common Error Categories
- `ERROR|HTTP|Request failed` - Network/API failures
- `ERROR|JSON|Invalid JSON response` - Malformed data
- `ERROR|GEOCODING|Failed to geocode location` - Location lookup failures
- `ERROR|TIMEOUT|Operation timed out` - Request timeouts
- `WARNING|MAPPING|Unmapped event type found` - Missing type mappings
- `ERROR|ICS|Failed to parse calendar data` - Calendar format issues

### Testing for Errors
Use the standard test command to check for issues:
```bash
./extract-events.py --output events.json --skip-descriptions 2>/tmp/errors.log
```

## Key Files
- `extract-events.py` - Main extraction orchestrator with CLI args
- `portugal-running-events.json` - Generated JSON output with event data