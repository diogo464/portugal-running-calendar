import { ArrowLeft, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { Event } from "@/lib/types"
import { EventCard } from "@/components/EventCard"
import { getEventUrl } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

interface SavedEventsPageProps {
  savedEvents: Event[]
  savedEventIds: Set<number>
  onToggleSave: (eventId: number) => void
  onBack: () => void
  onClearAll: () => void
}

export function SavedEventsPage({
  savedEvents,
  savedEventIds,
  onToggleSave,
  onBack,
  onClearAll
}: SavedEventsPageProps) {
  const router = useRouter()

  const handleEventClick = (event: Event) => {
    router.push(getEventUrl(event))
  }
  
  const handleClearAll = () => {
    if (window.confirm('Tem a certeza que pretende remover todos os eventos guardados?')) {
      onClearAll()
    }
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Eventos Guardados</h1>
            <p className="text-muted-foreground">
              {savedEvents.length} {savedEvents.length === 1 ? 'evento guardado' : 'eventos guardados'}
            </p>
          </div>
        </div>
        
        {savedEvents.length > 0 && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleClearAll}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Limpar Tudo
          </Button>
        )}
      </div>

      {/* Content */}
      {savedEvents.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-center">
              <h3 className="text-lg font-medium mb-2">Nenhum evento guardado</h3>
              <p className="text-muted-foreground mb-4">
                Comece a guardar eventos interessantes clicando no ícone do coração
              </p>
              <Button onClick={onBack}>
                Explorar Eventos
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {savedEvents.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              isSaved={savedEventIds.has(event.id)}
              onToggleSave={onToggleSave}
              onEventClick={handleEventClick}
            />
          ))}
        </div>
      )}
    </div>
  )
}