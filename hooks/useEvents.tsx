import { Event, EventsArraySchema } from "@/lib/types"
import { useDataFetcher, createDataCache } from "./useDataFetcher"

// Module-level cache for events
const eventsCache = createDataCache<Event[]>()
const buildTimestamp = process.env.NEXT_PUBLIC_BUILD_TIMESTAMP
const eventsUrl = buildTimestamp
  ? `/events.json?v=${encodeURIComponent(buildTimestamp)}`
  : '/events.json'

export function useEvents() {
  const { data, loading, error } = useDataFetcher(
    eventsUrl,
    (data) => EventsArraySchema.parse(data),
    eventsCache
  )

  return { 
    events: data || [], 
    loading, 
    error 
  }
}
