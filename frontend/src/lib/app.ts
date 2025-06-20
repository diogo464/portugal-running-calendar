import { z } from 'zod/v4'

// Native TypeScript enum for event types
export enum EventType {
  Marathon = "marathon",
  HalfMarathon = "half-marathon",
  FifteenK = "15k",
  TenK = "10k",
  FiveK = "5k",
  Milha = "Milha",
  Run = "run",
  Trail = "trail",
  Walk = "walk",
  CrossCountry = "cross-country",
  SaintSilvester = "saint-silvester",
  Kids = "kids",
  Relay = "relay"
}

// Zod v4 schema for event type enum - use z.enum() directly with native enum
export const EventTypeSchema = z.nativeEnum(EventType)

// Coordinates schema for lat/lon coordinates
const Coordinates = z.object({
  lat: z.number(),
  lon: z.number()
})

// Event schema matching the data structure from portugal-running-cli.py
export const Event = z.object({
  event_id: z.number(),
  event_name: z.string().min(1, "Event name is required"),
  event_location: z.string(),
  event_coordinates: Coordinates.nullable(),
  event_country: z.string(),
  event_locality: z.string(),
  event_distances: z.array(z.number().positive("Distance must be positive")),
  event_types: z.array(z.string()), // Use string array to match actual JSON output
  event_images: z.array(z.string()),
  event_start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD format"),
  event_end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD format"),
  event_circuit: z.array(z.any()), // Array of any to match current empty arrays
  event_description: z.string(),
  description_short: z.string().nullable(),
  event_page: z.string().nullable() // Add missing event_page field
})

// Array of events schema
export const EventsArray = z.array(Event)

// Inferred TypeScript types
export type Event = z.infer<typeof Event>
export type EventsArray = z.infer<typeof EventsArray>

// Get all event types as an iterable array
export const getAllEventTypes = (): EventType[] => {
  return Object.values(EventType)
}

// Display name mappings for event types
const eventTypeDisplayNames: Record<EventType, string> = {
  [EventType.Marathon]: "Marathon",
  [EventType.HalfMarathon]: "Half Marathon",
  [EventType.FifteenK]: "15K",
  [EventType.TenK]: "10K",
  [EventType.FiveK]: "5K",
  [EventType.Milha]: "Milha",
  [EventType.Run]: "Run",
  [EventType.Trail]: "Trail",
  [EventType.Walk]: "Walk",
  [EventType.CrossCountry]: "Cross Country",
  [EventType.SaintSilvester]: "São Silvestre",
  [EventType.Kids]: "Kids",
  [EventType.Relay]: "Relay"
}

// Mapping from string event types (from JSON) to TypeScript enum
export const stringToEventType: Record<string, EventType> = {
  "marathon": EventType.Marathon,
  "half-marathon": EventType.HalfMarathon,
  "15k": EventType.FifteenK,
  "10k": EventType.TenK,
  "5k": EventType.FiveK,
  "Milha": EventType.Milha,
  "run": EventType.Run,
  "trail": EventType.Trail,
  "walk": EventType.Walk,
  "cross-country": EventType.CrossCountry,
  "saint-silvester": EventType.SaintSilvester,
  "kids": EventType.Kids,
  "relay": EventType.Relay
}

// Get display name for an event type
export const getEventTypeDisplayName = (eventType: EventType): string => {
  return eventTypeDisplayNames[eventType] || eventType
}

// Get display name for a string event type (from JSON)
export const getStringEventTypeDisplayName = (eventType: string): string => {
  const enumType = stringToEventType[eventType]
  return enumType ? getEventTypeDisplayName(enumType) : eventType
}

// Get all event types with their display names for UI components
export const getEventTypesWithDisplayNames = (): Array<{ value: EventType; label: string }> => {
  return getAllEventTypes().map(type => ({
    value: type,
    label: getEventTypeDisplayName(type)
  }))
}

// Convert string event types array to enum array
export const convertStringEventTypesToEnum = (eventTypes: string[]): EventType[] => {
  return eventTypes
    .map(type => stringToEventType[type])
    .filter((type): type is EventType => type !== undefined)
}

// Utility function to validate event data
export function validateEvent(data: unknown): Event {
  return Event.parse(data)
}

// Utility function to validate array of events
export function validateEvents(data: unknown): Event[] {
  return EventsArray.parse(data)
}