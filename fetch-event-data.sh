#!/usr/bin/env sh
if [ "$1" = "" ]; then
  echo "Usage: $0 <event id>"
  exit 1
fi

EVENT_ID="$1"
CACHE_DIR="event_data_cache"
CACHE_FILE="$CACHE_DIR/event_${EVENT_ID}.json"

# Create cache directory if it doesn't exist
mkdir -p "$CACHE_DIR"

# Check if cached file exists
if [ -f "$CACHE_FILE" ]; then
    # Return cached content
    cat "$CACHE_FILE"
else
    # Download and cache the event data
    GET "https://portugalrunning.com/wp-json/wp/v2/ajde_events/$EVENT_ID" | jq . > "$CACHE_FILE"
    
    # Return the downloaded content
    cat "$CACHE_FILE"
fi
