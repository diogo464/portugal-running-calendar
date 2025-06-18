import { useMemo, useState, useEffect } from "react"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { CalendarIcon, Clock, Filter, Search, Loader2 } from "lucide-react"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Event, EventType, getAllEventTypes, getEventTypeDisplayName } from "@/lib/app"
import { 
  EventFilters, 
  filterEvents, 
  useEventFilters,
  useEvents,
  filterHelpers
} from "@/lib/event-filters"

// Main component with centralized filter management
export default function RunningEventsPage() {
  // Load events from public/events.json
  const { events: allEvents, loading, error } = useEvents()
  
  // Centralized filter management
  const {
    filters,
    updateFilters,
    toggleEventType,
    setMaxDistance,
    setSearchQuery,
    clearAllFilters
  } = useEventFilters({
    selectedDate: new Date() // Set default selected date
  })
  
  // Compute filtered events based on current filters
  const filteredEvents = useMemo(() => {
    return filterEvents(allEvents, filters)
  }, [allEvents, filters])
  
  // Get events for the selected date
  const eventsOnSelectedDate = useMemo(() => {
    if (!filters.selectedDate) return []
    return filterHelpers.getEventsForDate(filteredEvents, filters.selectedDate)
  }, [filteredEvents, filters.selectedDate])
  
  // Get event dates for calendar highlighting
  const eventDates = useMemo(() => {
    return filteredEvents
      .map(event => event.event_start_date ? new Date(event.event_start_date) : null)
      .filter(Boolean) as Date[]
  }, [filteredEvents])
  
  
  // Handler for date selection
  const handleDateSelect = (date: Date | undefined) => {
    updateFilters({ selectedDate: date })
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>A carregar eventos...</span>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-2">Erro ao carregar eventos</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-3 md:px-4 py-4 md:py-8">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-4xl font-bold text-gray-900 mb-2">
            Calendário de Corridas
          </h1>
          <p className="text-sm md:text-base text-gray-600">
            Descobre eventos de corrida em Portugal
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative w-full">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Procurar eventos..."
              value={filters.searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-full"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 md:gap-6">
          
          {/* Mobile Filter Button */}
          <div className="xl:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="w-full">
                  <Filter className="w-4 h-4 mr-2" />
                  Filtros
                  {filterHelpers.getActiveFilterCount(filters) > 0 && (
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {filterHelpers.getActiveFilterCount(filters)}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Filtros</SheetTitle>
                  <SheetDescription>Filtrar eventos por tipo, distância e data</SheetDescription>
                </SheetHeader>
                <div className="mt-6">
                  <FilterPanel
                    filters={filters}
                    availableEventTypes={getAllEventTypes()}
                    onToggleEventType={toggleEventType}
                    onSetMaxDistance={setMaxDistance}
                    onUpdateFilters={updateFilters}
                    onClearAllFilters={clearAllFilters}
                    isMobile={true}
                  />
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {/* Desktop Filter Panel */}
          <div className="hidden xl:block xl:col-span-1">
            <FilterPanel
              filters={filters}
              availableEventTypes={getAllEventTypes()}
              onToggleEventType={toggleEventType}
              onSetMaxDistance={setMaxDistance}
              onUpdateFilters={updateFilters}
              onClearAllFilters={clearAllFilters}
              isMobile={false}
            />
          </div>

          {/* Main Content */}
          <div className="xl:col-span-3 space-y-4 md:space-y-6">
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
              
              {/* Calendar Component */}
              <EventsCalendar
                events={filteredEvents}
                eventDates={eventDates}
                selectedDate={filters.selectedDate}
                onDateSelect={handleDateSelect}
              />

              {/* Selected Date Events */}
              <SelectedDateEvents
                events={eventsOnSelectedDate}
                selectedDate={filters.selectedDate}
              />
            </div>

            {/* All Events List */}
            <EventsList
              events={filteredEvents}
              title={`Todos os Eventos (${filteredEvents.length})`}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// Filter Panel Component
interface FilterPanelProps {
  filters: EventFilters
  availableEventTypes: EventType[]
  onToggleEventType: (type: EventType) => void
  onSetMaxDistance: (maxDistance: number) => void
  onUpdateFilters: (updates: Partial<EventFilters>) => void
  onClearAllFilters: () => void
  isMobile: boolean
}

function FilterPanel({
  filters,
  availableEventTypes,
  onToggleEventType,
  onSetMaxDistance,
  onUpdateFilters,
  onClearAllFilters,
  isMobile
}: FilterPanelProps) {
  const activeFilterCount = filterHelpers.getActiveFilterCount(filters)
  
  // Local state for slider to avoid continuous updates while dragging
  const [localMaxDistance, setLocalMaxDistance] = useState(filters.maxDistance)
  
  // Sync local state when filters change externally (e.g., clear all filters)
  useEffect(() => {
    setLocalMaxDistance(filters.maxDistance)
  }, [filters.maxDistance])
  
  const FilterContent = () => (
    <div className="space-y-6">
      {/* Date Range Filter */}
      <div>
        <Label className="text-sm font-medium mb-3 block">Período</Label>
        <Select
          value={filters.dateRange}
          onValueChange={(value) => onUpdateFilters({ 
            dateRange: value as EventFilters['dateRange'] 
          })}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as Datas</SelectItem>
            <SelectItem value="week">Próxima Semana</SelectItem>
            <SelectItem value="month">Próximo Mês</SelectItem>
            <SelectItem value="quarter">Próximos 3 Meses</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Event Types */}
      <div>
        <Label className="text-sm font-medium mb-3 block">Tipo de Evento</Label>
        <div className="space-y-3">
          {availableEventTypes.map((type) => (
            <div key={type} className="flex items-center space-x-3">
              <Checkbox
                id={`${isMobile ? 'mobile' : 'desktop'}-type-${type}`}
                checked={filters.eventTypes.includes(type)}
                onCheckedChange={() => onToggleEventType(type)}
              />
              <Label htmlFor={`${isMobile ? 'mobile' : 'desktop'}-type-${type}`} className="text-sm font-normal">
                {getEventTypeDisplayName(type)}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {/* Distance Slider */}
      <div>
        <Label className="text-sm font-medium mb-3 block">
          Distância Máxima: {localMaxDistance >= 30 ? 'Sem limite' : `${localMaxDistance}km`}
        </Label>
        <div className="px-2">
          <Slider
            value={[localMaxDistance]}
            onValueChange={(value) => setLocalMaxDistance(value[0])}
            onValueCommit={(value) => onSetMaxDistance(value[0])}
            max={30}
            min={0}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>0km</span>
            <span>30km+</span>
          </div>
        </div>
      </div>


      {/* Active Filters */}
      {activeFilterCount > 0 && (
        <div>
          <Label className="text-sm font-medium mb-3 block">Filtros Ativos</Label>
          <div className="flex flex-wrap gap-2">
            {filters.eventTypes.map((type) => (
              <Badge key={type} variant="secondary" className="text-xs">
                {getEventTypeDisplayName(type)}
              </Badge>
            ))}
            {filters.maxDistance < 30 && (
              <Badge variant="secondary" className="text-xs">
                Max {filters.maxDistance}km
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Clear Filters Button */}
      {activeFilterCount > 0 && (
        <Button variant="outline" onClick={onClearAllFilters} className="w-full">
          Limpar Filtros
        </Button>
      )}
    </div>
  )

  if (isMobile) {
    return <FilterContent />
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Filtros
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {activeFilterCount}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <FilterContent />
      </CardContent>
    </Card>
  )
}

// Events List Component
interface EventsListProps {
  events: Event[]
  title: string
}

function EventsList({ events, title }: EventsListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg md:text-xl">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>Nenhum evento encontrado com os filtros selecionados</p>
          </div>
        ) : (
          <div className="grid gap-3 md:gap-4">
            {events.map((event) => (
              <div key={event.event_id} className="border rounded-lg p-3 md:p-4 hover:bg-gray-50 transition-colors">
                {/* Title centered */}
                <div className="text-center mb-3">
                  <h3 className="font-semibold text-base md:text-lg">{event.event_name}</h3>
                </div>
                
                {/* Date (left) + Tags (center) + Distance (right) on same line */}
                <div className="flex items-center justify-between mb-3">
                  {/* Left: Date */}
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <CalendarIcon className="w-4 h-4 shrink-0" />
                    {event.event_start_date ? new Date(event.event_start_date).toLocaleDateString('pt-PT') : 'Data por definir'}
                  </div>
                  
                  {/* Center: Tags */}
                  <div className="flex gap-1">
                    {event.event_types.map((type, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {getEventTypeDisplayName(type)}
                      </Badge>
                    ))}
                  </div>
                  
                  {/* Right: Distance */}
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <Clock className="w-4 h-4 shrink-0" />
                    {event.event_distances.map(d => Math.round(d / 100) / 10).join(', ')}km
                  </div>
                </div>
                
                {/* Description centered */}
                <div className="text-center mb-3">
                  <p className="text-gray-600 text-sm">{event.description_short || event.event_description}</p>
                </div>
                
                {/* Bottom row: Location (left) + Event ID (right) */}
                <div className="flex justify-between items-center">
                  <div className="text-left text-sm text-gray-500">
                    📍 {event.event_location}
                  </div>
                  <div className="text-right text-xs text-gray-400">
                    ID: {event.event_id}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Calendar Component
interface EventsCalendarProps {
  events: Event[]
  eventDates: Date[]
  selectedDate?: Date
  onDateSelect: (date: Date | undefined) => void
}

function EventsCalendar({ events, eventDates, selectedDate, onDateSelect }: EventsCalendarProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg md:text-xl">Calendário</CardTitle>
        <p className="text-sm text-gray-600">Mostrando {events.length} eventos</p>
      </CardHeader>
      <CardContent>
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={onDateSelect}
          modifiers={{
            hasEvent: eventDates,
          }}
          modifiersStyles={{
            hasEvent: {
              backgroundColor: "#3b82f6",
              color: "white",
              fontWeight: "bold",
              borderRadius: "0.375rem",
              margin: "2px",
              transform: "scale(0.9)",
            },
          }}
          className="rounded-md border w-full"
        />
      </CardContent>
    </Card>
  )
}

// Selected Date Events Component
interface SelectedDateEventsProps {
  events: Event[]
  selectedDate?: Date
}

function SelectedDateEvents({ events, selectedDate }: SelectedDateEventsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
          <CalendarIcon className="w-5 h-5" />
          <span className="truncate">
            {selectedDate ? selectedDate.toLocaleDateString('pt-PT') : "Selecione uma Data"}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {events.length > 0 ? (
          <div className="space-y-4">
            {events.map((event) => (
              <div key={event.event_id} className="border rounded-lg p-3 hover:bg-gray-50 transition-colors">
                {/* Title centered */}
                <div className="text-center mb-3">
                  <h4 className="font-semibold">{event.event_name}</h4>
                </div>
                
                {/* Tags center + Distance right on same line (no date in selected date view) */}
                <div className="flex items-center justify-between mb-3">
                  {/* Left: Empty space for alignment */}
                  <div className="w-16"></div>
                  
                  {/* Center: Tags */}
                  <div className="flex gap-1">
                    {event.event_types.map((type, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {getEventTypeDisplayName(type)}
                      </Badge>
                    ))}
                  </div>
                  
                  {/* Right: Distance */}
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <Clock className="w-4 h-4 shrink-0" />
                    {event.event_distances.map(d => Math.round(d / 100) / 10).join(', ')}km
                  </div>
                </div>
                
                {/* Description centered */}
                <div className="text-center mb-3">
                  <p className="text-gray-600 text-sm">{event.description_short || event.event_description}</p>
                </div>
                
                {/* Bottom row: Location (left) + Event ID (right) */}
                <div className="flex justify-between items-center">
                  <div className="text-left text-sm text-gray-500">
                    📍 {event.event_location}
                  </div>
                  <div className="text-right text-xs text-gray-400">
                    ID: {event.event_id}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 md:py-8 text-gray-500">
            <CalendarIcon className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm md:text-base">Nenhum evento nesta data</p>
            <p className="text-xs md:text-sm">Selecione uma data com eventos (destacada em azul)</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

