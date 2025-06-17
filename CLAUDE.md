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

## Nonce Extraction
The nonces are embedded in the main page and need to be extracted before making API calls:
- X-WP-Nonce header value
- nonce parameter in POST data
- nonceX parameter in POST data