# Portugal Running Scraper

## Overview
This project scrapes running events from the Portugal Running calendar website.

## API Details
- Website: https://www.portugalrunning.com/calendario-de-corridas/
- Uses WordPress plugin EventON
- API endpoint: https://www.portugalrunning.com/?evo-ajax=eventon_get_events
- Method: POST
- Content-Type: application/x-www-form-urlencoded

## Authentication
- Requires valid X-WP-Nonce header (changes frequently)
- Nonce can be extracted from main calendar page
- Look for `nonce` and `nonceX` values in the page source

## Key Parameters
- `event_type=27`: Filter for running events
- `direction=none`: Direction for pagination
- `ajaxtype=filering`: Type of AJAX request
- `event_count=10`: Number of events per request

## API Endpoints
Two main endpoints available:
1. **eventon_get_events** - List/filter view, limited results (~692 events)
2. **eventon_init_load** - Yearly calendar view, more comprehensive (~857 events)

## Nonce Extraction
The nonces are embedded in the main page and need to be extracted before making API calls:
- X-WP-Nonce header value
- nonce parameter in POST data
- nonceX parameter in POST data

## Scripts Available
- `scrape_events.sh` - Uses eventon_get_events endpoint (692 events)
- `scrape_events_yearly.sh` - Uses eventon_init_load endpoint (857 events, recommended)