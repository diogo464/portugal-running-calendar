#!/usr/bin/env sh
if [ "$1" = "" ]; then
  echo "Usage: $0 <page number>"
  exit 1
fi

PAGE_NUM="$1"
CACHE_DIR="pages"
CACHE_FILE="$CACHE_DIR/page_${PAGE_NUM}.json"

# Create cache directory if it doesn't exist
mkdir -p "$CACHE_DIR"

# Check if cached file exists
if [ -f "$CACHE_FILE" ]; then
    # Return cached content
    cat "$CACHE_FILE"
else
    # Download and cache the page
    curl -s "https://portugalrunning.com/wp-json/wp/v2/ajde_events?per_page=100&orderby=date&order=asc&page=$PAGE_NUM" > "$CACHE_FILE"
    
    # Return the downloaded content
    cat "$CACHE_FILE"
fi
