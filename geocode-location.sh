#!/bin/bash

# Geocode location using OpenStreetMap Nominatim API with caching
# Usage: ./geocode_location.sh "Location Name"
# Returns: Clean JSON object with geocoding result or null

if [ $# -eq 0 ]; then
    echo "null"
    exit 0
fi

LOCATION="$1"

# Create cache directory
CACHE_DIR="geocoding_cache"
mkdir -p "$CACHE_DIR"

# Generate hash for cache filename
LOCATION_HASH=$(echo -n "$LOCATION" | md5sum | cut -d' ' -f1)
CACHE_FILE="$CACHE_DIR/${LOCATION_HASH}.json"

# Check if cached result exists
if [ -f "$CACHE_FILE" ]; then
    # Return cached result
    cat "$CACHE_FILE"
    exit 0
fi
# Clean up the location string: remove escaped commas, normalize spaces, remove duplicates
CLEANED_LOCATION=$(echo "$LOCATION" | sed 's/\\,/,/g' | sed 's/  */ /g' | sed 's/^ *//g' | sed 's/ *$//g')
# Remove duplicate parts (e.g. "Pinhal Novo, Palmela Pinhal Novo, Palmela" -> "Pinhal Novo, Palmela")
CLEANED_LOCATION=$(echo "$CLEANED_LOCATION" | awk '{
    split($0, parts, " ")
    result = ""
    for (i = 1; i <= NF; i++) {
        if (index(result, $i) == 0) {
            if (result != "") result = result " "
            result = result $i
        }
    }
    print result
}')
ENCODED_LOCATION=$(echo "$CLEANED_LOCATION" | sed 's/ /+/g' | sed 's/,/%2C/g')

# Relevant address types for places (excluding transport infrastructure, etc.)
RELEVANT_TYPES=(
    "city"
    "town"
    "village"
    "hamlet"
    "municipality" 
    "county"
    "suburb"
    "city_district"
    "neighbourhood"
    "quarter"
)

# Query the API
RESPONSE=$(curl -s "https://nominatim.openstreetmap.org/search?format=json&q=$ENCODED_LOCATION")

if [ -z "$RESPONSE" ] || [ "$RESPONSE" = "[]" ]; then
    echo "null" > "$CACHE_FILE"
    echo "null"
    exit 0
fi

# Check if we have valid JSON response and any relevant results
FILTERED_RESULTS=$(echo "$RESPONSE" | jq --argjson types "$(printf '%s\n' "${RELEVANT_TYPES[@]}" | jq -R . | jq -s .)" '[.[] | select(.addresstype as $at | $types | index($at))]' 2>/dev/null)

if [ -z "$FILTERED_RESULTS" ] || [ "$FILTERED_RESULTS" = "[]" ] || [ "$FILTERED_RESULTS" = "null" ]; then
    echo "null" > "$CACHE_FILE"
    echo "null"
    exit 0
fi

# Get the most relevant result as clean JSON
RESULT=$(echo "$FILTERED_RESULTS" | jq '
sort_by(-.importance) | .[0] |
{
    name: .name,
    display_name: .display_name,
    addresstype: .addresstype,
    coordinates: {
        lat: (.lat | tonumber),
        lon: (.lon | tonumber)
    },
    boundingbox: {
        south: (.boundingbox[0] | tonumber),
        north: (.boundingbox[1] | tonumber),
        west: (.boundingbox[2] | tonumber), 
        east: (.boundingbox[3] | tonumber)
    }
}')

# Cache the result
echo "$RESULT" > "$CACHE_FILE"

# Output the result
echo "$RESULT"