import { useState, useEffect } from "react"
import { Event } from "@/lib/types"

const SAVED_EVENTS_KEY = "portugal-running-saved-events"

export function useSavedEvents() {
  const [savedEventIds, setSavedEventIds] = useState<Set<number>>(new Set())

  // Load saved events from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SAVED_EVENTS_KEY)
      if (saved) {
        const ids = JSON.parse(saved) as number[]
        setSavedEventIds(new Set(ids))
      }
    } catch (error) {
      console.error("Error loading saved events:", error)
    }
  }, [])

  // Save to localStorage whenever savedEventIds changes
  useEffect(() => {
    try {
      localStorage.setItem(SAVED_EVENTS_KEY, JSON.stringify([...savedEventIds]))
    } catch (error) {
      console.error("Error saving events:", error)
    }
  }, [savedEventIds])

  const toggleSave = (eventId: number) => {
    setSavedEventIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(eventId)) {
        newSet.delete(eventId)
      } else {
        newSet.add(eventId)
      }
      return newSet
    })
  }

  const clearAll = () => {
    setSavedEventIds(new Set())
  }

  const getSavedEvents = (allEvents: Event[]): Event[] => {
    return allEvents.filter(event => savedEventIds.has(event.id))
  }

  return {
    savedEventIds,
    toggleSave,
    clearAll,
    getSavedEvents
  }
}