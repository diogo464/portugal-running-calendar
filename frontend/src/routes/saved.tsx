import { createFileRoute, useRouter } from '@tanstack/react-router'
import { SavedEventsPage } from '@/pages/SavedEventsPage'
import { useEvents } from '@/hooks/useEvents'
import { useSavedEvents } from '@/hooks/useSavedEvents'

export const Route = createFileRoute('/saved')({
  component: Saved,
})

function Saved() {
  const router = useRouter()
  const { events } = useEvents()
  const { savedEventIds, toggleSave, clearAll, getSavedEvents } = useSavedEvents()

  const handleBack = () => {
    router.navigate({ to: '/' })
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