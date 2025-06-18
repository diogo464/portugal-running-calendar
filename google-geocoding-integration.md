# Google Geocoding API Integration Guide

## Overview
This document outlines how to integrate Google's Geocoding API as an alternative to the current OpenStreetMap Nominatim service for improved location resolution.

## Current vs Google Geocoding

### Current Implementation (OpenStreetMap Nominatim)
- **Free**: No API key required
- **Rate Limited**: 1 request per second
- **Coverage**: Good for major locations, limited for specific Portuguese locations
- **Accuracy**: Variable, struggles with local Portuguese place names

### Google Geocoding API
- **Paid**: Requires API key and billing ($5 per 1000 requests)
- **Rate Limit**: 50 requests per second (much higher)
- **Coverage**: Excellent global coverage including Portugal
- **Accuracy**: Superior, especially for local locations

## API Setup

### 1. Get Google Maps API Key
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the "Geocoding API"
4. Go to "Credentials" → "Create Credentials" → "API Key"
5. Enable billing (required for API usage)
6. Optionally restrict the API key to Geocoding API only

### 2. Set Environment Variable
```bash
export GOOGLE_MAPS_API_KEY="your_api_key_here"
```

## Usage Examples

### Basic Curl Request
```bash
curl "https://maps.googleapis.com/maps/api/geocode/json?address=Meda+de+Douros+Mouros,+Coimbra,+Portugal&key=$GOOGLE_MAPS_API_KEY"
```

### Test Script Usage
```bash
# Test the problematic location
./test-google-geocoding.sh "Meda de Douros Mouros, Coimbra, Portugal"

# Test with custom API key
./test-google-geocoding.sh "Póvoa de Lanhoso" "your_api_key"
```

## Response Format

### Successful Response
```json
{
  "results": [
    {
      "address_components": [...],
      "formatted_address": "Coimbra, Portugal",
      "geometry": {
        "location": {
          "lat": 40.2033145,
          "lng": -8.4102573
        },
        "location_type": "APPROXIMATE",
        "viewport": {
          "northeast": {
            "lat": 40.2046634802915,
            "lng": -8.408908319708499
          },
          "southwest": {
            "lat": 40.2019655197085,
            "lng": -8.411606280291503
          }
        }
      },
      "place_id": "ChIJ...",
      "types": ["locality", "political"]
    }
  ],
  "status": "OK"
}
```

## Integration Options

### Option 1: Replace OpenStreetMap Entirely
- Modify `geocode-location.py` to use Google API
- Better accuracy but costs money
- Faster processing (higher rate limits)

### Option 2: Fallback Strategy
- Try OpenStreetMap first (free)
- Fall back to Google API if OSM fails
- Best of both worlds: free when possible, accurate when needed

### Option 3: Dual Cache System
- Use Google API for initial population
- Cache results permanently
- One-time cost for building comprehensive cache

## Cost Analysis

### Current Failures
From recent extractions, approximately 50+ locations fail geocoding per full run (4,206 events).

### Google API Costs
- $5 per 1,000 requests
- 50 failed locations = $0.25 per full extraction
- One-time cost to fix all historical failures: ~$1-2

## Implementation Strategy

### Phase 1: Testing
1. Test Google API with known failing locations
2. Compare accuracy with OpenStreetMap results
3. Measure success rate improvement

### Phase 2: Hybrid Implementation
1. Create `geocode-location-google.py` script
2. Modify extraction pipeline to try both APIs
3. Log which API was successful for analysis

### Phase 3: Optimization
1. Build permanent cache of Google results
2. Optimize for cost-effectiveness
3. Monitor and tune fallback logic

## Code Changes Required

### New Script: `geocode-location-google.py`
```bash
#!/bin/bash
# Similar to existing geocode-location.py but using Google API
# Would need to handle API key, rate limiting, caching
```

### Modified: `extract-events.py`
```python
# Add fallback logic in geocoding section
# Try OSM first, then Google if it fails
# Cache both results with source information
```

## Testing Commands

```bash
# Test current failing locations
./test-google-geocoding.sh "Meda de Douros Mouros, Coimbra"
./test-google-geocoding.sh "Mondim de Basto Bastos Vila Real"
./test-google-geocoding.sh "Çbidos"

# Compare with current geocoding
./geocode-location.py "Meda de Douros Mouros, Coimbra"
```

## Next Steps

1. **Set up API key**: Get Google Maps API credentials
2. **Test accuracy**: Compare results for failing locations
3. **Implement fallback**: Create hybrid geocoding strategy
4. **Measure costs**: Monitor API usage and costs
5. **Optimize**: Fine-tune for best cost/accuracy balance