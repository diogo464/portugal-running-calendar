# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Portugal Running Event Scraper & Frontend

## Overview
This project scrapes running events from the Portugal Running calendar website and provides a modern React frontend for browsing events. It consists of two main components:
1. **Data extraction pipeline** - Python/Shell scripts in the root directory
2. **React frontend** - TypeScript/React application in the `frontend/` directory

## Common Commands

### Data Extraction & Processing (Root Directory)
- `python3 extract-events.py` - Main extraction script (requires Python 3.7+)
- `python3 extract-events.py --limit 10` - Extract limited events for testing
- `./extract-events.py --output events.json --skip-descriptions` - **Standard test command for error checking**
- `python3 profile-extraction.py` - Performance profiling of extraction pipeline
- `./fetch-event-page.sh <page_num>` - Fetch single page of events (cached)
- `./geocode-location.sh "Location"` - Geocode location with caching
- `./generate-one-line-description.sh "description"` - Generate LLM short descriptions
- `black *.py` - Format Python code after editing
- `use $(pass google-geocoding-api-key) to obtain the API key for google`

### Frontend Development (frontend/ Directory)
- `npm run dev` - Start development server with Vite (http://localhost:5174)
- `npm run build` - Build for production (TypeScript compilation + Vite build)
- `npm run lint` - Run ESLint on TypeScript/React code
- `npm run preview` - Preview production build locally
- `npm run deploy` - Build and deploy to Cloudflare Workers
- `npm run cf-typegen` - Generate Cloudflare Workers types

## Technology Stack Configuration

### Zod Configuration
- Use zod v4 with `import { z } from 'zod/v4'`. Ignore the fact that the package.json says zod is version 3, as version 4 is being shipped alongside version 3.
- Native TypeScript enums work with `z.enum(MyEnum)` syntax in Zod v4

### Frontend Stack
- **React 19** with TypeScript and SWC compilation
- **Vite 6** for build tooling and dev server
- **Tailwind CSS v4** for styling
- **Radix UI** for accessible components
- **Cloudflare Workers** for deployment
- **Zod v4** for type-safe data validation

## Architecture & Data Flow

### Data Extraction Pipeline (Root Directory)
1. **Event Pages** → `fetch-event-page.sh` → Cached JSON in `pages/`
2. **Event Details** → `fetch-event-data.sh` → Cached JSON in `event_data_cache/`
3. **Geocoding** → `geocode-location.py` (Google Maps API) → Cached coordinates in `geocoding_cache/`
4. **Images** → `download-image.sh` → Hash-named files in `media/`
5. **Descriptions** → `generate-one-line-description.sh` → Cached in `description_cache/`
6. **Final Processing** → `extract-events.py` → `portugal-running-events.json`

### Frontend Application Architecture (frontend/ Directory)
- **Entry Point**: `src/main.tsx` - React app bootstrap
- **Type Definitions**: `src/lib/app.ts` - Event schemas and TypeScript enums with Zod v4 validation
- **UI Components**: `src/components/ui/` - Reusable Radix UI components with Tailwind styling
- **Pages**: `src/components/running-events-page.tsx` - Main application page with event filtering
- **Build Output**: Cloudflare Workers-compatible static assets with SPA routing

### Data Flow Between Systems
```
Python Scripts → portugal-running-events.json → Frontend Assets → React Application
```

### Caching Strategy (Data Pipeline)
All external API calls are aggressively cached using MD5 hashes:
- Event pages cached by page number
- Geocoding cached by location string hash (Google Maps API with fallbacks)
- LLM descriptions cached by content hash
- Images cached by content hash as filename

### Event Data Structure
Events follow this canonical structure (validated by Zod schemas in frontend):
```json
{
  "event_id": 180,
  "event_name": "Event Name",
  "event_location": "City, Portugal", 
  "event_coordinates": {"lat": 38.707, "lon": -9.136},
  "event_country": "Portugal",
  "event_locality": "City",
  "event_distances": [21097, 42195],
  "event_types": ["half-marathon", "marathon"],
  "event_images": ["media/hash.jpg"],
  "event_start_date": "2020-10-11",
  "event_end_date": "2020-10-12",
  "event_circuit": [],
  "event_description": "Full description...",
  "description_short": "One-line summary"
}
```

### Frontend Type System
The frontend uses TypeScript enums for event types with display name mappings:
```typescript
enum EventType {
  Marathon = "marathon",
  HalfMarathon = "half-marathon",
  TenK = "10k",
  // ... all canonical event types
}
```
- Event types are validated against this enum using Zod v4
- Display names support Portuguese localization (e.g., "São Silvestre")
- Enum values are iterable for filter UI components using `Object.values(EventType)`

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