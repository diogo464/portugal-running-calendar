import { EventImage } from "./EventImage"
import { EventDetails } from "./EventDetails"
import { EventRegistration } from "./EventRegistration"
import { EventDescription } from "./EventDescription"
import { EventLocationMap } from "@/components/EventLocationMap"

interface EventDetailMobileLayoutProps {
  // Event data
  eventName: string
  eventImages: string[]
  eventDate: string
  location: string
  coordinates?: { lat: number; lon: number } | null
  distances: string
  eventTypes: string
  descriptionShort?: string | null
  description?: string | null
  eventPage?: string | null
  
  // Handlers
  hasRegistrationLink: boolean
  onRegistrationClick: () => void
}

export function EventDetailMobileLayout({
  eventName,
  eventImages,
  eventDate,
  location,
  coordinates,
  distances,
  eventTypes,
  descriptionShort,
  description,
  eventPage,
  hasRegistrationLink,
  onRegistrationClick
}: EventDetailMobileLayoutProps) {
  return (
    <div className="space-y-6">
      {/* 1. Image */}
      <EventImage images={eventImages} eventName={eventName} />
      
      {/* 2. Event Details */}
      <EventDetails 
        eventDate={eventDate}
        location={location}
        coordinates={coordinates}
        distances={distances}
        eventTypes={eventTypes}
      />
      
      {/* 3. Registration */}
      <EventRegistration 
        hasRegistrationLink={hasRegistrationLink}
        onRegistrationClick={onRegistrationClick}
      />
      
      {/* 4. Description */}
      <EventDescription 
        descriptionShort={descriptionShort}
        description={description}
      />
      
      {/* 5. Map */}
      <EventLocationMap
        coordinates={coordinates}
        eventName={eventName}
        eventLocation={location}
        eventPage={eventPage}
      />
    </div>
  )
}