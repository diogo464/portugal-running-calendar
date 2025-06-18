#!/usr/bin/env sh
if [ "$#" -ne 2 ]; then
    echo "Usage: $0 <taxonomy_type> <taxonomy_id>"
    exit 1
fi

TAXONOMY_TYPE="$1"
TAXONOMY_ID="$2"
CACHE_DIR="taxonomy_cache"
CACHE_FILE="$CACHE_DIR/${TAXONOMY_TYPE}_${TAXONOMY_ID}.json"

# Create cache directory if it doesn't exist
mkdir -p "$CACHE_DIR"

# Check if cached file exists
if [ -f "$CACHE_FILE" ]; then
    # Return cached content
    cat "$CACHE_FILE"
else
    # Download and cache the taxonomy data
    GET "https://www.portugalrunning.com/wp-json/wp/v2/${TAXONOMY_TYPE}/${TAXONOMY_ID}" > "$CACHE_FILE" 2>/dev/null
    
    # Return the downloaded content
    cat "$CACHE_FILE"
fi