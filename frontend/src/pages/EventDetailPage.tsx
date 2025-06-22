import { ArrowLeft, ExternalLink, MapPin, Calendar, Ruler, Heart } from "lucide-react"
import { Event, EventTypeDisplayNames } from "@/lib/types"
import { formatDateRange, formatDistance, cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { EventLocationMap } from "@/components/EventLocationMap"

interface EventDetailPageProps {
  event: Event
  isSaved: boolean
  onToggleSave: (eventId: number) => void
  onBack: () => void
}

export function EventDetailPage({ event, isSaved, onToggleSave, onBack }: EventDetailPageProps) {
  const hasRegistrationLink = Boolean(event.event_page)
  const eventDate = formatDateRange(event.event_start_date, event.event_end_date)
  const distances = event.event_distances.map(formatDistance).join(", ")
  const location = event.event_locality || event.event_location || "Localização não disponível"
  const eventTypes = event.event_types.map(type => EventTypeDisplayNames[type] || type).join(", ")
  
  const handleSaveClick = () => {
    onToggleSave(event.event_id)
  }

  const handleRegistrationClick = () => {
    if (hasRegistrationLink) {
      window.open(event.event_page!, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold flex-1">{event.event_name}</h1>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleSaveClick}
        >
          <Heart 
            className={cn(
              "h-5 w-5",
              isSaved ? "fill-red-500 text-red-500" : "text-muted-foreground"
            )}
          />
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Main content */}
        <div className="md:col-span-2 space-y-6">
          {/* Event image */}
          {event.event_images.length > 0 && (
            <Card>
              <CardContent className="p-0">
                <img
                  src={`/${event.event_images[0]}`}
                  alt={event.event_name}
                  className="w-full h-64 object-cover rounded-lg"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
              </CardContent>
            </Card>
          )}

          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle>Descrição</CardTitle>
            </CardHeader>
            <CardContent>
              {event.description_short && (
                <p className="text-lg font-medium text-muted-foreground mb-4">
                  {event.description_short}
                </p>
              )}
              
              {event.event_description ? (
                <div 
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: event.event_description }}
                />
              ) : (
                <p className="text-muted-foreground italic">
                  Descrição não disponível
                </p>
              )}
            </CardContent>
          </Card>

          {/* Location Map */}
          <EventLocationMap
            coordinates={event.event_coordinates}
            eventName={event.event_name}
            eventLocation={location}
            eventPage={event.event_page}
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Event details */}
          <Card>
            <CardHeader>
              <CardTitle>Detalhes do Evento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">Data</p>
                  <p className="text-sm text-muted-foreground">{eventDate}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">Localização</p>
                  <p className="text-sm text-muted-foreground">{location}</p>
                  {event.event_coordinates && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {event.event_coordinates.lat.toFixed(6)}, {event.event_coordinates.lon.toFixed(6)}
                    </p>
                  )}
                </div>
              </div>

              {distances && (
                <div className="flex items-start gap-3">
                  <Ruler className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">Distâncias</p>
                    <p className="text-sm text-muted-foreground">{distances}</p>
                  </div>
                </div>
              )}

              {eventTypes && (
                <div>
                  <p className="font-medium mb-1">Tipos de Evento</p>
                  <p className="text-sm text-muted-foreground">{eventTypes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Registration */}
          <Card>
            <CardHeader>
              <CardTitle>Inscrição</CardTitle>
            </CardHeader>
            <CardContent>
              <Button 
                className="w-full"
                variant={hasRegistrationLink ? "default" : "secondary"}
                disabled={!hasRegistrationLink}
                onClick={handleRegistrationClick}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                {hasRegistrationLink ? "Inscrever-se" : "Não disponível"}
              </Button>
              
              {!hasRegistrationLink && (
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Página de inscrição não disponível
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}