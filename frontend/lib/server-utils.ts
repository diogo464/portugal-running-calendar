import { readFile } from 'fs/promises'
import { join } from 'path'
import { Event, EventsArraySchema, EventSchema } from './types'

/**
 * Server-side utility to read all events from the events.json file
 */
export async function getAllEvents(): Promise<Event[]> {
  try {
    const filePath = join(process.cwd(), 'public', 'events.json')
    const fileContent = await readFile(filePath, 'utf-8')
    const data = JSON.parse(fileContent)
    
    // Validate with Zod schema
    return EventsArraySchema.parse(data)
  } catch (error) {
    console.error('Error reading events.json:', error)
    return []
  }
}

/**
 * Server-side utility to read a single event by ID
 */
export async function getEventById(eventId: number): Promise<Event | null> {
  try {
    const filePath = join(process.cwd(), 'public', 'events', `${eventId}.json`)
    const fileContent = await readFile(filePath, 'utf-8')
    const data = JSON.parse(fileContent)
    
    // Validate with Zod schema
    return EventSchema.parse(data)
  } catch (error) {
    console.error(`Error reading event ${eventId}:`, error)
    return null
  }
}

/**
 * Get the first page of events for homepage SSR
 */
export async function getEventsForHomepage(limit: number = 12): Promise<Event[]> {
  const allEvents = await getAllEvents()
  return allEvents.slice(0, limit)
}

/**
 * Server-side utility to read upcoming events from the upcoming.json file
 */
export async function getUpcomingEvents(): Promise<Event[]> {
  try {
    const filePath = join(process.cwd(), 'public', 'upcoming.json')
    const fileContent = await readFile(filePath, 'utf-8')
    const data = JSON.parse(fileContent)
    
    // Validate with Zod schema
    return EventsArraySchema.parse(data)
  } catch (error) {
    console.error('Error reading upcoming.json:', error)
    return []
  }
}

/**
 * Get the first page of upcoming events for homepage SSR
 */
export async function getUpcomingEventsForHomepage(limit: number = 12): Promise<Event[]> {
  const upcomingEvents = await getUpcomingEvents()
  return upcomingEvents.slice(0, limit)
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
  return `${event.name} - ${location} | Portugal Running`
}

/**
 * Generate SEO-optimized description for event pages
 */
export function generateEventDescription(event: Event): string {
  if (event.description_short) {
    return event.description_short
  }
  
  const location = event.locality || event.location || 'Portugal'
  const dateStr = event.start_date ? ` em ${formatPortugueseDate(event.start_date)}` : ''
  
  return `Evento de corrida em ${location}${dateStr}. Descubra mais detalhes e inscreva-se no Portugal Running.`
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