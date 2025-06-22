import { useState } from "react"
import { Event } from "@/lib/types"
import { ThemeProvider } from "@/hooks/useTheme"
import { useEvents } from "@/hooks/useEvents"
import { useSavedEvents } from "@/hooks/useSavedEvents"
import { MainPage } from "@/pages/MainPage"
import { EventDetailPage } from "@/pages/EventDetailPage"
import { SavedEventsPage } from "@/pages/SavedEventsPage"

function App() {
  const { events, loading, error } = useEvents()
  const { savedEventIds, toggleSave, clearAll, getSavedEvents } = useSavedEvents()
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [currentView, setCurrentView] = useState<'main' | 'detail' | 'saved'>('main')

  const handleEventClick = (event: Event) => {
    setSelectedEvent(event)
    setCurrentView('detail')
  }

  const handleBackToMain = () => {
    setSelectedEvent(null)
    setCurrentView('main')
  }

  const handleViewSaved = () => {
    setCurrentView('saved')
  }

  const handleBackFromSaved = () => {
    setCurrentView('main')
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Erro ao Carregar</h1>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <ThemeProvider defaultTheme="system" storageKey="portugal-running-theme">
      <div className="min-h-screen bg-background text-foreground">
        {currentView === 'main' && (
          <MainPage
            events={events}
            loading={loading}
            savedEventIds={savedEventIds}
            onToggleSave={toggleSave}
            onEventClick={handleEventClick}
            onViewSaved={handleViewSaved}
          />
        )}

        {currentView === 'detail' && selectedEvent && (
          <EventDetailPage
            event={selectedEvent}
            isSaved={savedEventIds.has(selectedEvent.event_id)}
            onToggleSave={toggleSave}
            onBack={handleBackToMain}
          />
        )}

        {currentView === 'saved' && (
          <SavedEventsPage
            savedEvents={getSavedEvents(events)}
            savedEventIds={savedEventIds}
            onToggleSave={toggleSave}
            onEventClick={handleEventClick}
            onBack={handleBackFromSaved}
            onClearAll={clearAll}
          />
        )}
      </div>
    </ThemeProvider>
  )
}

export default App
