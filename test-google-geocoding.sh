#!/bin/bash

# Test script for Google Geocoding API
# Usage: ./test-google-geocoding.sh "Location Name" [API_KEY]

if [ $# -lt 1 ]; then
    echo "Usage: $0 \"Location Name\" [API_KEY]"
    echo "Example: $0 \"Meda de Douros Mouros, Coimbra, Portugal\" \$GOOGLE_API_KEY"
    exit 1
fi

LOCATION="$1"
API_KEY="${2:-$GOOGLE_MAPS_API_KEY}"

if [ -z "$API_KEY" ]; then
    echo "Error: No API key provided. Set GOOGLE_MAPS_API_KEY environment variable or pass as second argument."
    echo "To get an API key:"
    echo "1. Go to Google Cloud Console: https://console.cloud.google.com/"
    echo "2. Create a project or select existing one"
    echo "3. Enable the Geocoding API"
    echo "4. Create credentials (API key)"
    echo "5. Set billing (required for API usage)"
    exit 1
fi

# URL encode the location
ENCODED_LOCATION=$(echo "$LOCATION" | sed 's/ /+/g')

echo "Testing Google Geocoding API..."
echo "Location: $LOCATION"
echo "Encoded: $ENCODED_LOCATION"
echo ""

# Make the API request
RESPONSE=$(curl -s "https://maps.googleapis.com/maps/api/geocode/json?address=${ENCODED_LOCATION}&key=${API_KEY}")

echo "Raw Response:"
echo "$RESPONSE" | jq '.'

echo ""
echo "Extracted Coordinates:"
echo "$RESPONSE" | jq -r '.results[0].geometry.location // "No coordinates found"'

echo ""
echo "Status:"
echo "$RESPONSE" | jq -r '.status'

echo ""
echo "Formatted Address:"
echo "$RESPONSE" | jq -r '.results[0].formatted_address // "No address found"'