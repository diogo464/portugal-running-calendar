#!/usr/bin/sh
set -e

# Check if description argument is provided
if [ $# -eq 0 ]; then
    echo "Usage: $0 \"Event Description\""
    exit 1
fi

DESCRIPTION="$1"

# Create cache directory
CACHE_DIR="description_cache"
mkdir -p "$CACHE_DIR"

# Generate hash for cache filename
DESCRIPTION_HASH=$(echo -n "$DESCRIPTION" | md5sum | cut -d' ' -f1)
CACHE_FILE="$CACHE_DIR/${DESCRIPTION_HASH}.txt"

# Check if cached result exists
if [ -f "$CACHE_FILE" ]; then
    # Return cached result
    cat "$CACHE_FILE"
    exit 0
fi

# Generate new description using LLM
SYSTEM="""
you are a helpful llm that converts descriptions of running events into succint one line descriptions, condensing that information and outputing only the essential.
here are some examples of the outputs you should generate:
+ The world's oldest annual marathon
+ Scenic run through Central Park
+ Run along Lake Michigan
+ Challenging trail through Texas Hill Country
+ Beautiful bay views throughout the course
+ High altitude marathon with mountain views
+ Independence Day beach run
+ Extreme endurance challenge in Pacific Northwest

you should output ONLY the single line description you generate and NOTHING else.
use the available information in the description and DO NOT make up anything that isn't there.
if you say an event is a marathon or half marathon you should NOT say the distance in meters since that is redundant.
"""

# Generate the description
RESULT=$(llm -m llama3.2:latest -s "$SYSTEM" "$DESCRIPTION")

# Cache the result
echo "$RESULT" > "$CACHE_FILE"

# Output the result
echo "$RESULT"
