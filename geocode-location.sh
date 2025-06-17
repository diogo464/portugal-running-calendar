#!/bin/bash

# Geocode location using OpenStreetMap Nominatim API
# Usage: ./geocode_location.sh "Location Name"

if [ $# -eq 0 ]; then
    echo "Usage: $0 \"Location Name\""
    echo "Example: $0 \"Pinhal Novo, Palmela\""
    exit 1
fi

LOCATION="$1"
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

echo "Original: $LOCATION"
echo "Cleaned: $CLEANED_LOCATION"
echo "Searching for: $CLEANED_LOCATION"
echo "=================================="

# Query the API
RESPONSE=$(curl -s "https://nominatim.openstreetmap.org/search?format=json&q=$ENCODED_LOCATION")

if [ -z "$RESPONSE" ] || [ "$RESPONSE" = "[]" ]; then
    echo "No results found for '$LOCATION'"
    exit 1
fi

# Check if we have valid JSON response and any relevant results
FILTERED_RESULTS=$(echo "$RESPONSE" | jq --argjson types "$(printf '%s\n' "${RELEVANT_TYPES[@]}" | jq -R . | jq -s .)" '[.[] | select(.addresstype as $at | $types | index($at))]' 2>/dev/null)

if [ -z "$FILTERED_RESULTS" ] || [ "$FILTERED_RESULTS" = "[]" ] || [ "$FILTERED_RESULTS" = "null" ]; then
    echo "No relevant location results found for '$CLEANED_LOCATION'"
    echo "Raw API response:"
    echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"
    exit 1
fi

# Parse and display results
echo "$FILTERED_RESULTS" | jq -r '
.[] |
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
    },
    importance: .importance
} |
"Name: \(.name)
Display Name: \(.display_name)
Type: \(.addresstype)
Coordinates: \(.coordinates.lat), \(.coordinates.lon)
Bounding Box: [\(.boundingbox.south), \(.boundingbox.north), \(.boundingbox.west), \(.boundingbox.east)]
Importance: \(.importance)
---"
' | head -20  # Limit output to avoid too much data

echo ""
echo "Most relevant result (JSON):"
echo "$FILTERED_RESULTS" | jq '
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
}'