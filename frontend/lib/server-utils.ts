import { Event, EventsArraySchema } from './types'
import { getCloudflareContext } from '@opennextjs/cloudflare'

/**
 * Server-side utility to read all events from the events.json file
 */
export async function getAllEvents(): Promise<Event[]> {
  const { env } = await getCloudflareContext({ async: true });
  const object = await env.NEXT_R2.get("events.json");
  if (!object) throw new Error("failed to obtain events.json from r2");
  const data = await object.json();
  return EventsArraySchema.parse(data);
}

/**
 * Server-side utility to read a single event by ID
 */
export async function getEventById(eventId: number): Promise<Event | null> {
  const events = await getAllEvents();
  const event = events.find(e => e.id == eventId);
  if (!event) return null;
  return event;
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
  const { env } = await getCloudflareContext({ async: true });
  const object = await env.NEXT_R2.get("upcoming.json");
  if (!object) throw new Error("failed to obtain events.json from r2");
  const data = await object.json();
  return EventsArraySchema.parse(data);
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
