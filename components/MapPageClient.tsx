'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Event, PaginationState } from '@/lib/types'
import { District } from '@/lib/district-types'
import { useFilterContext } from '@/hooks/useFilterContext'
import { DistrictMap } from '@/components/DistrictMap'
import { MapFilters } from '@/components/MapFilters'
import { EventList } from '@/components/EventList'
import { PageLayout } from '@/components/PageLayout'
import { useBreakpoint } from '@/hooks/useBreakpoint'
import { useSavedEvents } from '@/hooks/useSavedEvents'

interface MapPageClientProps {
  initialEvents: Event[]
  districts: District[]
}


export function MapPageClient({ initialEvents, districts }: MapPageClientProps) {
  const { getFilters, setFilters } = useFilterContext()

  // Use server-rendered events
  const events = initialEvents

  // Get filters from context
  const filters = getFilters('mapa') as {
    eventCategories: import('@/lib/types').EventCategory[]
    dateRange: import('@/lib/types').EventFilters['dateRange']
    selectedDistricts: number[]
  }
  const selectedDistricts = filters.selectedDistricts

  // Use server-rendered districts
  const { isMobile } = useBreakpoint()
  const { savedEventIds, toggleSave } = useSavedEvents()
  const router = useRouter()

  const [pagination, setPagination] = useState<PaginationState>({
    currentPage: 1,
    itemsPerPage: 12,
    totalItems: 0
  })

  // Create district names lookup from districts array
  const districtNames = useMemo(() => {
    const names: Record<number, string> = {}
    districts.forEach(district => {
      names[district.code] = district.name
    })
    return names
  }, [districts])

  const handleDistrictSelect = (districtCode: number) => {
    const newSelectedDistricts = selectedDistricts.includes(districtCode)
      ? selectedDistricts.filter(d => d !== districtCode)
      : [...selectedDistricts, districtCode]

    setFilters('mapa', { ...filters, selectedDistricts: newSelectedDistricts })
  }

  const handleFiltersChange = (newFilters: typeof filters) => {
    setFilters('mapa', newFilters)
  }

  const handleEventClick = (event: Event) => {
    const eventSlug = event.slug || event.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    router.push(`/event/${event.id}/${eventSlug}`)
  }

  // Filter events based on current filters
  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      // Event category filter
      const eventTypeMatch = filters.eventCategories.length === 0 ||
        event.categories.some(category =>
          filters.eventCategories.includes(category)
        )

      // Date filter (simplified - would need proper date logic)
      let dateMatch = true
      if (filters.dateRange !== 'anytime' && event.date) {
        const eventDate = new Date(event.date)
        const now = new Date()

        switch (filters.dateRange) {
          case 'next_week':
            const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
            dateMatch = eventDate >= now && eventDate <= nextWeek
            break
          case 'next_month':
            const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate())
            dateMatch = eventDate >= now && eventDate <= nextMonth
            break
          case 'next_3_months':
            const next3Months = new Date(now.getFullYear(), now.getMonth() + 3, now.getDate())
            dateMatch = eventDate >= now && eventDate <= next3Months
            break
          case 'next_6_months':
            const next6Months = new Date(now.getFullYear(), now.getMonth() + 6, now.getDate())
            dateMatch = eventDate >= now && eventDate <= next6Months
            break
        }
      }

      // District filter
      const districtMatch = filters.selectedDistricts.length === 0 ||
        (event.district_code && filters.selectedDistricts.includes(event.district_code))

      return eventTypeMatch && dateMatch && districtMatch
    })
  }, [events, filters])

  // Update totalItems when filteredEvents change
  useEffect(() => {
    setPagination(prev => ({
      ...prev,
      totalItems: filteredEvents.length,
      currentPage: prev.currentPage > Math.ceil(filteredEvents.length / prev.itemsPerPage)
        ? 1
        : prev.currentPage
    }))
  }, [filteredEvents.length])

  // Calculate paginated events
  const paginatedEvents = useMemo(() => {
    const startIndex = (pagination.currentPage - 1) * pagination.itemsPerPage
    const endIndex = startIndex + pagination.itemsPerPage
    return filteredEvents.slice(startIndex, endIndex)
  }, [filteredEvents, pagination.currentPage, pagination.itemsPerPage])

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, currentPage: page }))
  }


  if (isMobile) {
    // Mobile layout: stacked vertically
    return (
      <PageLayout savedEventIds={savedEventIds} className="space-y-4">
        <div className="space-y-4 mt-6">
          <MapFilters
            filters={filters}
            onFiltersChange={handleFiltersChange}
            districtNames={districtNames}
          />

          <DistrictMap
            selectedDistricts={selectedDistricts}
            onDistrictSelect={handleDistrictSelect}
            className="h-64 w-full"
          />

          <div>
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

  // Desktop layout: sidebar + map and events side by side
  return (
    <PageLayout savedEventIds={savedEventIds} variant="fullscreen" className="flex overflow-hidden">
      {/* Sidebar with filters */}
      <div className="w-80 border-r bg-background overflow-y-auto">
        <div className="p-6">
          <MapFilters
            filters={filters}
            onFiltersChange={handleFiltersChange}
            districtNames={districtNames}
          />
        </div>
      </div>

      {/* Main content: Map and Events side by side */}
      <div className="flex-1 flex">
        {/* Map - takes up 45% of remaining width */}
        <div className="w-[45%] border-r">
          <DistrictMap
            selectedDistricts={selectedDistricts}
            onDistrictSelect={handleDistrictSelect}
            className="h-full w-full"
          />
        </div>

        {/* Events list - takes up 55% of remaining width */}
        <div className="w-[55%] bg-background flex flex-col">
          <div className="flex-1 overflow-y-auto p-6">
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
      </div>
    </PageLayout>
  )
}
