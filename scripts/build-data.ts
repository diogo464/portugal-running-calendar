import { writeFile, mkdir, readFile, readdir, access, constants } from 'fs/promises'
import { join } from 'path'
import { createHash } from 'crypto'
import { exec } from 'child_process'
import { promisify } from 'util'
import assert from 'assert'
import { CoordinatesSchema, Event, EventCategoryFromString, EventCircuitFromString, EventSchema } from '../lib/types'
import { getAllDistricts } from '../lib/server-utils'

const execAsync = promisify(exec)

function getPortugalRunningDataDir(): string {
  return join(process.cwd(), "portugal-running-data");
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function readLines(path: string): Promise<string[]> {
  const content = await readFile(path, 'utf-8');
  return content
    .trim()
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0);
}

async function processImage(imagePath: string, outputDir: string): Promise<string | null> {
  if (!await fileExists(imagePath)) {
    return null;
  }

  // Read the image file to generate MD5 hash
  const imageBuffer = await readFile(imagePath);
  const hash = createHash('md5').update(imageBuffer).digest('hex');
  const outputPath = join(outputDir, `${hash}.webp`);

  // Check if we already processed this image
  if (await fileExists(outputPath)) {
    return `/image/${hash}.webp`;
  }

  // Convert image to WebP using ImageMagick
  const convertCmd = `convert "${imagePath}" "${outputPath}"`;

  try {
    await execAsync(convertCmd);
    console.log(`  ✓ Converted image: ${hash}.webp`);
    return `/image/${hash}.webp`;
  } catch (error) {
    throw new Error(`Failed to convert image ${imagePath}: ${error}`);
  }
}

async function processAllEvents(): Promise<Event[]> {
  const eventsDir = join(getPortugalRunningDataDir(), "events");
  const eventDirs = await readdir(eventsDir);

  // Ensure image output directory exists
  const imageOutputDir = join(process.cwd(), 'public/image');
  await mkdir(imageOutputDir, { recursive: true });

  const events: Event[] = []
  
  for (const eventDirName of eventDirs) {
    const eventDir = join(eventsDir, eventDirName);
    console.log(`Processing event: ${eventDirName}`);

    // required files
    const categoriesPath = join(eventDir, 'categories');
    const circuitsPath = join(eventDir, 'circuits');
    const dataPath = join(eventDir, 'data.json');
    const datePath = join(eventDir, 'date');
    const idPath = join(eventDir, 'id');
    const lastmodPath = join(eventDir, 'lastmod');
    const slugPath = join(eventDir, 'slug');
    const titlePath = join(eventDir, 'title');

    // optional files
    const imagePath = join(eventDir, 'image');
    const onelineDescPath = join(eventDir, 'oneline-description');
    const locationPath = join(eventDir, 'location');
    const eventUrlPath = join(eventDir, 'event-url');

    // Assert required files exist
    assert(await fileExists(categoriesPath), `missing categories file for ${eventDirName}`);
    assert(await fileExists(circuitsPath), `missing circuits file for ${eventDirName}`);
    assert(await fileExists(dataPath), `missing data file for ${eventDirName}`);
    assert(await fileExists(datePath), `missing date file for ${eventDirName}`);
    assert(await fileExists(idPath), `missing id file for ${eventDirName}`);
    assert(await fileExists(lastmodPath), `missing lastmod file for ${eventDirName}`);
    assert(await fileExists(slugPath), `missing slug file for ${eventDirName}`);
    assert(await fileExists(titlePath), `missing title file for ${eventDirName}`);

    // Read all files in parallel
    const [
      categoriesLines,
      circuitsLines,
      dataContent,
      dateContent,
      idContent,
      lastmodContent,
      slugContent,
      titleContent,
      locationContent,
      descriptionShortContent,
      imageUrl,
      eventUrl,
    ] = await Promise.all([
      readLines(categoriesPath),
      readLines(circuitsPath),
      readFile(dataPath, 'utf-8'),
      readFile(datePath, 'utf-8'),
      readFile(idPath, 'utf-8'),
      readFile(lastmodPath, 'utf-8'),
      readFile(slugPath, 'utf-8'),
      readFile(titlePath, 'utf-8'),
      fileExists(locationPath).then(exists => exists ? readFile(locationPath, 'utf-8') : null),
      fileExists(onelineDescPath).then(exists => exists ? readFile(onelineDescPath, 'utf-8') : ""),
      processImage(imagePath, imageOutputDir),
      fileExists(eventUrlPath).then(exists => exists ? readFile(eventUrlPath, 'utf-8') : null),
    ]);

    // Parse data
    const categories = categoriesLines.map(c => EventCategoryFromString(c));
    const circuits = circuitsLines.map(c => EventCircuitFromString(c));
    const data = JSON.parse(dataContent);
    const date = new Date(dateContent);
    const id = parseInt(idContent);
    const lastmod = new Date(lastmodContent);
    const slug = slugContent;
    const title = titleContent;

    const images: string[] = [];
    if (imageUrl) {
      images.push(imageUrl);
    }

    let location = null;
    if (locationContent) {
      location = JSON.parse(locationContent);
    }

    const event = EventSchema.parse({
      id: id,
      slug: slug,
      name: title,
      location: (location && location['name']),
      coordinates: location?.coordinates ? CoordinatesSchema.parse({
        lat: location.coordinates.lat,
        lon: location.coordinates.lon,
      }) : null,
      country: (location && location['country']),
      locality: (location && location['locality']),
      categories: categories,
      images: images,
      date: date.toISOString().split('T')[0],
      lastmod: lastmod.toISOString(),
      circuits: circuits,
      description: data['content']['rendered'],
      description_short: descriptionShortContent,
      district_code: (location && location['district_code']),
      page: eventUrl,
    });
    
    events.push(event)
  }

  // Sort events by date, earliest first
  events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return events;
}

async function buildData() {
  console.log('Building static data files...')

  // Ensure output directories exist
  await mkdir(join(process.cwd(), 'public'), { recursive: true })
  await mkdir(join(process.cwd(), 'public/events'), { recursive: true })

  // Process all events
  console.log('Processing events...')
  const allEvents = await processAllEvents()

  // Deduplicate events by ID, keeping the one with the most recent lastmod
  console.log('Deduplicating events by ID...')
  const eventMap = new Map<number, Event>()
  let duplicatesFound = 0

  for (const event of allEvents) {
    const existing = eventMap.get(event.id)
    if (existing) {
      duplicatesFound++
      
      // Check if both slugs end with a 4-digit year
      const eventYearMatch = event.slug.match(/-(\d{4})$/)
      const existingYearMatch = existing.slug.match(/-(\d{4})$/)
      
      let shouldKeepEvent = false
      let reason = ''
      
      if (eventYearMatch && existingYearMatch) {
        // Both have years, compare them
        const eventYear = parseInt(eventYearMatch[1])
        const existingYear = parseInt(existingYearMatch[1])
        shouldKeepEvent = eventYear > existingYear
        reason = shouldKeepEvent 
          ? `year ${eventYear} > ${existingYear}` 
          : `year ${existingYear} >= ${eventYear}`
      } else {
        // Use lastmod comparison
        shouldKeepEvent = event.lastmod > existing.lastmod
        reason = shouldKeepEvent 
          ? `lastmod ${event.lastmod} > ${existing.lastmod}` 
          : `lastmod ${existing.lastmod} >= ${event.lastmod}`
      }
      
      if (shouldKeepEvent) {
        console.log(`  ⚠ Duplicate ID ${event.id}: keeping "${event.slug}" over "${existing.slug}" (${reason})`)
        eventMap.set(event.id, event)
      } else {
        console.log(`  ⚠ Duplicate ID ${event.id}: keeping "${existing.slug}" over "${event.slug}" (${reason})`)
      }
    } else {
      eventMap.set(event.id, event)
    }
  }

  const events = Array.from(eventMap.values())
  
  if (duplicatesFound > 0) {
    console.log(`✓ Removed ${duplicatesFound} duplicate events, ${events.length} events remaining`)
  }

  // Write individual event files
  console.log('Writing individual event files...')
  await Promise.all(events.map(async (event) => {
    const eventFilePath = join(process.cwd(), 'public/events', `${event.id}.json`)
    await writeFile(eventFilePath, JSON.stringify(event, null, 2))
  }))

  // Write summary events file
  await writeFile(
    join(process.cwd(), 'public/events.json'),
    JSON.stringify(events, null, 2)
  )

  console.log(`✓ Generated ${events.length} events`)
  console.log(`✓ Created individual event files in public/events/`)
  console.log(`✓ Created summary events.json`)

  // Verify districts data
  console.log('Verifying districts...')
  const districts = await getAllDistricts()
  console.log(`✓ Verified districts.json with ${districts.length} districts`)

  console.log('Static data generation complete!')
}

if (require.main === module) {
  buildData().catch((error) => {
    console.error('Error building data:', error)
    process.exit(1)
  })
}

export { buildData }
