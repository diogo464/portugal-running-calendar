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

// Display name mappings for event types (Portuguese)
export const EventTypeDisplayNames: Record<EventType, string> = {
  [EventType.Marathon]: "Maratona",
  [EventType.HalfMarathon]: "Meia Maratona",
  [EventType.FifteenK]: "15K",
  [EventType.TenK]: "10K",
  [EventType.FiveK]: "5K",
  [EventType.Milha]: "Milha",
  [EventType.Run]: "Corrida",
  [EventType.Trail]: "Trail",
  [EventType.Walk]: "Caminhada",
  [EventType.CrossCountry]: "Corta-Mato",
  [EventType.SaintSilvester]: "São Silvestre",
  [EventType.Kids]: "Infantil",
  [EventType.Relay]: "Estafeta"
}

// Coordinates schema for lat/lon coordinates
const CoordinatesSchema = z.object({
  lat: z.number(),
  lon: z.number()
})

// Event schema matching the actual JSON structure
export const EventSchema = z.object({
  id: z.number(),
  slug: z.string().optional(),
  name: z.string().min(1, "Event name is required"),
  location: z.string(),
  coordinates: CoordinatesSchema.nullable(),
  country: z.string().nullable(),
  locality: z.string().nullable(),
  distances: z.array(z.number().positive("Distance must be positive")),
  types: z.array(z.string()), // Use string array to match JSON format
  images: z.array(z.string()),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD format").nullable(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD format").nullable(),
  circuit: z.array(z.any()), // Array of any to match current empty arrays
  description: z.string(),
  description_short: z.string().nullable(),
  page: z.string().nullable(),
  // Additional properties from the JSON
  administrative_area_level_1: z.string().nullable().optional(),
  administrative_area_level_2: z.string().nullable().optional(),
  administrative_area_level_3: z.string().nullable().optional(),
  district_code: z.number().nullable().optional()
})

// Array of events schema
export const EventsArraySchema = z.array(EventSchema)

// Inferred TypeScript types
export type Event = z.infer<typeof EventSchema>
export type EventsArray = z.infer<typeof EventsArraySchema>
export type Coordinates = z.infer<typeof CoordinatesSchema>

// Additional types for UI functionality
export type GeolocationPermission = 'prompt' | 'granted' | 'denied'

export interface EventFilters {
  search: string
  eventTypes: EventType[]
  distanceRange: [number, number | null]
  dateRange: 'anytime' | 'next_week' | 'next_month' | 'next_3_months' | 'next_6_months'
  proximityRange: [number, number | null]
  proximityCenter: Coordinates | null
  showEventsWithoutLocation: boolean
}

export interface PaginationState {
  currentPage: number
  itemsPerPage: number
  totalItems: number
}

// Utility functions for event types
export const getAllEventTypes = (): EventType[] => {
  return Object.values(EventType)
}

// Get display name for an event type
export const getEventTypeDisplayName = (eventType: EventType): string => {
  return EventTypeDisplayNames[eventType] || eventType
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
  return EventSchema.parse(data)
}

// Utility function to validate array of events
export function validateEvents(data: unknown): Event[] {
  return EventsArraySchema.parse(data)
}