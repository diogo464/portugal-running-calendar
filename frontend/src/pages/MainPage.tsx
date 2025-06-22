import { useState, useEffect, useMemo } from "react"
import { Heart } from "lucide-react"
import { Event, EventFilters, PaginationState } from "@/lib/types"
import { filterEvents } from "@/lib/utils"
import { EventFilters as EventFiltersComponent } from "@/components/EventFilters"
import { EventList } from "@/components/EventList"
import { ThemeToggle } from "@/components/ThemeToggle"
import { Button } from "@/components/ui/button"

interface MainPageProps {
  events: Event[]
  loading: boolean
  savedEventIds: Set<number>
  onToggleSave: (eventId: number) => void
  onEventClick: (event: Event) => void
  onViewSaved: () => void
}

export function MainPage({
  events,
  loading,
  savedEventIds,
  onToggleSave,
  onEventClick,
  onViewSaved
}: MainPageProps) {
  const [filters, setFilters] = useState<EventFilters>({
    search: "",
    eventTypes: [],
    distanceRange: [0, null],
    dateRange: "anytime",
    proximityRange: [0, null],
    proximityCenter: null,
    showEventsWithoutLocation: true
  })

  const [pagination, setPagination] = useState<PaginationState>({
    currentPage: 1,
    itemsPerPage: 12,
    totalItems: 0
  })

  // Filter events based on current filters
  const filteredEvents = useMemo(() => {
    if (loading) return []
    return filterEvents(events, filters)
  }, [events, filters, loading])

  // Paginate filtered events
  const paginatedEvents = useMemo(() => {
    const totalItems = filteredEvents.length
    const startIndex = (pagination.currentPage - 1) * pagination.itemsPerPage
    const currentPageEvents = filteredEvents.slice(startIndex, startIndex + pagination.itemsPerPage)
    
    setPagination(prev => ({ ...prev, totalItems }))
    
    return currentPageEvents
  }, [filteredEvents, pagination.currentPage, pagination.itemsPerPage])

  // Reset to first page when filters change
  useEffect(() => {
    setPagination(prev => ({ ...prev, currentPage: 1 }))
  }, [filters])

  const handleFiltersChange = (newFilters: EventFilters) => {
    setFilters(newFilters)
  }

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, currentPage: page }))
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Eventos de Corrida</h1>
          <p className="text-muted-foreground">
            Descubra os próximos eventos de corrida em Portugal
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button variant="outline" onClick={onViewSaved} className="flex items-center gap-2">
            <Heart className="h-4 w-4" />
            Guardados ({savedEventIds.size})
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filters sidebar */}
        <div className="lg:col-span-1">
          <div className="sticky top-6">
            <EventFiltersComponent
              filters={filters}
              onFiltersChange={handleFiltersChange}
              events={events}
            />
          </div>
        </div>

        {/* Main content */}
        <div className="lg:col-span-3">
          <EventList
            events={paginatedEvents}
            loading={loading}
            pagination={pagination}
            savedEventIds={savedEventIds}
            onToggleSave={onToggleSave}
            onEventClick={onEventClick}
            onPageChange={handlePageChange}
          />
        </div>
      </div>
    </div>
  )
}