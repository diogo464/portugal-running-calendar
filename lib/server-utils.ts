import { readFile } from 'fs/promises'
import { join } from 'path'
import { Event } from './types'
import { District, validateDistrictsFile } from './district-types'
import { getSiteName } from './site-config'

let DISTRICTS: District[] = [];

/**
 * Server-side utility to read all events from the static events.json file
 */
export async function getAllEvents(): Promise<Event[]> {
  const eventsPath = join(process.cwd(), 'public/events.json');
  const eventsData = await readFile(eventsPath, 'utf-8');
  return JSON.parse(eventsData) as Event[];
}

/**
 * Server-side utility to read a single event by ID from individual JSON file
 */
export async function getEventById(eventId: number): Promise<Event | null> {
  const eventPath = join(process.cwd(), 'public/events', `${eventId}.json`);
  
  try {
    const eventData = await readFile(eventPath, 'utf-8');
    return JSON.parse(eventData) as Event;
  } catch {
    return null;
  }
}

/**
 * Server-side utility to get upcoming events (events with future dates)
 */
export async function getUpcomingEvents(): Promise<Event[]> {
  const now = new Date();
  const events = await getAllEvents();
  return events.filter(e => new Date(e.date) > now);
}

/**
 * Generate event URLs for sitemap
 */
export async function getAllEventUrls(): Promise<Array<{ id: number; slug: string; lastModified?: Date }>> {
  const events = await getAllEvents()

  return events.map(event => ({
    id: event.id,
    slug: event.slug || createSlugFromName(event.name),
    // We don't have lastModified in our data, so we'll use current date
    lastModified: new Date()
  }))
}

/**
 * Create URL slug from event name
 */
export function createSlugFromName(eventName: string): string {
  return eventName
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}

/**
 * Generate SEO-optimized title for event pages
 */
export function generateEventTitle(event: Event): string {
  const location = event.locality || event.location || 'Portugal'
  const siteName = getSiteName()
  return siteName ? `${event.name} - ${location} | ${siteName}` : `${event.name} - ${location}`
}

/**
 * Generate SEO-optimized description for event pages
 */
export function generateEventDescription(event: Event): string {
  if (event.description_short) {
    return event.description_short
  }

  const location = event.locality || event.location || 'Portugal'
  const dateStr = event.date ? ` em ${formatPortugueseDate(event.date)}` : ''
  const siteName = getSiteName()

  return siteName
    ? `Evento de corrida em ${location}${dateStr}. Descubra mais detalhes e inscreva-se no ${siteName}.`
    : `Evento de corrida em ${location}${dateStr}. Descubra mais detalhes sobre este evento.`
}

/**
 * Format date in Portuguese
 */
function formatPortugueseDate(dateString: string): string {
  try {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('pt-PT', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(date)
  } catch {
    return dateString
  }
}

/**
 * Server-side utility to read districts data
 */
export async function getAllDistricts(): Promise<District[]> {
  if (DISTRICTS.length !== 0) {
    return DISTRICTS;
  }

  try {
    const districtsPath = join(process.cwd(), 'public', 'districts.json');
    const rawData = await readFile(districtsPath, 'utf-8');
    const districtsData = validateDistrictsFile(JSON.parse(rawData));

    // Convert the object to an array of districts
    const districtsArray = Object.values(districtsData);
    DISTRICTS = districtsArray;

    return districtsArray;
  } catch (error) {
    console.error('Failed to load districts:', error);
    throw new Error('Failed to load districts data');
  }
}
