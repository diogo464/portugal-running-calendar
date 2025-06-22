import { Calendar, MapPin, Ruler } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface EventDetailsProps {
  eventDate: string
  location: string
  coordinates?: { lat: number; lon: number } | null
  distances: string
  eventTypes: string
}

export function EventDetails({ 
  eventDate, 
  location, 
  coordinates, 
  distances, 
  eventTypes 
}: EventDetailsProps) {
  return (
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
            {coordinates && (
              <p className="text-xs text-muted-foreground mt-1">
                {coordinates.lat.toFixed(6)}, {coordinates.lon.toFixed(6)}
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
  )
}