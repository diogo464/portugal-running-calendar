import { Heart, ExternalLink, MapPin, Calendar, Ruler } from "lucide-react"
import { Event, EventCategoryToDisplayName } from "@/lib/types"
import { formatDateRange, cn } from "@/lib/utils"
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
    onToggleSave(event.id)
  }

  const handleCardClick = () => {
    onEventClick(event)
  }

  const hasRegistrationLink = Boolean(event.page)
  const eventDate = formatDateRange(event.date, event.date)
  const categories = event.categories
    .map(c => EventCategoryToDisplayName(c))
    .join(", ")
  const location = event.locality || event.location || "Localização não disponível"

  return (
    <Card
      className="cursor-pointer transition-shadow hover:shadow-md flex flex-col h-full"
      onClick={handleCardClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg line-clamp-2">{event.name}</CardTitle>
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

      <CardContent className="space-y-2 flex-1">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>{eventDate}</span>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4" />
          <span className="line-clamp-1">{location}</span>
        </div>

        {categories && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Ruler className="h-4 w-4" />
            <span className="line-clamp-1">{categories}</span>
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
              window.open(event.page!, '_blank', 'noopener,noreferrer')
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
