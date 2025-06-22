#!/usr/bin/env sh
if [ "$1" = "" ]; then
    echo "ERROR|USAGE|Missing required parameter: event id" >&2
    echo "Usage: $0 <event id>" >&2
    exit 1
fi

EVENT_ID="$1"
CACHE_DIR="ics_cache"
CACHE_FILE="$CACHE_DIR/event_${EVENT_ID}.ics"

# Validate event ID is numeric
if ! echo "$EVENT_ID" | grep -E '^[0-9]+$' > /dev/null; then
    echo "ERROR|VALIDATION|Event ID must be a positive integer: $EVENT_ID" >&2
    exit 1
fi

# Create cache directory if it doesn't exist
if ! mkdir -p "$CACHE_DIR" 2>/dev/null; then
    echo "ERROR|FILESYSTEM|Failed to create cache directory: $CACHE_DIR" >&2
    exit 1
fi

# Check if cached file exists
if [ -f "$CACHE_FILE" ]; then
    echo "INFO|CACHE_HIT|Using cached file: $CACHE_FILE" >&2
    # Return cached content
    cat "$CACHE_FILE"
else
    echo "INFO|CACHE_MISS|Downloading ICS for event $EVENT_ID" >&2
    # Download and cache the ICS data
    HTTP_CODE=$(curl -s -w "%{http_code}" -o "$CACHE_FILE" "http://www.portugalrunning.com/export-events/${EVENT_ID}_0/")
    
    if [ "$HTTP_CODE" != "200" ]; then
        echo "ERROR|HTTP|Request failed with status $HTTP_CODE for event $EVENT_ID ICS" >&2
        rm -f "$CACHE_FILE"
        exit 1
    fi
    
    # Check if file was actually written
    if [ ! -s "$CACHE_FILE" ]; then
        echo "ERROR|DOWNLOAD|Empty ICS response received for event $EVENT_ID" >&2
        rm -f "$CACHE_FILE"
        exit 1
    fi
    
    # Basic ICS validation - check if it starts with BEGIN:VCALENDAR
    if ! head -n 1 "$CACHE_FILE" | grep -q "BEGIN:VCALENDAR"; then
        echo "ERROR|FORMAT|Invalid ICS format for event $EVENT_ID" >&2
        echo "WARNING|DEBUG|Response content: $(head -c 200 "$CACHE_FILE")" >&2
        rm -f "$CACHE_FILE"
        exit 1
    fi
    
    echo "SUCCESS|DOWNLOAD|Event $EVENT_ID ICS cached successfully" >&2
    # Return the downloaded content
    cat "$CACHE_FILE"
fi
