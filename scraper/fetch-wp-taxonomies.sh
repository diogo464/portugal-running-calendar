#!/usr/bin/env sh

CACHE_DIR="wp_cache"
CACHE_FILE="$CACHE_DIR/taxonomies.json"

# Create cache directory if it doesn't exist
mkdir -p "$CACHE_DIR"

# Check if cached file exists
if [ -f "$CACHE_FILE" ]; then
    # Return cached content
    cat "$CACHE_FILE" | jq
else
    # Download and cache the taxonomies data
    GET https://portugalrunning.com/wp-json/wp/v2/taxonomies > "$CACHE_FILE"
    
    # Return the downloaded content
    cat "$CACHE_FILE" | jq
fi
