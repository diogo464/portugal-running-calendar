"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Event, EventFilters, PaginationState } from "@/lib/types"
import { filterEvents } from "@/lib/utils"
import { useSavedEvents } from "@/hooks/useSavedEvents"
import { useFilterContext } from "@/hooks/useFilterContext"
import { EventFilters as EventFiltersComponent } from "@/components/EventFilters"
import { EventList } from "@/components/EventList"
import { PageLayout } from "@/components/PageLayout"
import { useEvents } from "@/hooks/useEvents"

interface HomepageClientProps {
  initialEvents: Event[]
}

export function HomepageClient({ initialEvents }: HomepageClientProps) {
  const router = useRouter()
  const { savedEventIds, toggleSave } = useSavedEvents()
  const { getFilters, setFilters } = useFilterContext()

  // Use server-rendered events
  const { events: fullEvents, loading } = useEvents();
  const events = !loading && fullEvents.length > 0 ? fullEvents : initialEvents;

  // Get filters from context
  const filters = getFilters('lista') as EventFilters

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
    setFilters('lista', newFilters)
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
            loading={false}
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
