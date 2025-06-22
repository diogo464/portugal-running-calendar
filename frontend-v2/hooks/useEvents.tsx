import { useState, useEffect } from "react"
import { Event, EventsArraySchema } from "@/lib/types"

export function useEvents() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadEvents = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const response = await fetch('/events.json')
        if (!response.ok) {
          throw new Error(`Failed to fetch events: ${response.statusText}`)
        }
        
        const data = await response.json()
        const validatedEvents = EventsArraySchema.parse(data)
        
        setEvents(validatedEvents)
      } catch (err) {
        console.error("Error loading events:", err)
        setError(err instanceof Error ? err.message : "Failed to load events")
      } finally {
        setLoading(false)
      }
    }

    loadEvents()
  }, [])

  return { events, loading, error }
}