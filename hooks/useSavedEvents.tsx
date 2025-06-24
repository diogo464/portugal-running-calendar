import { useState, useEffect } from "react"
import { Event } from "@/lib/types"

const SAVED_EVENTS_KEY = "portugal-running-saved-events"

export function useSavedEvents() {
  const [savedEventIds, setSavedEventIdsState] = useState<Set<number>>(new Set())
  const setSavedEventIds = (f: (p: Set<number>) => Set<number>) => {
    setSavedEventIdsState(prev => {
      const ids = f(prev);
      try {
        console.log(`setting saved events to ${[...savedEventIds]}`)
        localStorage.setItem(SAVED_EVENTS_KEY, JSON.stringify([...ids]))
      } catch (error) {
        console.error("Error saving events:", error)
      }
      return ids;
    });
  };

  // Load saved events from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SAVED_EVENTS_KEY)
      if (saved) {
        const ids = JSON.parse(saved) as number[]
        console.log(`load saved events to ${[...ids]}`)
        setSavedEventIds(() => new Set(ids))
      }
    } catch (error) {
      console.error("Error loading saved events:", error)
    }
  }, [])

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
    console.log(`clearing saved events`)
    setSavedEventIds(() => new Set())
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
