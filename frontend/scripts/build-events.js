const fs = require('fs').promises;
const path = require('path');
const { z } = require('zod');

// Coordinates schema for lat/lon coordinates
const CoordinatesSchema = z.object({
  lat: z.number(),
  lon: z.number()
});

// Event schema matching the actual JSON structure
const EventSchema = z.object({
  id: z.number(),
  slug: z.string().optional(),
  name: z.string().min(1, "Event name is required"),
  location: z.string(),
  coordinates: CoordinatesSchema.nullable(),
  country: z.string().nullable(),
  locality: z.string().nullable(),
  distances: z.array(z.number().positive("Distance must be positive")),
  types: z.array(z.string()),
  images: z.array(z.string()),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD format").nullable(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD format").nullable(),
  circuit: z.array(z.any()),
  description: z.string(),
  description_short: z.string().nullable(),
  page: z.string().nullable(),
  administrative_area_level_1: z.string().nullable().optional(),
  administrative_area_level_2: z.string().nullable().optional(),
  administrative_area_level_3: z.string().nullable().optional(),
  district_code: z.number().nullable().optional()
});

async function buildEvents() {
  console.log('Building event files...');
  
  const eventsDir = path.join(process.cwd(), 'public', 'events');
  const publicDir = path.join(process.cwd(), 'public');
  
  try {
    // Read all JSON files from the events directory
    const files = await fs.readdir(eventsDir);
    const jsonFiles = files.filter(file => file.endsWith('.json'));
    
    console.log(`Found ${jsonFiles.length} event files`);
    
    const events = [];
    const errors = [];
    
    // Process each event file
    for (const file of jsonFiles) {
      const filePath = path.join(eventsDir, file);
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const data = JSON.parse(content);
        
        // Validate with Zod schema
        const validatedEvent = EventSchema.parse(data);
        events.push(validatedEvent);
      } catch (error) {
        errors.push({
          file,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
    
    // If there are any errors, fail the build
    if (errors.length > 0) {
      console.error('\n❌ Validation errors found:');
      errors.forEach(({ file, error }) => {
        console.error(`  - ${file}: ${error}`);
      });
      process.exit(1);
    }
    
    console.log(`✅ Successfully validated ${events.length} events`);
    
    // Sort events by start_date (null dates go to the end)
    events.sort((a, b) => {
      if (!a.start_date && !b.start_date) return 0;
      if (!a.start_date) return 1;
      if (!b.start_date) return -1;
      return a.start_date.localeCompare(b.start_date);
    });
    
    // Write the main events.json file
    await fs.writeFile(
      path.join(publicDir, 'events.json'),
      JSON.stringify(events, null, 2),
      'utf-8'
    );
    console.log('✅ Generated events.json');
    
    // Filter upcoming events (start_date >= today)
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const upcomingEvents = events.filter(event => {
      return event.start_date && event.start_date >= today;
    });
    
    // Write upcoming.json
    await fs.writeFile(
      path.join(publicDir, 'upcoming.json'),
      JSON.stringify(upcomingEvents, null, 2),
      'utf-8'
    );
    console.log(`✅ Generated upcoming.json (${upcomingEvents.length} upcoming events)`);
    
    // Group upcoming events by district
    const upcomingByDistrict = {};
    upcomingEvents.forEach(event => {
      const districtCode = event.district_code;
      if (districtCode !== null && districtCode !== undefined) {
        if (!upcomingByDistrict[districtCode]) {
          upcomingByDistrict[districtCode] = [];
        }
        upcomingByDistrict[districtCode].push(event);
      }
    });
    
    // Sort events within each district by start_date
    Object.values(upcomingByDistrict).forEach(districtEvents => {
      districtEvents.sort((a, b) => {
        if (!a.start_date && !b.start_date) return 0;
        if (!a.start_date) return 1;
        if (!b.start_date) return -1;
        return a.start_date.localeCompare(b.start_date);
      });
    });
    
    // Write upcoming-by-district.json
    await fs.writeFile(
      path.join(publicDir, 'upcoming-by-district.json'),
      JSON.stringify(upcomingByDistrict, null, 2),
      'utf-8'
    );
    console.log('✅ Generated upcoming-by-district.json');
    
    // Summary
    console.log('\n📊 Build Summary:');
    console.log(`  - Total events: ${events.length}`);
    console.log(`  - Upcoming events: ${upcomingEvents.length}`);
    console.log(`  - Districts with upcoming events: ${Object.keys(upcomingByDistrict).length}`);
    
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

// Run the build
buildEvents().catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});