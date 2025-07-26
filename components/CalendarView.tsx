"use client"

import { useState, useEffect, useMemo } from "react"
import { Event, EventFilters, PaginationState } from "@/lib/types"
import { filterEvents } from "@/lib/utils"
import { useSavedEvents } from "@/hooks/useSavedEvents"
import { useFilterContext } from "@/hooks/useFilterContext"
import { EventFilters as EventFiltersComponent } from "@/components/EventFilters"
import { EventList } from "@/components/EventList"
import { PageLayout } from "@/components/PageLayout"
import { YearlyCalendar } from "@/components/YearlyCalendar"

interface CalendarViewProps {
  initialEvents: Event[]
}

export function CalendarView({ initialEvents }: CalendarViewProps) {
  const { savedEventIds, toggleSave } = useSavedEvents()
  const { getFilters, setFilters } = useFilterContext()
  
  // Use server-rendered events
  const events = initialEvents
  
  // Get filters from context
  const filters = getFilters('calendario') as EventFilters
  const selectedDates = filters.selectedDates || new Set<string>()

  const [pagination, setPagination] = useState<PaginationState>({
    currentPage: 1,
    itemsPerPage: 12,
    totalItems: 0
  })

  // Update filters when selected dates change
  const handleDateSelectionChange = (newSelectedDates: Set<string>) => {
    setFilters('calendario', { ...filters, selectedDates: newSelectedDates })
  }

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
    setFilters('calendario', newFilters)
  }

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, currentPage: page }))
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
        <div className="lg:col-span-3 space-y-6">
          {/* Calendar */}
          <YearlyCalendar
            events={events}
            selectedDates={selectedDates}
            onDateSelectionChange={handleDateSelectionChange}
          />

          {/* Event list (only show if dates are selected) */}
          {selectedDates.size > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">
                Eventos dos Dias Selecionados ({filteredEvents.length})
              </h2>
              <EventList
                events={paginatedEvents}
                loading={false}
                pagination={pagination}
                savedEventIds={savedEventIds}
                onToggleSave={toggleSave}
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  )
}