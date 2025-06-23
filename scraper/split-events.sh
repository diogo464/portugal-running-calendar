#!/bin/bash

# Script to split portugal-running-events.json into individual event files

INPUT_FILE="portugal-running-events.json"
OUTPUT_DIR="events"

# Check if input file exists
if [ ! -f "$INPUT_FILE" ]; then
    echo "Error: $INPUT_FILE not found"
    exit 1
fi

# Create output directory if it doesn't exist
mkdir -p "$OUTPUT_DIR"

# Use jq to process the JSON array and split into individual files
jq -c '.[]' "$INPUT_FILE" | while read -r event; do
    # Extract the id from the event
    id=$(echo "$event" | jq -r '.id')
    
    # Write the event to individual file
    echo "$event" | jq '.' > "$OUTPUT_DIR/${id}.json"
    
    echo "Created $OUTPUT_DIR/${id}.json"
done

echo "Finished splitting events into individual files"