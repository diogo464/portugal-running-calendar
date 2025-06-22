"use client"

import { useRouter } from "next/navigation"
import { SavedEventsPage } from "@/pages/SavedEventsPage"
import { useEvents } from "@/hooks/useEvents"
import { useSavedEvents } from "@/hooks/useSavedEvents"

export default function Saved() {
  const router = useRouter()
  const { events } = useEvents()
  const { savedEventIds, toggleSave, clearAll, getSavedEvents } = useSavedEvents()

  const handleBack = () => {
    router.push('/')
  }

  return (
    <SavedEventsPage
      savedEvents={getSavedEvents(events)}
      savedEventIds={savedEventIds}
      onToggleSave={toggleSave}
      onBack={handleBack}
      onClearAll={clearAll}
    />
  )
}