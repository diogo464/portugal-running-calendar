import { useState, useMemo } from "react"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MapPin, CalendarIcon, Clock } from "lucide-react"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Filter } from "lucide-react"
import { Event, EventType, getAllEventTypes, getEventTypeDisplayName } from "@/lib/app"

// Sample running events data using proper Event structure
const runningEvents: Event[] = [
  {
    event_id: 1,
    event_name: "Maratona do Porto",
    event_location: "Porto, Portugal",
    event_coordinates: { lat: 41.1579, lon: -8.6291 },
    event_country: "Portugal",
    event_locality: "Porto",
    event_distances: [42.2, 21.1, 10],
    event_types: [EventType.Marathon, EventType.HalfMarathon, EventType.TenK],
    event_images: [],
    event_start_date: "2024-10-06",
    event_end_date: "2024-10-06",
    event_circuit: [],
    event_description: "A maior prova de atletismo do Norte do país, passando pelos pontos mais emblemáticos da cidade do Porto.",
    description_short: "Maratona internacional do Porto com percurso urbano"
  },
  {
    event_id: 2,
    event_name: "Corrida de São Silvestre de Lisboa",
    event_location: "Lisboa, Portugal",
    event_coordinates: { lat: 38.7223, lon: -9.1393 },
    event_country: "Portugal",
    event_locality: "Lisboa",
    event_distances: [10],
    event_types: [EventType.TenK, EventType.SaintSilvester],
    event_images: [],
    event_start_date: "2024-12-31",
    event_end_date: "2024-12-31",
    event_circuit: [],
    event_description: "Tradicional prova de fim de ano pelas ruas de Lisboa, terminando na Praça do Comércio.",
    description_short: "Corrida tradicional de fim de ano em Lisboa"
  },
  {
    event_id: 3,
    event_name: "Trail do Gerês",
    event_location: "Gerês, Portugal",
    event_coordinates: { lat: 41.7297, lon: -8.1508 },
    event_country: "Portugal",
    event_locality: "Gerês",
    event_distances: [25, 15, 8],
    event_types: [EventType.Trail],
    event_images: [],
    event_start_date: "2024-09-15",
    event_end_date: "2024-09-15",
    event_circuit: [],
    event_description: "Trail running no Parque Nacional da Peneda-Gerês, com paisagens deslumbrantes da natureza minhota.",
    description_short: "Trail running no Parque Nacional da Peneda-Gerês"
  },
  {
    event_id: 4,
    event_name: "Meia Maratona de Coimbra",
    event_location: "Coimbra, Portugal",
    event_coordinates: { lat: 40.2033, lon: -8.4103 },
    event_country: "Portugal",
    event_locality: "Coimbra",
    event_distances: [21.1, 10],
    event_types: [EventType.HalfMarathon, EventType.TenK],
    event_images: [],
    event_start_date: "2024-11-17",
    event_end_date: "2024-11-17",
    event_circuit: [],
    event_description: "Percurso pela cidade universitária mais antiga do país, passando pela Universidade e pelo centro histórico.",
    description_short: "Meia maratona pela cidade universitária de Coimbra"
  },
  {
    event_id: 5,
    event_name: "Corrida das Pontes",
    event_location: "Vila Nova de Gaia, Portugal",
    event_coordinates: { lat: 41.1239, lon: -8.6118 },
    event_country: "Portugal",
    event_locality: "Vila Nova de Gaia",
    event_distances: [10, 5],
    event_types: [EventType.TenK, EventType.FiveK],
    event_images: [],
    event_start_date: "2024-08-25",
    event_end_date: "2024-08-25",
    event_circuit: [],
    event_description: "Corrida que atravessa as pontes icónicas sobre o Rio Douro, ligando Porto e Vila Nova de Gaia.",
    description_short: "Corrida pelas pontes do Douro entre Porto e Gaia"
  }
]

const eventTypes = getAllEventTypes()
const distances = [5, 10, 15, 21.1, 25, 42.2]
const regions = [
  { id: "northeast", name: "Northeast", color: "#3b82f6" },
  { id: "midwest", name: "Midwest", color: "#10b981" },
  { id: "south", name: "South", color: "#f59e0b" },
  { id: "west", name: "West", color: "#ef4444" },
]

export default function RunningEventsPage() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [selectedEventTypes, setSelectedEventTypes] = useState<EventType[]>([])
  const [selectedDistances, setSelectedDistances] = useState<number[]>([])
  const [selectedRegions, setSelectedRegions] = useState<string[]>([])
  const [dateRange, setDateRange] = useState<string>("all")

  const handleEventTypeChange = (eventType: EventType, checked: boolean) => {
    if (checked) {
      setSelectedEventTypes([...selectedEventTypes, eventType])
    } else {
      setSelectedEventTypes(selectedEventTypes.filter((type) => type !== eventType))
    }
  }

  const handleDistanceChange = (distance: number, checked: boolean) => {
    if (checked) {
      setSelectedDistances([...selectedDistances, distance])
    } else {
      setSelectedDistances(selectedDistances.filter((d) => d !== distance))
    }
  }

  const handleRegionClick = (regionId: string) => {
    if (selectedRegions.includes(regionId)) {
      setSelectedRegions(selectedRegions.filter((r) => r !== regionId))
    } else {
      setSelectedRegions([...selectedRegions, regionId])
    }
  }

  const filteredEvents = useMemo(() => {
    return runningEvents.filter((event) => {
      // Filter by event type
      if (selectedEventTypes.length > 0 && !event.event_types.some(type => selectedEventTypes.includes(type))) {
        return false
      }

      // Filter by distance
      if (selectedDistances.length > 0 && !event.event_distances.some(distance => selectedDistances.includes(distance))) {
        return false
      }

      // Filter by region (using locality for now)
      if (selectedRegions.length > 0 && !selectedRegions.includes(event.event_locality || '')) {
        return false
      }

      // Filter by date range
      const now = new Date()
      const eventDate = event.event_start_date ? new Date(event.event_start_date) : new Date()

      switch (dateRange) {
        case "week": {
          const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
          return eventDate >= now && eventDate <= weekFromNow
        }
        case "month": {
          const monthFromNow = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate())
          return eventDate >= now && eventDate <= monthFromNow
        }
        case "quarter": {
          const quarterFromNow = new Date(now.getFullYear(), now.getMonth() + 3, now.getDate())
          return eventDate >= now && eventDate <= quarterFromNow
        }
        default:
          return true
      }
    })
  }, [selectedEventTypes, selectedDistances, selectedRegions, dateRange])

  const eventsOnSelectedDate = useMemo(() => {
    if (!selectedDate) return []
    return filteredEvents.filter((event) => {
      const eventDate = event.event_start_date ? new Date(event.event_start_date) : new Date()
      return eventDate.toDateString() === selectedDate.toDateString()
    })
  }, [filteredEvents, selectedDate])

  const eventDates = useMemo(() => {
    return filteredEvents.map((event) => event.event_start_date ? new Date(event.event_start_date) : new Date())
  }, [filteredEvents])

  const clearAllFilters = () => {
    setSelectedEventTypes([])
    setSelectedDistances([])
    setSelectedRegions([])
    setDateRange("all")
  }

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-3 md:px-4 py-4 md:py-8">
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-4xl font-bold text-gray-900 mb-2">Calendário de Corridas</h1>
          <p className="text-sm md:text-base text-gray-600">Descobre eventos de corrida em Portugal</p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 md:gap-6">
          {/* Mobile Filter Button */}
          <div className="xl:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="w-full">
                  <Filter className="w-4 h-4 mr-2" />
                  Filters
                  {selectedEventTypes.length + selectedDistances.length + selectedRegions.length > 0 && (
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {selectedEventTypes.length + selectedDistances.length + selectedRegions.length}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Filters</SheetTitle>
                  <SheetDescription>Filter events by type, distance, date, and location</SheetDescription>
                </SheetHeader>
                <div className="mt-6 space-y-6">
                  {/* Date Range Filter */}
                  <div>
                    <Label className="text-sm font-medium mb-3 block">Date Range</Label>
                    <Select value={dateRange} onValueChange={setDateRange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Dates</SelectItem>
                        <SelectItem value="week">Next Week</SelectItem>
                        <SelectItem value="month">Next Month</SelectItem>
                        <SelectItem value="quarter">Next 3 Months</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Event Type Filter */}
                  <div>
                    <Label className="text-sm font-medium mb-3 block">Event Type</Label>
                    <div className="space-y-3">
                      {eventTypes.map((type) => (
                        <div key={type} className="flex items-center space-x-3">
                          <Checkbox
                            id={`mobile-${type}`}
                            checked={selectedEventTypes.includes(type)}
                            onCheckedChange={(checked) => handleEventTypeChange(type, checked as boolean)}
                          />
                          <Label htmlFor={`mobile-${type}`} className="text-sm font-normal">
                            {getEventTypeDisplayName(type)}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Distance Filter */}
                  <div>
                    <Label className="text-sm font-medium mb-3 block">Distance</Label>
                    <div className="space-y-3">
                      {distances.map((distance) => (
                        <div key={distance} className="flex items-center space-x-3">
                          <Checkbox
                            id={`mobile-${distance}`}
                            checked={selectedDistances.includes(distance)}
                            onCheckedChange={(checked) => handleDistanceChange(distance, checked as boolean)}
                          />
                          <Label htmlFor={`mobile-${distance}`} className="text-sm font-normal">
                            {distance}km
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Region Filter */}
                  <div>
                    <Label className="text-sm font-medium mb-3 block">Regions</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {regions.map((region) => (
                        <Button
                          key={region.id}
                          variant={selectedRegions.includes(region.id) ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleRegionClick(region.id)}
                          className="text-xs h-9"
                        >
                          <MapPin className="w-3 h-3 mr-1" />
                          {region.name}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Active Filters */}
                  {(selectedEventTypes.length > 0 || selectedDistances.length > 0 || selectedRegions.length > 0) && (
                    <div>
                      <Label className="text-sm font-medium mb-3 block">Active Filters</Label>
                      <div className="flex flex-wrap gap-2">
                        {selectedEventTypes.map((type) => (
                          <Badge key={type} variant="secondary" className="text-xs">
                            {type}
                          </Badge>
                        ))}
                        {selectedDistances.map((distance) => (
                          <Badge key={distance} variant="secondary" className="text-xs">
                            {distance}
                          </Badge>
                        ))}
                        {selectedRegions.map((regionId) => (
                          <Badge key={regionId} variant="secondary" className="text-xs">
                            {regions.find((r) => r.id === regionId)?.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <Button variant="outline" onClick={clearAllFilters} className="w-full">
                    Clear All Filters
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {/* Desktop Filters Sidebar */}
          <div className="hidden xl:block xl:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Filters
                  <Button variant="outline" size="sm" onClick={clearAllFilters}>
                    Clear All
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Date Range Filter */}
                <div>
                  <Label className="text-sm font-medium mb-3 block">Date Range</Label>
                  <Select value={dateRange} onValueChange={setDateRange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Dates</SelectItem>
                      <SelectItem value="week">Next Week</SelectItem>
                      <SelectItem value="month">Next Month</SelectItem>
                      <SelectItem value="quarter">Next 3 Months</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Event Type Filter */}
                <div>
                  <Label className="text-sm font-medium mb-3 block">Event Type</Label>
                  <div className="space-y-2">
                    {eventTypes.map((type) => (
                      <div key={type} className="flex items-center space-x-2">
                        <Checkbox
                          id={type}
                          checked={selectedEventTypes.includes(type)}
                          onCheckedChange={(checked) => handleEventTypeChange(type, checked as boolean)}
                        />
                        <Label htmlFor={type} className="text-sm font-normal">
                          {getEventTypeDisplayName(type)}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Distance Filter */}
                <div>
                  <Label className="text-sm font-medium mb-3 block">Distance</Label>
                  <div className="space-y-2">
                    {distances.map((distance) => (
                      <div key={distance} className="flex items-center space-x-2">
                        <Checkbox
                          id={`desktop-${distance}`}
                          checked={selectedDistances.includes(distance)}
                          onCheckedChange={(checked) => handleDistanceChange(distance, checked as boolean)}
                        />
                        <Label htmlFor={`desktop-${distance}`} className="text-sm font-normal">
                          {distance}km
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Active Filters */}
                {(selectedEventTypes.length > 0 || selectedDistances.length > 0 || selectedRegions.length > 0) && (
                  <div>
                    <Label className="text-sm font-medium mb-3 block">Active Filters</Label>
                    <div className="flex flex-wrap gap-2">
                      {selectedEventTypes.map((type) => (
                        <Badge key={type} variant="secondary" className="text-xs">
                          {getEventTypeDisplayName(type)}
                        </Badge>
                      ))}
                      {selectedDistances.map((distance) => (
                        <Badge key={distance} variant="secondary" className="text-xs">
                          {distance}km
                        </Badge>
                      ))}
                      {selectedRegions.map((regionId) => (
                        <Badge key={regionId} variant="secondary" className="text-xs">
                          {regions.find((r) => r.id === regionId)?.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="xl:col-span-3 space-y-4 md:space-y-6">
            {/* Map */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg md:text-xl">Event Locations</CardTitle>
                <p className="text-sm text-gray-600">Tap regions to filter events by location</p>
              </CardHeader>
              <CardContent>
                <div className="relative w-full h-48 md:h-64 bg-gray-100 rounded-lg overflow-hidden">
                  <svg viewBox="0 0 800 400" className="w-full h-full">
                    {/* Simplified US Map Regions */}
                    {/* Northeast */}
                    <path
                      d="M600 50 L750 50 L750 150 L650 150 L600 100 Z"
                      fill={selectedRegions.includes("northeast") ? regions[0].color : "#e5e7eb"}
                      stroke="#374151"
                      strokeWidth="2"
                      className="cursor-pointer hover:opacity-80 transition-opacity touch-manipulation"
                      onClick={() => handleRegionClick("northeast")}
                    />
                    <text
                      x="675"
                      y="100"
                      textAnchor="middle"
                      className="text-xs font-medium fill-white pointer-events-none"
                    >
                      Northeast
                    </text>

                    {/* Midwest */}
                    <path
                      d="M400 80 L600 80 L600 200 L400 200 Z"
                      fill={selectedRegions.includes("midwest") ? regions[1].color : "#e5e7eb"}
                      stroke="#374151"
                      strokeWidth="2"
                      className="cursor-pointer hover:opacity-80 transition-opacity touch-manipulation"
                      onClick={() => handleRegionClick("midwest")}
                    />
                    <text
                      x="500"
                      y="140"
                      textAnchor="middle"
                      className="text-xs font-medium fill-white pointer-events-none"
                    >
                      Midwest
                    </text>

                    {/* South */}
                    <path
                      d="M300 200 L650 200 L650 350 L300 350 Z"
                      fill={selectedRegions.includes("south") ? regions[2].color : "#e5e7eb"}
                      stroke="#374151"
                      strokeWidth="2"
                      className="cursor-pointer hover:opacity-80 transition-opacity touch-manipulation"
                      onClick={() => handleRegionClick("south")}
                    />
                    <text
                      x="475"
                      y="275"
                      textAnchor="middle"
                      className="text-xs font-medium fill-white pointer-events-none"
                    >
                      South
                    </text>

                    {/* West */}
                    <path
                      d="M50 50 L400 50 L400 350 L50 350 Z"
                      fill={selectedRegions.includes("west") ? regions[3].color : "#e5e7eb"}
                      stroke="#374151"
                      strokeWidth="2"
                      className="cursor-pointer hover:opacity-80 transition-opacity touch-manipulation"
                      onClick={() => handleRegionClick("west")}
                    />
                    <text
                      x="225"
                      y="200"
                      textAnchor="middle"
                      className="text-xs font-medium fill-white pointer-events-none"
                    >
                      West
                    </text>
                  </svg>
                </div>
                <div className="mt-4 grid grid-cols-2 md:flex md:flex-wrap gap-2">
                  {regions.map((region) => (
                    <Button
                      key={region.id}
                      variant={selectedRegions.includes(region.id) ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleRegionClick(region.id)}
                      className="text-xs h-9 touch-manipulation"
                    >
                      <MapPin className="w-3 h-3 mr-1" />
                      {region.name}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
              {/* Calendar */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg md:text-xl">Event Calendar</CardTitle>
                  <p className="text-sm text-gray-600">Showing {filteredEvents.length} events</p>
                </CardHeader>
                <CardContent>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    modifiers={{
                      hasEvent: eventDates,
                    }}
                    modifiersStyles={{
                      hasEvent: {
                        backgroundColor: "#3b82f6",
                        color: "white",
                        fontWeight: "bold",
                      },
                    }}
                    className="rounded-md border w-full"
                  />
                </CardContent>
              </Card>

              {/* Selected Date Events */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                    <CalendarIcon className="w-5 h-5" />
                    <span className="truncate">
                      {selectedDate ? selectedDate.toLocaleDateString() : "Select a Date"}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {eventsOnSelectedDate.length > 0 ? (
                    <div className="space-y-4">
                      {eventsOnSelectedDate.map((event) => (
                        <div key={event.event_id} className="border rounded-lg p-3 md:p-4 hover:bg-gray-50 transition-colors">
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="font-semibold text-base md:text-lg pr-2">{event.event_name}</h3>
                            <div className="flex gap-1 shrink-0">
                              {event.event_types.map((type, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {getEventTypeDisplayName(type)}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <p className="text-gray-600 text-sm mb-3">{event.description_short || event.event_description}</p>
                          <div className="space-y-2 md:space-y-0 md:flex md:items-center md:gap-4 text-sm text-gray-500">
                            <div className="flex items-center gap-1">
                              <MapPin className="w-4 h-4 shrink-0" />
                              <span className="truncate">{event.event_location}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4 shrink-0" />
                              {event.event_distances.join(', ')}km
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 md:py-8 text-gray-500">
                      <CalendarIcon className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-4 opacity-50" />
                      <p className="text-sm md:text-base">No events on this date</p>
                      <p className="text-xs md:text-sm">Select a date with events (highlighted in blue)</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* All Events List */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg md:text-xl">All Events ({filteredEvents.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:gap-4">
                  {filteredEvents.map((event) => (
                    <div key={event.event_id} className="border rounded-lg p-3 md:p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 pr-2">
                          <h3 className="font-semibold text-base md:text-lg">{event.event_name}</h3>
                          <p className="text-gray-600 text-sm">{event.description_short || event.event_description}</p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          {event.event_types.map((type, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {getEventTypeDisplayName(type)}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-2 md:space-y-0 md:flex md:items-center md:gap-6 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <CalendarIcon className="w-4 h-4 shrink-0" />
                          {event.event_start_date ? new Date(event.event_start_date).toLocaleDateString('pt-PT') : 'Data por definir'}
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4 shrink-0" />
                          <span className="truncate">{event.event_location}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4 shrink-0" />
                          {event.event_distances.join(', ')}km
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
