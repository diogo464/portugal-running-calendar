"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Event, EventFilters, PaginationState } from "@/lib/types"
import { filterEvents } from "@/lib/utils"
import { useUpcomingEvents } from "@/hooks/useUpcomingEvents"
import { useSavedEvents } from "@/hooks/useSavedEvents"
import { EventFilters as EventFiltersComponent } from "@/components/EventFilters"
import { EventList } from "@/components/EventList"
import { PageLayout } from "@/components/PageLayout"

interface HomepageClientProps {
  initialEvents: Event[]
}

export function HomepageClient({ initialEvents }: HomepageClientProps) {
  const router = useRouter()
  const { events: upcomingEvents, loading, error } = useUpcomingEvents()
  const { savedEventIds, toggleSave } = useSavedEvents()
  
  // Use server-rendered events initially, then client-side events once loaded
  const events = loading ? initialEvents : upcomingEvents
  
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
    return filterEvents(events, filters)
  }, [events, filters])

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

  const handleEventClick = (event: Event) => {
    // Create event slug from event name if not available
    const eventSlug = event.slug || 
      event.name.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
    
    router.push(`/event/${event.id}/${eventSlug}`)
  }


  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Erro ao Carregar</h1>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <PageLayout savedEventIds={savedEventIds}>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mt-6">
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
            loading={loading && initialEvents.length === 0}
            pagination={pagination}
            savedEventIds={savedEventIds}
            onToggleSave={toggleSave}
            onEventClick={handleEventClick}
            onPageChange={handlePageChange}
          />
        </div>
      </div>
    </PageLayout>
  )
}