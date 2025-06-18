#!/usr/bin/env sh
if [ "$1" == "" ]; then
    echo "Usage: $0 <event id>"
    exit 1
fi

EVENT_ID="$1"
CACHE_DIR="ics_cache"
CACHE_FILE="$CACHE_DIR/event_${EVENT_ID}.ics"

# Create cache directory if it doesn't exist
mkdir -p "$CACHE_DIR"

# Check if cached file exists
if [ -f "$CACHE_FILE" ]; then
    # Return cached content
    cat "$CACHE_FILE"
else
    # Download and cache the ICS data
    curl -s "http://www.portugalrunning.com/export-events/${EVENT_ID}_0/" > "$CACHE_FILE"
    
    # Return the downloaded content
    cat "$CACHE_FILE"
fi
