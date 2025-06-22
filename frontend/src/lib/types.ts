import { z } from 'zod'

export enum EventType {
  Marathon = "marathon",
  HalfMarathon = "half-marathon",
  TenK = "10k",
  FifteenK = "15k",
  FiveK = "5k",
  Mile = "Milha",
  CrossCountry = "cross-country",
  Kids = "kids",
  Relay = "relay",
  Run = "run",
  SaintSilvester = "saint-silvester",
  Trail = "trail",
  Walk = "walk"
}

export const EventTypeDisplayNames: Record<EventType, string> = {
  [EventType.Marathon]: "Maratona",
  [EventType.HalfMarathon]: "Meia Maratona",
  [EventType.TenK]: "10K",
  [EventType.FifteenK]: "15K", 
  [EventType.FiveK]: "5K",
  [EventType.Mile]: "Milha",
  [EventType.CrossCountry]: "Corta-Mato",
  [EventType.Kids]: "Infantil",
  [EventType.Relay]: "Estafeta",
  [EventType.Run]: "Corrida",
  [EventType.SaintSilvester]: "São Silvestre",
  [EventType.Trail]: "Trail",
  [EventType.Walk]: "Caminhada"
}

const CoordinatesSchema = z.object({
  lat: z.number(),
  lon: z.number()
})

export const EventSchema = z.object({
  event_id: z.number(),
  event_name: z.string(),
  event_location: z.string(),
  event_coordinates: CoordinatesSchema.nullable(),
  event_country: z.string().nullable(),
  event_locality: z.string().nullable(),
  event_distances: z.array(z.number()),
  event_types: z.array(z.nativeEnum(EventType)),
  event_images: z.array(z.string()),
  event_start_date: z.string().nullable(),
  event_end_date: z.string().nullable(),
  event_circuit: z.array(z.any()),
  event_description: z.string(),
  description_short: z.string().nullable(),
  event_page: z.string().nullable()
})

export type Event = z.infer<typeof EventSchema>
export type Coordinates = z.infer<typeof CoordinatesSchema>

export interface EventFilters {
  search: string
  eventTypes: EventType[]
  distanceRange: [number, number | null]
  dateRange: 'anytime' | 'next_week' | 'next_month' | 'next_3_months' | 'next_6_months'
}

export interface PaginationState {
  currentPage: number
  itemsPerPage: number
  totalItems: number
}