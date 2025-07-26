import { useMemo } from 'react'
import { parseISO } from 'date-fns'
import { useEvents } from './useEvents'

export function useUpcomingEvents() {
  const { events, loading, error } = useEvents()

  const upcomingEvents = useMemo(() => {
    if (!events || events.length === 0) return []
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    return events.filter(event => {
      if (!event.date) return false
      const eventDate = parseISO(event.date)
      return eventDate >= today
    })
  }, [events])

  return {
    events: upcomingEvents,
    loading,
    error
  }
}