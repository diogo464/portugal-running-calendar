import { ArrowLeft, Heart } from "lucide-react"
import { Event, EventTypeDisplayNames } from "@/lib/types"
import { formatDateRange, formatDistance, cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { EventDetailMobileLayout } from "@/components/event-detail/EventDetailMobileLayout"
import { EventDetailDesktopLayout } from "@/components/event-detail/EventDetailDesktopLayout"
import { useBreakpoint } from "@/hooks/useBreakpoint"

interface EventDetailPageProps {
  event: Event
  isSaved: boolean
  onToggleSave: (eventId: number) => void
  onBack: () => void
}

export function EventDetailPage({ event, isSaved, onToggleSave, onBack }: EventDetailPageProps) {
  const { isMobile } = useBreakpoint()
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

  // Common props for both layouts
  const layoutProps = {
    eventName: event.event_name,
    eventImages: event.event_images,
    eventDate,
    location,
    coordinates: event.event_coordinates,
    distances,
    eventTypes,
    descriptionShort: event.description_short,
    description: event.event_description,
    eventPage: event.event_page,
    hasRegistrationLink,
    onRegistrationClick: handleRegistrationClick
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

      {/* Responsive Layout */}
      {isMobile ? (
        <EventDetailMobileLayout {...layoutProps} />
      ) : (
        <EventDetailDesktopLayout {...layoutProps} />
      )}
    </div>
  )
}