import { createFileRoute, useRouter } from '@tanstack/react-router'
import { EventDetailPage } from '@/pages/EventDetailPage'
import { useEvents } from '@/hooks/useEvents'
import { useSavedEvents } from '@/hooks/useSavedEvents'

export const Route = createFileRoute('/event/$eventId/$eventSlug')({
  component: EventDetail,
})

function EventDetail() {
  const { eventId } = Route.useParams()
  const router = useRouter()
  const { events } = useEvents()
  const { savedEventIds, toggleSave } = useSavedEvents()
  
  const eventIdNumber = parseInt(eventId, 10)
  const event = events.find(e => e.event_id === eventIdNumber)

  const handleBack = () => {
    router.history.back()
  }

  if (!event) {
    // Event not found - we'll create a proper component for this later
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Evento não encontrado</h1>
          <p className="text-muted-foreground">O evento solicitado não existe ou foi removido.</p>
          <button 
            onClick={handleBack}
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Voltar
          </button>
        </div>
      </div>
    )
  }

  return (
    <EventDetailPage
      event={event}
      isSaved={savedEventIds.has(event.event_id)}
      onToggleSave={toggleSave}
      onBack={handleBack}
    />
  )
}