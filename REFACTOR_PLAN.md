# Portugal Running CLI Refactor Plan - Code Structure Improvement

## Overview
Refactor the `cmd_scrape` function to improve readability and create a cleaner data flow by breaking it down into helper functions and introducing proper dataclasses.

## Previous Work ✅ COMPLETED
- ✅ Asyncio implementation with 10x+ performance improvement
- ✅ Professional-grade concurrent processing
- ✅ Enhanced error handling and resource management

## Current Refactoring Goal
Improve code structure and readability of the main scraping pipeline

## Current Issues
1. The `cmd_scrape` function is too long and handles multiple concerns
2. Data flow is not clear - multiple nested operations
3. Missing proper type definitions for intermediate data structures
4. Parallelism is embedded in the main function making it hard to understand

## Target Structure

The refactored `cmd_scrape` function should look like:

```python
async def cmd_scrape(args):
    # Setup
    cache_config = CacheConfig()
    cache_config.ensure_directories()
    
    async with WordPressClient(...) as wp_client:
        # Step 1: Fetch all pages in parallel
        pages = await fetch_pages(wp_client, args)
        
        # Step 2: Extract event IDs from pages
        event_ids = extract_event_ids_from_pages(pages)
        
        # Step 3: Fetch raw event data in parallel
        events = await fetch_events(wp_client, event_ids)
        
        # Step 4: Fetch ICS data in parallel  
        events_ics = await fetch_events_ics(wp_client, event_ids)
        
        # Step 5: Extract metadata from events and ICS
        events_metadata = extract_events_metadata(events, events_ics)
        
        # Step 6: Generate descriptions in parallel (if not skipped)
        if not args.skip_descriptions:
            events_with_descriptions = await generate_descriptions(events_metadata, args)
        else:
            events_with_descriptions = events_metadata
            
        # Step 7: Build final event instances
        final_events = build_final_events(events_with_descriptions)
        
        # Step 8: Save results
        await save_events(final_events, args.output)
```

## New Dataclasses

### 1. Page
```python
@dataclass
class Page:
    page_id: int
    event_ids: List[int]
```

### 2. RawEventData  
```python
@dataclass
class RawEventData:
    event_id: int
    title: str
    slug: str
    status: str
    content: Optional[str] = None
    excerpt: Optional[str] = None
    date: Optional[str] = None
    modified: Optional[str] = None
    # Add other WordPress fields as needed
```

### 3. EventIcsData
```python
@dataclass 
class EventIcsData:
    event_id: int
    location: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    description: Optional[str] = None
    summary: Optional[str] = None
    raw_ics_content: Optional[str] = None
```

### 4. EventMetadata
```python
@dataclass
class EventMetadata:
    event_id: int
    event_name: Optional[str] = None
    event_location: Optional[str] = None
    event_description: Optional[str] = None
    event_start_date: Optional[str] = None
    event_end_date: Optional[str] = None
    coordinates: Optional[Coordinates] = None
    country: Optional[str] = None
    locality: Optional[str] = None
    distances: List[int] = field(default_factory=list)
    event_types: List[str] = field(default_factory=list)
    description_short: Optional[str] = None
```

## New Helper Functions

### 1. `async def fetch_pages(wp_client, args) -> List[Page]`
- Determines which pages to fetch based on args.limit and args.pages
- Fetches pages in parallel using existing parallelism 
- Returns list of Page dataclasses

### 2. `def extract_event_ids_from_pages(pages: List[Page]) -> List[int]`
- Flattens event IDs from all pages
- Removes duplicates
- Returns sorted list of unique event IDs

### 3. `async def fetch_events(wp_client, event_ids: List[int]) -> List[RawEventData]`
- Fetches raw WordPress event data for all event IDs in parallel
- Returns list of RawEventData dataclasses
- Handles errors gracefully

### 4. `async def fetch_events_ics(wp_client, event_ids: List[int]) -> List[EventIcsData]`
- Fetches ICS calendar data for all event IDs in parallel
- Parses ICS content into structured data
- Returns list of EventIcsData dataclasses

### 5. `def extract_events_metadata(events: List[RawEventData], events_ics: List[EventIcsData]) -> List[EventMetadata]`
- Combines raw event data with ICS data
- Extracts distances and event types
- Performs geocoding if enabled
- Returns list of EventMetadata dataclasses

### 6. `async def generate_descriptions(events_metadata: List[EventMetadata], args) -> List[EventMetadata]`
- Generates short descriptions for events in parallel
- Updates EventMetadata with generated descriptions
- Returns updated list

### 7. `def build_final_events(events_metadata: List[EventMetadata]) -> List[Dict]`
- Converts EventMetadata to final Event format
- Applies final formatting and validation
- Returns list of dictionaries ready for JSON serialization

### 8. `async def save_events(events: List[Dict], output_path: str)`
- Saves events to JSON file asynchronously
- Handles file I/O errors

## Benefits of This Refactoring

1. **Clear Data Flow**: Each step has a clear input and output
2. **Better Type Safety**: Proper dataclasses for each stage
3. **Testability**: Each helper function can be tested independently  
4. **Maintainability**: Easier to modify individual steps
5. **Readability**: The main function reads like a pipeline
6. **Parallelism**: Parallel operations are factored into helper functions
7. **Error Handling**: Can be improved at each step independently

## Implementation Steps

1. Create new dataclasses at the top of the file
2. Implement helper functions one by one
3. Refactor cmd_scrape to use the new structure
4. Test with existing functionality to ensure compatibility
5. Update error handling and logging throughout

## Compatibility

- All existing command-line arguments and behavior should be preserved
- Caching mechanisms should continue to work
- Error handling should be at least as good as current implementation
- Performance should be maintained or improved