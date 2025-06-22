import { createFileRoute } from '@tanstack/react-router'
import { MainPage } from '@/pages/MainPage'
import { useEvents } from '@/hooks/useEvents'
import { useSavedEvents } from '@/hooks/useSavedEvents'

export const Route = createFileRoute('/')({
  component: Index,
})

function Index() {
  const { events, loading, error } = useEvents()
  const { savedEventIds, toggleSave } = useSavedEvents()

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
    <MainPage
      events={events}
      loading={loading}
      savedEventIds={savedEventIds}
      onToggleSave={toggleSave}
    />
  )
}