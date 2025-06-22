#!/usr/bin/env sh
if [ "$1" = "" ]; then
  echo "ERROR|USAGE|Missing required parameter: page number" >&2
  echo "Usage: $0 <page number>" >&2
  exit 1
fi

PAGE_NUM="$1"
CACHE_DIR="pages"
CACHE_FILE="$CACHE_DIR/page_${PAGE_NUM}.json"

# Validate page number is numeric
if ! echo "$PAGE_NUM" | grep -E '^[0-9]+$' > /dev/null; then
    echo "ERROR|VALIDATION|Page number must be a positive integer: $PAGE_NUM" >&2
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
    echo "INFO|CACHE_MISS|Downloading page $PAGE_NUM" >&2
    # Download and cache the page
    HTTP_CODE=$(curl -s -w "%{http_code}" -o "$CACHE_FILE" "https://portugalrunning.com/wp-json/wp/v2/ajde_events?per_page=100&orderby=date&order=asc&page=$PAGE_NUM")
    
    if [ "$HTTP_CODE" != "200" ]; then
        echo "ERROR|HTTP|Request failed with status $HTTP_CODE for page $PAGE_NUM" >&2
        rm -f "$CACHE_FILE"
        exit 1
    fi
    
    # Check if file was actually written and is valid JSON
    if [ ! -s "$CACHE_FILE" ]; then
        echo "ERROR|DOWNLOAD|Empty response received for page $PAGE_NUM" >&2
        rm -f "$CACHE_FILE"
        exit 1
    fi
    
    # Basic JSON validation
    if ! jq empty "$CACHE_FILE" 2>/dev/null; then
        echo "ERROR|JSON|Invalid JSON response for page $PAGE_NUM" >&2
        echo "WARNING|DEBUG|Response content: $(head -c 200 "$CACHE_FILE")" >&2
        rm -f "$CACHE_FILE"
        exit 1
    fi
    
    echo "SUCCESS|DOWNLOAD|Page $PAGE_NUM cached successfully" >&2
    # Return the downloaded content
    cat "$CACHE_FILE"
fi
