"use client"

import { useRouter } from "next/navigation"
import { useSavedEvents } from "@/hooks/useSavedEvents"
import { EventDetailPage } from "@/components/EventDetailPage"
import { Event } from "@/lib/types"

interface EventDetailClientProps {
  event: Event
}

export function EventDetailClient({ event }: EventDetailClientProps) {
  const router = useRouter()
  const { savedEventIds, toggleSave } = useSavedEvents()

  const handleBack = () => {
    router.back()
  }

  return (
    <EventDetailPage
      event={event}
      isSaved={savedEventIds.has(event.id)}
      onToggleSave={toggleSave}
      onBack={handleBack}
    />
  )
}