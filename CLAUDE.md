# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Portugal Running Event Scraper & Frontend

## Overview
This project scrapes running events from the Portugal Running calendar website and provides a modern React frontend for browsing events. It consists of two main components:
1. **Data extraction pipeline** - Python CLI tool (`portugal-running-cli.py`) and Shell scripts in the root directory
2. **React frontend** - TypeScript/React application in the `frontend/` directory

## Common Commands

### Data Extraction & Processing (Root Directory)
- `python3 portugal-running-cli.py scrape` - Main CLI scraper (requires Python 3.11+)
- `python3 portugal-running-cli.py scrape --limit 10 --pages 1` - Extract limited events for testing
- `python3 portugal-running-cli.py cache stats` - View cache statistics
- `python3 portugal-running-cli.py cache clear` - Clear all caches
- `make test-scrape` - **Standard test command for error checking** (scrapes 3 events)
- `make format` - Format code with black (uses uv for dependency management)
- `make lint` - Run ruff linter with fixes
- `make typecheck` - Run mypy type checking
- `make all-checks` - Run all quality checks (lint, format, typecheck)
- `uv sync` - Install dependencies with uv package manager

### Frontend Development (frontend/ Directory)
- `make server` - Start development server with Vite in background using demon (http://localhost:5174)
- `demon list` - View running background processes (including server status)
- `demon cat server` - View server logs in real-time
- `npm run dev` - Start development server with Vite directly (foreground)
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

## Development Workflow

### Python Development (Root Directory)
1. Use `uv sync` to install dependencies 
2. Main CLI tool is `portugal-running-cli.py` with subcommands: `scrape`, `cache`
3. Always run `make all-checks` before committing (lint, format, typecheck)
4. Use `make test-scrape` for quick validation of scraping functionality
5. Shell scripts handle individual API calls: `fetch-event-page.sh`, `fetch-event-data.sh`, etc.

### Debugging & Testing
- Use `make test-scrape` for quick validation (scrapes 3 events with no geocoding/descriptions)
- Check structured logs with: `python3 portugal-running-cli.py scrape --limit 5 2>/tmp/errors.log`
- Cache statistics: `python3 portugal-running-cli.py cache stats`
- All external API calls are cached using MD5 hashes in respective cache directories

### Server Management
- `make server` - Start frontend dev server in background using demon process manager
- `demon list` - List all running background processes (shows server status)
- `demon cat server` - View real-time server logs and output
- `demon stop server` - Stop the background development server

## Key Files
- `portugal-running-cli.py` - Main CLI application with async scraping
- `Makefile` - Development automation (format, lint, test, typecheck)
- `pyproject.toml` - Python dependencies managed by uv
- `portugal-running-events.json` - Generated JSON output with event data
- `frontend/package.json` - React app dependencies and scripts

## Package Management
- **Python**: Use `uv` package manager (not pip/conda)
- **Node.js**: Use `npm` for frontend dependencies
- Python requires Python 3.11+ per pyproject.toml requirements