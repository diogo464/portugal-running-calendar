'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Event, EventFilters, PaginationState } from '@/lib/types'
import { useDistricts } from '@/hooks/useDistricts'
import { useUpcomingEvents } from '@/hooks/useUpcomingEvents'
import { DistrictMap } from '@/components/DistrictMap'
import { MapFilters } from '@/components/MapFilters'
import { EventList } from '@/components/EventList'
import { PageLayout } from '@/components/PageLayout'
import { useBreakpoint } from '@/hooks/useBreakpoint'
import { useSavedEvents } from '@/hooks/useSavedEvents'

interface MapPageClientProps {
  initialEvents: Event[]
}


export function MapPageClient({ initialEvents }: MapPageClientProps) {
  const { events: upcomingEvents, loading, error } = useUpcomingEvents()
  // Use server-rendered events initially, then client-side events once loaded
  const events = loading ? initialEvents : upcomingEvents
  
  const [selectedDistricts, setSelectedDistricts] = useState<number[]>([])
  const [filters, setFilters] = useState({
    distanceRange: [0, null] as [number, number | null],
    dateRange: 'anytime' as EventFilters['dateRange'],
    selectedDistricts: [] as number[]
  })

  const { districts } = useDistricts()
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

  // Update filters when districts change
  useEffect(() => {
    setFilters(prev => ({ ...prev, selectedDistricts }))
  }, [selectedDistricts])


  const handleDistrictSelect = (districtCode: number) => {
    setSelectedDistricts(prev => {
      if (prev.includes(districtCode)) {
        return prev.filter(d => d !== districtCode)
      } else {
        return [...prev, districtCode]
      }
    })
  }

  const handleFiltersChange = (newFilters: typeof filters) => {
    setFilters(newFilters)
    setSelectedDistricts(newFilters.selectedDistricts)
  }

  const handleEventClick = (event: Event) => {
    const eventSlug = event.slug || event.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    router.push(`/event/${event.id}/${eventSlug}`)
  }

  // Filter events based on current filters
  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      // Distance filter
      const distanceMatch = event.distances.some(distance => {
        const [min, max] = filters.distanceRange
        return distance >= min && (max === null || distance <= max)
      })

      // Date filter (simplified - would need proper date logic)
      let dateMatch = true
      if (filters.dateRange !== 'anytime' && event.start_date) {
        const eventDate = new Date(event.start_date)
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

      return distanceMatch && dateMatch && districtMatch
    })
  }, [events, filters])

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, currentPage: page }))
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

  if (isMobile) {
    // Mobile layout: stacked vertically
    return (
      <PageLayout savedEventIds={savedEventIds} className="space-y-4">
        <div className="space-y-4 mt-6">
          <MapFilters
            filters={filters}
            onFiltersChange={handleFiltersChange}
            events={events}
            districtNames={districtNames}
          />

          <DistrictMap
            selectedDistricts={selectedDistricts}
            onDistrictSelect={handleDistrictSelect}
            className="h-64 w-full"
          />

          <div>
            <h2 className="text-lg font-semibold mb-3">
              Eventos ({filteredEvents.length})
            </h2>
            <EventList
              events={filteredEvents}
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
            events={events}
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
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold">
              Eventos Encontrados ({filteredEvents.length})
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            <EventList
              events={filteredEvents}
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