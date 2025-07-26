import { Event, EventsArraySchema } from "@/lib/types"
import { useDataFetcher, createDataCache } from "./useDataFetcher"

// Module-level cache for events
const eventsCache = createDataCache<Event[]>()

export function useEvents() {
  const { data, loading, error } = useDataFetcher(
    '/events.json',
    (data) => EventsArraySchema.parse(data),
    eventsCache
  )

  return { 
    events: data || [], 
    loading, 
    error 
  }
}
