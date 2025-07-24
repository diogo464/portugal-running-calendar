import { ArrowLeft, Heart } from "lucide-react"
import { Event, EventCategoryToDisplayName } from "@/lib/types"
import { formatDateRange, cn } from "@/lib/utils"
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
  const hasRegistrationLink = Boolean(event.page)
  const eventDate = formatDateRange(event.date, event.date)
  const location = event.locality || event.location || "Localização não disponível"
  const eventCategories = event.categories.map(cat => EventCategoryToDisplayName(cat)).join(", ")

  const handleSaveClick = () => {
    onToggleSave(event.id)
  }

  const handleRegistrationClick = () => {
    if (hasRegistrationLink) {
      window.open(event.page!, '_blank', 'noopener,noreferrer')
    }
  }

  // Common props for both layouts
  const layoutProps = {
    eventName: event.name,
    eventImages: event.images,
    eventDate,
    location,
    coordinates: event.coordinates,
    eventCategories: eventCategories,
    descriptionShort: event.description_short,
    description: event.description,
    eventPage: event.page,
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
        <h1 className="text-2xl font-bold flex-1">{event.name}</h1>
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
