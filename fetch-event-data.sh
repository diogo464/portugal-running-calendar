#!/usr/bin/env sh
if [ "$1" = "" ]; then
  echo "ERROR|USAGE|Missing required parameter: event id" >&2
  echo "Usage: $0 <event id>" >&2
  exit 1
fi

EVENT_ID="$1"
CACHE_DIR="event_data_cache"
CACHE_FILE="$CACHE_DIR/event_${EVENT_ID}.json"

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

# Check if GET command exists
if ! command -v GET > /dev/null 2>&1; then
    echo "ERROR|DEPENDENCY|GET command not found - install libwww-perl package" >&2
    exit 1
fi

# Check if cached file exists
if [ -f "$CACHE_FILE" ]; then
    echo "INFO|CACHE_HIT|Using cached file: $CACHE_FILE" >&2
    # Return cached content
    cat "$CACHE_FILE"
else
    echo "INFO|CACHE_MISS|Downloading event $EVENT_ID" >&2
    # Download and cache the event data
    TEMP_FILE=$(mktemp)
    if ! GET "https://portugalrunning.com/wp-json/wp/v2/ajde_events/$EVENT_ID" > "$TEMP_FILE" 2>/dev/null; then
        echo "ERROR|HTTP|Failed to download event $EVENT_ID" >&2
        rm -f "$TEMP_FILE"
        exit 1
    fi
    
    # Check if response is valid JSON and format it
    if ! jq . "$TEMP_FILE" > "$CACHE_FILE" 2>/dev/null; then
        echo "ERROR|JSON|Invalid JSON response for event $EVENT_ID" >&2
        echo "WARNING|DEBUG|Response content: $(head -c 200 "$TEMP_FILE")" >&2
        rm -f "$TEMP_FILE" "$CACHE_FILE"
        exit 1
    fi
    
    rm -f "$TEMP_FILE"
    
    # Check if file was actually written
    if [ ! -s "$CACHE_FILE" ]; then
        echo "ERROR|DOWNLOAD|Empty response received for event $EVENT_ID" >&2
        rm -f "$CACHE_FILE"
        exit 1
    fi
    
    echo "SUCCESS|DOWNLOAD|Event $EVENT_ID cached successfully" >&2
    # Return the downloaded content
    cat "$CACHE_FILE"
fi
