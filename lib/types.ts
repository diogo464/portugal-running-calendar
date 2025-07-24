import { z } from 'zod/v4'

function invertRecord<K extends string, V extends string>(
  obj: Record<K, V>
): Record<V, K> {
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [v, k])
  ) as Record<V, K>;
}

export enum EventCategory {
  Run = "run",
  Walk = "walk",
  Trail = "trail",
  Kids = "kids",
  SaintSilvester = "saint-silvester",
  D10K = "10k",
  D15K = "15k",
  HalfMarathon = "half-marathon",
  Marathon = "marathon",
}

export const EventCategories: Array<EventCategory> = Object.values(EventCategory);

export const EventCategoryDisplayName: Record<EventCategory, string> = {
  [EventCategory.Run]: "Corrida",
  [EventCategory.Walk]: "Caminhada",
  [EventCategory.Trail]: "Trail",
  [EventCategory.Kids]: "Kids",
  [EventCategory.SaintSilvester]: "São Silvestre",
  [EventCategory.D10K]: "10K",
  [EventCategory.D15K]: "Entre 10K e 21K",
  [EventCategory.HalfMarathon]: "Meia Maratona",
  [EventCategory.Marathon]: "Maratona",
}

export const EventCategoryDisplayNameLookup = invertRecord(EventCategoryDisplayName);

export function EventCategoryFromString(value: string): EventCategory {
  return z.enum(EventCategory).parse(value)
}

export function EventCategoryToDisplayName(category: EventCategory): string {
  return EventCategoryDisplayName[category]
}

export function EventCategoryFromDisplayName(name: string): EventCategory {
  return EventCategoryDisplayNameLookup[name]
}

export enum EventCircuit {
  ATRP = "atrp",
  Majors = "majors",
  RiosTrailTrophy = "rios-trail-trophy",
  SuperHalfs = "super-halfs",
  EstrelasDePortugal = "estrelas-de-portugal",
  TrofeuAtletismoAlmada = "trofeu-atletismo-almada",
  TrofeuAlmada = "trofeu-almada",
  AtletismoBarreiro = "atletismo-barreiro",
  MadeiraTrail = "circuit-madeira-trail",
  QuatroEstacoes = "quatro-estacoes",
}

export const EventCircuits: Array<EventCircuit> = Object.values(EventCircuit);

export const EventCircuitDisplayName: Record<EventCircuit, string> = {
  [EventCircuit.ATRP]: "ATRP",
  [EventCircuit.Majors]: "Majors",
  [EventCircuit.RiosTrailTrophy]: "Rios Trail Trophy",
  [EventCircuit.SuperHalfs]: "Super Halfs",
  [EventCircuit.EstrelasDePortugal]: "Estrelas de Portugal",
  [EventCircuit.TrofeuAtletismoAlmada]: "Troféu Atletismo Almada",
  [EventCircuit.TrofeuAlmada]: "Troféu Almada",
  [EventCircuit.AtletismoBarreiro]: "Atletismo Barreiro",
  [EventCircuit.MadeiraTrail]: "Circuit Madeira Trail",
  [EventCircuit.QuatroEstacoes]: "4 Estações",
}

export const EventCircuitDisplayNameLookup = invertRecord(EventCircuitDisplayName);

export function EventCircuitFromString(value: string): EventCircuit {
  return z.enum(EventCircuit).parse(value)
}

export function EventCircuitToDisplayName(circuit: EventCircuit): string {
  return EventCircuitDisplayName[circuit]
}

export function EventCircuitFromDisplayName(name: string): EventCircuit {
  return EventCircuitDisplayNameLookup[name]
}

// Coordinates schema for lat/lon coordinates
export const CoordinatesSchema = z.object({
  lat: z.number(),
  lon: z.number()
})

// Event schema matching the actual JSON structure
export const EventSchema = z.object({
  id: z.number(),
  slug: z.string(),
  name: z.string().min(1, "Event name is required"),
  location: z.string().nullable(),
  coordinates: CoordinatesSchema.nullable(),
  country: z.string().nullable(),
  locality: z.string().nullable(),
  categories: z.array(z.enum(EventCategory)),
  images: z.array(z.string()),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD format"),
  lastmod: z.string(), // TODO: parse as date
  circuits: z.array(z.enum(EventCircuit)), // Array of any to match current empty arrays
  description: z.string(),
  description_short: z.string().nullable(),
  page: z.string().nullable(),
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
  eventCategories: EventCategory[]
  dateRange: 'anytime' | 'next_week' | 'next_month' | 'next_3_months' | 'next_6_months'
  proximityRange: [number, number | null]
  proximityCenter: Coordinates | null
  showEventsWithoutLocation: boolean
  selectedDates?: Set<string> // Optional calendar date selection (YYYY-MM-DD format)
}

export interface PaginationState {
  currentPage: number
  itemsPerPage: number
  totalItems: number
}

// Calendar-specific types
export interface EventDensity {
  date: Date
  eventCount: number
  isWeekend: boolean
  isHoliday: boolean
  holidayName?: string
  events: Event[] // Actual events for this date
}

export interface CalendarFilters extends EventFilters {
  selectedDates: Set<string> // Required for calendar view
}
