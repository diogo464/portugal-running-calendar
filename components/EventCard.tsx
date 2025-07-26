import { Heart, ExternalLink, MapPin, Calendar, Ruler } from "lucide-react"
import Link from "next/link"
import { Event, EventCategoryToDisplayName } from "@/lib/types"
import { formatDateRange, cn, getEventUrl } from "@/lib/utils"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface EventCardProps {
  event: Event
  isSaved: boolean
  onToggleSave: (eventId: number) => void
}

export function EventCard({ event, isSaved, onToggleSave }: EventCardProps) {
  const handleSaveClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onToggleSave(event.id)
  }

  const hasRegistrationLink = Boolean(event.page)
  const eventDate = formatDateRange(event.date, event.date)
  const categories = event.categories
    .map(c => EventCategoryToDisplayName(c))
    .join(", ")
  const location = event.locality || event.location || "Localização não disponível"

  return (
    <Link href={getEventUrl(event)} className="block h-full">
      <Card className="cursor-pointer transition-shadow hover:shadow-md flex flex-col h-full">
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
        {hasRegistrationLink ? (
          <Link 
            href={event.page!} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              variant="default"
              size="sm"
              className="w-full"
              title="Abrir página de inscrição"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Inscrever-se
            </Button>
          </Link>
        ) : (
          <Button
            variant="secondary"
            size="sm"
            className="w-full"
            disabled
            title="Página de inscrição não disponível"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Não disponível
          </Button>
        )}
      </CardFooter>
      </Card>
    </Link>
  )
}
