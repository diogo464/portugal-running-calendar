import { useState, useMemo } from "react"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MapPin, CalendarIcon, Users, Clock } from "lucide-react"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Filter } from "lucide-react"

// Sample running events data
const runningEvents = [
  {
    id: 1,
    name: "Boston Marathon",
    date: new Date(2024, 3, 15), // April 15, 2024
    type: "Marathon",
    distance: "26.2 miles",
    location: "Boston, MA",
    region: "northeast",
    participants: 30000,
    description: "The world's oldest annual marathon",
  },
  {
    id: 2,
    name: "Central Park 5K",
    date: new Date(2024, 3, 20),
    type: "5K",
    distance: "3.1 miles",
    location: "New York, NY",
    region: "northeast",
    participants: 2500,
    description: "Scenic run through Central Park",
  },
  {
    id: 3,
    name: "Chicago Half Marathon",
    date: new Date(2024, 4, 12), // May 12, 2024
    type: "Half Marathon",
    distance: "13.1 miles",
    location: "Chicago, IL",
    region: "midwest",
    participants: 15000,
    description: "Run along Lake Michigan",
  },
  {
    id: 4,
    name: "Austin Trail Run",
    date: new Date(2024, 4, 25),
    type: "Trail Run",
    distance: "10 miles",
    location: "Austin, TX",
    region: "south",
    participants: 800,
    description: "Challenging trail through Texas Hill Country",
  },
  {
    id: 5,
    name: "San Francisco Bay Run",
    date: new Date(2024, 5, 8), // June 8, 2024
    type: "10K",
    distance: "6.2 miles",
    location: "San Francisco, CA",
    region: "west",
    participants: 5000,
    description: "Beautiful bay views throughout the course",
  },
  {
    id: 6,
    name: "Denver Mountain Marathon",
    date: new Date(2024, 5, 22),
    type: "Marathon",
    distance: "26.2 miles",
    location: "Denver, CO",
    region: "west",
    participants: 8000,
    description: "High altitude marathon with mountain views",
  },
  {
    id: 7,
    name: "Miami Beach 5K",
    date: new Date(2024, 6, 4), // July 4, 2024
    type: "5K",
    distance: "3.1 miles",
    location: "Miami, FL",
    region: "south",
    participants: 3000,
    description: "Independence Day beach run",
  },
  {
    id: 8,
    name: "Seattle Ultra Trail",
    date: new Date(2024, 6, 15),
    type: "Ultra Marathon",
    distance: "50 miles",
    location: "Seattle, WA",
    region: "west",
    participants: 500,
    description: "Extreme endurance challenge in Pacific Northwest",
  },
]

const eventTypes = ["Marathon", "Half Marathon", "10K", "5K", "Trail Run", "Ultra Marathon"]
const distances = ["3.1 miles", "6.2 miles", "10 miles", "13.1 miles", "26.2 miles", "50 miles"]
const regions = [
  { id: "northeast", name: "Northeast", color: "#3b82f6" },
  { id: "midwest", name: "Midwest", color: "#10b981" },
  { id: "south", name: "South", color: "#f59e0b" },
  { id: "west", name: "West", color: "#ef4444" },
]

export default function RunningEventsPage() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [selectedEventTypes, setSelectedEventTypes] = useState<string[]>([])
  const [selectedDistances, setSelectedDistances] = useState<string[]>([])
  const [selectedRegions, setSelectedRegions] = useState<string[]>([])
  const [dateRange, setDateRange] = useState<string>("all")

  const handleEventTypeChange = (eventType: string, checked: boolean) => {
    if (checked) {
      setSelectedEventTypes([...selectedEventTypes, eventType])
    } else {
      setSelectedEventTypes(selectedEventTypes.filter((type) => type !== eventType))
    }
  }

  const handleDistanceChange = (distance: string, checked: boolean) => {
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
      if (selectedEventTypes.length > 0 && !selectedEventTypes.includes(event.type)) {
        return false
      }

      // Filter by distance
      if (selectedDistances.length > 0 && !selectedDistances.includes(event.distance)) {
        return false
      }

      // Filter by region
      if (selectedRegions.length > 0 && !selectedRegions.includes(event.region)) {
        return false
      }

      // Filter by date range
      const now = new Date()
      const eventDate = event.date

      switch (dateRange) {
        case "week":
          const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
          return eventDate >= now && eventDate <= weekFromNow
        case "month":
          const monthFromNow = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate())
          return eventDate >= now && eventDate <= monthFromNow
        case "quarter":
          const quarterFromNow = new Date(now.getFullYear(), now.getMonth() + 3, now.getDate())
          return eventDate >= now && eventDate <= quarterFromNow
        default:
          return true
      }
    })
  }, [selectedEventTypes, selectedDistances, selectedRegions, dateRange])

  const eventsOnSelectedDate = useMemo(() => {
    if (!selectedDate) return []
    return filteredEvents.filter((event) => event.date.toDateString() === selectedDate.toDateString())
  }, [filteredEvents, selectedDate])

  const eventDates = useMemo(() => {
    return filteredEvents.map((event) => event.date)
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
          <h1 className="text-2xl md:text-4xl font-bold text-gray-900 mb-2">Running Events Calendar</h1>
          <p className="text-sm md:text-base text-gray-600">Discover running events across the country</p>
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
                            {type}
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
                            {distance}
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
                          {type}
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
                          id={distance}
                          checked={selectedDistances.includes(distance)}
                          onCheckedChange={(checked) => handleDistanceChange(distance, checked as boolean)}
                        />
                        <Label htmlFor={distance} className="text-sm font-normal">
                          {distance}
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
                        <div key={event.id} className="border rounded-lg p-3 md:p-4 hover:bg-gray-50 transition-colors">
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="font-semibold text-base md:text-lg pr-2">{event.name}</h3>
                            <Badge variant="outline" className="text-xs shrink-0">
                              {event.type}
                            </Badge>
                          </div>
                          <p className="text-gray-600 text-sm mb-3">{event.description}</p>
                          <div className="space-y-2 md:space-y-0 md:flex md:items-center md:gap-4 text-sm text-gray-500">
                            <div className="flex items-center gap-1">
                              <MapPin className="w-4 h-4 shrink-0" />
                              <span className="truncate">{event.location}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4 shrink-0" />
                              {event.distance}
                            </div>
                            <div className="flex items-center gap-1">
                              <Users className="w-4 h-4 shrink-0" />
                              {event.participants.toLocaleString()}
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
                    <div key={event.id} className="border rounded-lg p-3 md:p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 pr-2">
                          <h3 className="font-semibold text-base md:text-lg">{event.name}</h3>
                          <p className="text-gray-600 text-sm">{event.description}</p>
                        </div>
                        <Badge variant="outline" className="text-xs shrink-0">
                          {event.type}
                        </Badge>
                      </div>
                      <div className="space-y-2 md:space-y-0 md:flex md:items-center md:gap-6 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <CalendarIcon className="w-4 h-4 shrink-0" />
                          {event.date.toLocaleDateString()}
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4 shrink-0" />
                          <span className="truncate">{event.location}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4 shrink-0" />
                          {event.distance}
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4 shrink-0" />
                          {event.participants.toLocaleString()} participants
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
