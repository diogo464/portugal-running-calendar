import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import { Icon } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Coordinates } from '@/lib/types'
import { Card, CardContent } from '@/components/ui/card'
import { MapPin, AlertTriangle } from 'lucide-react'

// Fix for default Leaflet markers in React
const defaultIcon = new Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

interface EventLocationMapProps {
  coordinates: Coordinates | null
  eventName: string
  eventLocation: string
  eventPage?: string | null
}

export function EventLocationMap({ 
  coordinates, 
  eventName, 
  eventLocation,
  eventPage 
}: EventLocationMapProps) {
  if (!coordinates) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <MapPin className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-lg font-semibold">Localização no Mapa</h3>
          </div>
          
          <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
            <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium">Localização não disponível</p>
              <p className="text-xs text-muted-foreground mt-1">
                A localização exata deste evento não está disponível no mapa.
              </p>
              {eventPage && (
                <p className="text-xs text-muted-foreground mt-1">
                  Consulte a{' '}
                  <a 
                    href={eventPage} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    página oficial do evento
                  </a>
                  {' '}para mais informações sobre a localização.
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <MapPin className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Localização no Mapa</h3>
        </div>
        
        {/* Disclaimer */}
        <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg mb-4">
          <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-500 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-yellow-800 dark:text-yellow-200">
            <p className="font-medium">Localização aproximada</p>
            <p className="mt-1">
              Esta localização é apenas indicativa. Por favor, confirme a localização exata na{' '}
              {eventPage ? (
                <a 
                  href={eventPage} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="underline hover:no-underline"
                >
                  página oficial do evento
                </a>
              ) : (
                'página oficial do evento'
              )}.
            </p>
          </div>
        </div>

        {/* Map */}
        <div className="w-full h-64 sm:h-80 rounded-lg overflow-hidden border">
          <MapContainer
            center={[coordinates.lat, coordinates.lon]}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
            dragging={false}
            touchZoom={true}
            doubleClickZoom={true}
            scrollWheelZoom={true}
            boxZoom={true}
            keyboard={true}
            zoomControl={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker 
              position={[coordinates.lat, coordinates.lon]}
              icon={defaultIcon}
            >
              <Popup>
                <div className="text-sm">
                  <p className="font-semibold">{eventName}</p>
                  <p className="text-muted-foreground mt-1">{eventLocation}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {coordinates.lat.toFixed(6)}, {coordinates.lon.toFixed(6)}
                  </p>
                </div>
              </Popup>
            </Marker>
          </MapContainer>
        </div>
      </CardContent>
    </Card>
  )
}