import dynamic from 'next/dynamic'
import { Coordinates } from '@/lib/types'

// Dynamic import to prevent SSR issues with Leaflet
const EventLocationMap = dynamic(
  () => import('./EventLocationMap').then(mod => ({ default: mod.EventLocationMap })),
  { 
    ssr: false,
    loading: () => (
      <div className="h-64 bg-muted rounded-lg flex items-center justify-center">
        <p className="text-muted-foreground">Carregando mapa...</p>
      </div>
    )
  }
)

interface EventLocationMapWrapperProps {
  coordinates: Coordinates | null
  eventName: string
  eventLocation: string
  eventPage?: string | null
}

export function EventLocationMapWrapper(props: EventLocationMapWrapperProps) {
  return <EventLocationMap {...props} />
}