import { useState, useEffect } from "react"
import { Event, EventsArraySchema } from "@/lib/types"

// Module-level cache for session persistence
let eventsCache: Event[] | null = null
let cachePromise: Promise<Event[]> | null = null

export function useEvents() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadEvents = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // Return cached events if available
        if (eventsCache) {
          setEvents(eventsCache)
          setLoading(false)
          return
        }
        
        // Return ongoing promise if fetch is already in progress
        if (cachePromise) {
          const cachedEvents = await cachePromise
          setEvents(cachedEvents)
          setLoading(false)
          return
        }
        
        // Create new fetch promise
        cachePromise = (async () => {
          const response = await fetch('/events.json')
          if (!response.ok) {
            throw new Error(`Failed to fetch events: ${response.statusText}`)
          }
          
          const data = await response.json()
          const validatedEvents = EventsArraySchema.parse(data)
          
          // Cache successful result
          eventsCache = validatedEvents
          return validatedEvents
        })()
        
        const validatedEvents = await cachePromise
        setEvents(validatedEvents)
      } catch (err) {
        console.error("Error loading events:", err)
        setError(err instanceof Error ? err.message : "Failed to load events")
        
        // Clear cache and promise on error to allow retries
        eventsCache = null
        cachePromise = null
      } finally {
        setLoading(false)
      }
    }

    loadEvents()
  }, [])

  return { events, loading, error }
}
