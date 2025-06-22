import { Heart, ExternalLink, MapPin, Calendar, Ruler } from "lucide-react"
import { Event } from "@/lib/types"
import { formatDateRange, formatDistance, cn } from "@/lib/utils"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface EventCardProps {
  event: Event
  isSaved: boolean
  onToggleSave: (eventId: number) => void
  onEventClick: (event: Event) => void
}

export function EventCard({ event, isSaved, onToggleSave, onEventClick }: EventCardProps) {
  const handleSaveClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onToggleSave(event.event_id)
  }

  const handleCardClick = () => {
    onEventClick(event)
  }

  const hasRegistrationLink = Boolean(event.event_page)
  const eventDate = formatDateRange(event.event_start_date, event.event_end_date)
  const distances = event.event_distances.map(formatDistance).join(", ")
  const location = event.event_locality || event.event_location || "Localização não disponível"

  return (
    <Card 
      className="cursor-pointer transition-shadow hover:shadow-md"
      onClick={handleCardClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg line-clamp-2">{event.event_name}</CardTitle>
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0"
            onClick={handleSaveClick}
          >
            <Heart 
              className={cn(
                "h-4 w-4",
                isSaved ? "fill-red-500 text-red-500" : "text-muted-foreground"
              )}
            />
          </Button>
        </div>
        
        {event.description_short && (
          <CardDescription className="line-clamp-2">
            {event.description_short}
          </CardDescription>
        )}
      </CardHeader>

      <CardContent className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>{eventDate}</span>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4" />
          <span className="line-clamp-1">{location}</span>
        </div>
        
        {distances && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Ruler className="h-4 w-4" />
            <span className="line-clamp-1">{distances}</span>
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-3">
        <Button 
          variant={hasRegistrationLink ? "default" : "secondary"}
          size="sm"
          className="w-full"
          disabled={!hasRegistrationLink}
          onClick={(e) => {
            e.stopPropagation()
            if (hasRegistrationLink) {
              window.open(event.event_page!, '_blank', 'noopener,noreferrer')
            }
          }}
          title={hasRegistrationLink ? "Abrir página de inscrição" : "Página de inscrição não disponível"}
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          {hasRegistrationLink ? "Inscrever-se" : "Não disponível"}
        </Button>
      </CardFooter>
    </Card>
  )
}