import { useState, useEffect } from "react"
import { Event, EventsArraySchema } from "@/lib/types"

export function useUpcomingEvents() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadUpcomingEvents = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const response = await fetch('/upcoming.json')
        if (!response.ok) {
          throw new Error(`Failed to fetch upcoming events: ${response.statusText}`)
        }
        
        const data = await response.json()
        const validatedEvents = EventsArraySchema.parse(data)
        
        setEvents(validatedEvents)
      } catch (err) {
        console.error("Error loading upcoming events:", err)
        setError(err instanceof Error ? err.message : "Failed to load upcoming events")
      } finally {
        setLoading(false)
      }
    }

    loadUpcomingEvents()
  }, [])

  return { events, loading, error }
}