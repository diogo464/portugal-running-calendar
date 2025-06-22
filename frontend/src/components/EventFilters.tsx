import { useState, useMemo } from "react"
import { Search } from "lucide-react"
import { EventType, EventTypeDisplayNames, EventFilters as IEventFilters, Event } from "@/lib/types"
import { formatDistance, formatDistanceFromMeters } from "@/lib/utils"
import { useGeolocation } from "@/hooks/useGeolocation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { LocationGrantedIcon, LocationDeniedIcon, LocationWarningIcon } from "@/components/ui/proximity-icons"

interface EventFiltersProps {
  filters: IEventFilters
  onFiltersChange: (filters: IEventFilters) => void
  events: Event[]
}

export function EventFilters({ filters, onFiltersChange, events }: EventFiltersProps) {
  const geolocation = useGeolocation()
  
  const [distanceValues, setDistanceValues] = useState<number[]>([
    filters.distanceRange[0],
    filters.distanceRange[1] || 30000
  ])
  
  const [proximityValues, setProximityValues] = useState<number[]>([
    filters.proximityRange[0],
    filters.proximityRange[1] || 600000
  ])
  
  // Count events without location
  const eventsWithoutLocation = useMemo(() => 
    events.filter(event => !event.event_coordinates).length,
    [events]
  )

  const handleSearchChange = (value: string) => {
    onFiltersChange({ ...filters, search: value })
  }

  const handleEventTypeToggle = (eventType: EventType, checked: boolean) => {
    const newEventTypes = checked
      ? [...filters.eventTypes, eventType]
      : filters.eventTypes.filter(type => type !== eventType)
    
    onFiltersChange({ ...filters, eventTypes: newEventTypes })
  }

  const handleDistanceChange = (values: number[]) => {
    const [min, max] = values
    // Ensure min doesn't exceed max and max doesn't go below min
    const constrainedValues = [
      Math.min(min, max),
      Math.max(min, max)
    ]
    setDistanceValues(constrainedValues)
    onFiltersChange({
      ...filters,
      distanceRange: [constrainedValues[0], constrainedValues[1] === 30000 ? null : constrainedValues[1]]
    })
  }

  const handleDateRangeChange = (value: IEventFilters['dateRange']) => {
    onFiltersChange({ ...filters, dateRange: value })
  }

  const handleProximityChange = async (values: number[]) => {
    // Request location permission when user first interacts with proximity slider
    if (!geolocation.hasLocation && geolocation.permission === 'prompt') {
      await geolocation.requestLocation()
    }
    
    const [min, max] = values
    // Ensure min doesn't exceed max and max doesn't go below min
    const constrainedValues = [
      Math.min(min, max),
      Math.max(min, max)
    ]
    setProximityValues(constrainedValues)
    onFiltersChange({
      ...filters,
      proximityRange: [constrainedValues[0], constrainedValues[1] === 600000 ? null : constrainedValues[1]],
      proximityCenter: geolocation.position
    })
  }

  const handleShowEventsWithoutLocationChange = (checked: boolean) => {
    onFiltersChange({ ...filters, showEventsWithoutLocation: checked })
  }

  const formatDistanceValue = (value: number) => {
    if (value >= 30000) return "∞"
    return formatDistance(value)
  }

  const formatProximityValue = (value: number) => {
    if (value >= 600000) return "∞"
    return `${Math.round(value / 1000)}km` // Convert meters to km for display
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Filtros</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Search */}
        <div className="space-y-2">
          <Label htmlFor="search">Pesquisar eventos</Label>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="search"
              placeholder="Nome do evento..."
              value={filters.search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Event Types */}
        <div className="space-y-3">
          <Label>Tipos de evento</Label>
          <div className="grid grid-cols-2 gap-3">
            {Object.values(EventType).map((eventType) => (
              <div key={eventType} className="flex items-center space-x-2">
                <Checkbox
                  id={eventType}
                  checked={filters.eventTypes.includes(eventType)}
                  onCheckedChange={(checked) => 
                    handleEventTypeToggle(eventType, checked as boolean)
                  }
                />
                <Label 
                  htmlFor={eventType}
                  className="text-sm cursor-pointer"
                >
                  {EventTypeDisplayNames[eventType]}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Distance Range */}
        <div className="space-y-3">
          <Label>Distância</Label>
          <div className="px-2 pt-2">
            <Slider
              value={distanceValues}
              onValueChange={handleDistanceChange}
              max={30000}
              min={0}
              step={1000}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>{formatDistanceValue(distanceValues[0])}</span>
              <span>{formatDistanceValue(distanceValues[1])}</span>
            </div>
          </div>
        </div>

        {/* Proximity Range */}
        <div className="space-y-3">
          <Label>Proximidade</Label>
          <div className="px-2 pt-2">
            <Slider
              value={proximityValues}
              onValueChange={handleProximityChange}
              max={600000}
              min={0}
              step={1000}
              className="w-full"
              disabled={geolocation.permission === 'denied'}
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>{formatProximityValue(proximityValues[0])}</span>
              <span>{formatProximityValue(proximityValues[1])}</span>
            </div>
            
            {/* Permission indicator */}
            <div className="flex items-center mt-2">
              {geolocation.permission === 'granted' && (
                <div className="flex items-center">
                  <LocationGrantedIcon />
                  <span className="text-xs text-green-600 dark:text-green-400 ml-2">
                    Localização permitida
                  </span>
                </div>
              )}
              {geolocation.permission === 'denied' && <LocationDeniedIcon />}
              {geolocation.permission === 'prompt' && <div className="w-3 h-3 rounded-full bg-gray-300" />}
            </div>
            
            {/* Show events without location checkbox - only visible when proximity is active */}
            {geolocation.hasLocation && (
              <div className="space-y-2 mt-3 pt-2 border-t border-border">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="showEventsWithoutLocation"
                    checked={filters.showEventsWithoutLocation}
                    onCheckedChange={handleShowEventsWithoutLocationChange}
                  />
                  <Label 
                    htmlFor="showEventsWithoutLocation"
                    className="text-sm cursor-pointer"
                  >
                    Mostrar eventos sem localização
                  </Label>
                </div>
                
                {/* Warning for events without location */}
                {eventsWithoutLocation > 0 && (
                  <div className="flex items-center space-x-2 text-xs text-yellow-600 dark:text-yellow-400">
                    <LocationWarningIcon />
                    <span>{eventsWithoutLocation} eventos sem localização conhecida</span>
                  </div>
                )}
              </div>
            )}
            
            {/* Error message when permission denied */}
            {geolocation.permission === 'denied' && geolocation.error && (
              <div className="flex items-center mt-2">
                <LocationDeniedIcon />
                <span className="text-xs text-red-600 dark:text-red-400 ml-2">
                  {geolocation.error}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Date Range */}
        <div className="space-y-2">
          <Label>Período</Label>
          <Select value={filters.dateRange} onValueChange={handleDateRangeChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="anytime">Qualquer altura</SelectItem>
              <SelectItem value="next_week">Próxima semana</SelectItem>
              <SelectItem value="next_month">Próximo mês</SelectItem>
              <SelectItem value="next_3_months">Próximos 3 meses</SelectItem>
              <SelectItem value="next_6_months">Próximos 6 meses</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  )
}