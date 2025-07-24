import { useState } from "react"
import { EventImage } from "./EventImage"
import { EventDetails } from "./EventDetails"
import { EventRegistration } from "./EventRegistration"
import { EventDescription } from "./EventDescription"
import { EventLocationMapWrapper } from "@/components/EventLocationMapWrapper"

interface EventDetailDesktopLayoutProps {
  // Event data
  eventName: string
  eventImages: string[]
  eventDate: string
  location: string
  coordinates: { lat: number; lon: number } | null
  eventCategories: string
  descriptionShort?: string | null
  description?: string | null
  eventPage?: string | null

  // Handlers
  hasRegistrationLink: boolean
  onRegistrationClick: () => void
}

export function EventDetailDesktopLayout({
  eventName,
  eventImages,
  eventDate,
  location,
  coordinates,
  eventCategories,
  descriptionShort,
  description,
  eventPage,
  hasRegistrationLink,
  onRegistrationClick
}: EventDetailDesktopLayoutProps) {
  const [isImageFullscreen, setIsImageFullscreen] = useState(false)

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {/* Main content - Left column */}
      <div className="md:col-span-2 space-y-6">
        {/* Image */}
        <EventImage
          images={eventImages}
          eventName={eventName}
          onFullscreenChange={setIsImageFullscreen}
        />

        {/* Description */}
        <EventDescription
          descriptionShort={descriptionShort}
          description={description}
        />

        {/* Map */}
        {!isImageFullscreen && (
          <EventLocationMapWrapper
            coordinates={coordinates}
            eventName={eventName}
            eventLocation={location}
            eventPage={eventPage}
          />
        )}
      </div>

      {/* Sidebar - Right column */}
      <div className="space-y-6">
        {/* Event Details */}
        <EventDetails
          eventDate={eventDate}
          location={location}
          coordinates={coordinates}
          eventTypes={eventCategories}
        />

        {/* Registration */}
        <EventRegistration
          hasRegistrationLink={hasRegistrationLink}
          onRegistrationClick={onRegistrationClick}
        />
      </div>
    </div>
  )
}
