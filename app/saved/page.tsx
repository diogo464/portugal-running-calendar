"use client"

import { useRouter } from "next/navigation"
import { SavedEventsPage } from "@/components/SavedEventsPage"
import { useEvents } from "@/hooks/useEvents"
import { useSavedEvents } from "@/hooks/useSavedEvents"
import { PageLayout } from "@/components/PageLayout"

export default function Saved() {
  const router = useRouter()
  const { events } = useEvents()
  const { savedEventIds, toggleSave, clearAll, getSavedEvents } = useSavedEvents()

  const handleBack = () => {
    router.push('/')
  }

  return (
    <PageLayout savedEventIds={savedEventIds}>
      <SavedEventsPage
        savedEvents={getSavedEvents(events)}
        savedEventIds={savedEventIds}
        onToggleSave={toggleSave}
        onBack={handleBack}
        onClearAll={clearAll}
      />
    </PageLayout>
  )
}
