#!/usr/bin/env sh
if [ "$#" -ne 2 ]; then
    echo "Usage: $0 <image_url> <output_filepath>"
    exit 1
fi

IMAGE_URL="$1"
OUTPUT_FILEPATH="$2"

# Check if file already exists
if [ -f "$OUTPUT_FILEPATH" ]; then
    # File already exists, no need to download
    echo "$OUTPUT_FILEPATH"
    exit 0
fi

# Create directory if it doesn't exist
mkdir -p "$(dirname "$OUTPUT_FILEPATH")"

# Download the image
curl -s -L "$IMAGE_URL" -o "$OUTPUT_FILEPATH"

# Return the filepath
echo "$OUTPUT_FILEPATH"