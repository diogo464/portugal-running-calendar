# Portugal Running Events - Static Site

A modern, responsive static website for browsing and filtering Portugal running events.

## Features

✨ **Client-Side Search** - Powered by Fuse.js for fast, fuzzy search  
🔍 **Advanced Filtering** - Filter by event type, distance, location  
📱 **Responsive Design** - Works perfectly on mobile and desktop  
🖼️ **Grid/List Views** - Switch between different display modes  
⚡ **Fast Performance** - No server required, works offline  
🎨 **Modern UI** - Clean, professional design with smooth animations  

## Technology Stack

- **HTML5** - Semantic markup
- **CSS3** - Modern styling with Grid/Flexbox
- **Vanilla JavaScript** - No framework dependencies  
- **Fuse.js** - Client-side fuzzy search library
- **Font Awesome** - Icons

## Data Structure

The site expects a JSON file with the following event structure:

```json
{
  "event_id": 180,
  "event_name": "Maratona de Lisboa",
  "event_location": "Lisboa, Portugal",
  "event_coordinates": {
    "lat": 38.7077507,
    "lon": -9.1365919
  },
  "event_bounding_box": {
    "south": 38.6913994,
    "north": 38.7967584,
    "west": -9.2298356,
    "east": -9.0863328
  },
  "event_distances": ["42.2km"],
  "event_types": ["marathon", "Meia-Maratona"],
  "event_images": ["media/295fa71a66ad3b0e260e1791b95786f5.png"],
  "event_start_date": "2020-10-11",
  "event_end_date": "2020-10-12",
  "event_circuit": [],
  "event_description": "Full event description...",
  "description_short": "Short one-line description"
}
```

## Usage

1. **Development**: Open `index.html` in a web browser
2. **Production**: Deploy to any static hosting service (Netlify, Vercel, GitHub Pages)

## Data Sources

- Place your events JSON file as `sample-events.json` or `portugal-running-events.json`
- Images should be in the `media/` directory
- The site will automatically load and display all events with filtering capabilities

## Browser Support

- Chrome (recommended)
- Firefox  
- Safari
- Edge

## Performance

- **Initial Load**: ~50KB (HTML + CSS + JS)
- **Fuse.js**: ~25KB (search library)
- **Total**: <100KB for full functionality
- **Search Speed**: <10ms for datasets under 1000 events