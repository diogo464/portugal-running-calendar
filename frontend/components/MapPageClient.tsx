'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Event, EventFilters, PaginationState } from '@/lib/types'
import { validateDistrictsFile } from '@/lib/district-types'
import { DistrictMap } from '@/components/DistrictMap'
import { MapFilters } from '@/components/MapFilters'
import { EventList } from '@/components/EventList'
import { Header } from '@/components/Header'
import { useBreakpoint } from '@/hooks/useBreakpoint'
import { useSavedEvents } from '@/hooks/useSavedEvents'

interface MapPageClientProps {
  initialEvents: Event[]
}


export function MapPageClient({ initialEvents }: MapPageClientProps) {
  const [events] = useState<Event[]>(initialEvents)
  const [selectedDistricts, setSelectedDistricts] = useState<number[]>([])
  const [districtNames, setDistrictNames] = useState<Record<number, string>>({})
  const [filters, setFilters] = useState({
    distanceRange: [0, null] as [number, number | null],
    dateRange: 'anytime' as EventFilters['dateRange'],
    selectedDistricts: [] as number[]
  })
  
  const { isMobile } = useBreakpoint()
  const { savedEventIds, toggleSave } = useSavedEvents()
  const router = useRouter()
  
  const [pagination, setPagination] = useState<PaginationState>({
    currentPage: 1,
    itemsPerPage: 12,
    totalItems: 0
  })

  // Load district names
  useEffect(() => {
    const loadDistrictNames = async () => {
      try {
        const response = await fetch('/opt_districts.json')
        const rawData = await response.json()
        const data = validateDistrictsFile(rawData)
        const names: Record<number, string> = {}
        Object.values(data).forEach(district => {
          names[district.code] = district.name
        })
        setDistrictNames(names)
      } catch (error) {
        console.error('Failed to load district names:', error)
      }
    }

    loadDistrictNames()
  }, [])

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

  if (isMobile) {
    // Mobile layout: stacked vertically
    return (
      <div className="container mx-auto p-4 space-y-4">
        <Header savedEventIds={savedEventIds} />
        
        <div className="space-y-4">
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
      </div>
    )
  }

  // Desktop layout: sidebar + map + events
  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="border-b bg-background">
        <div className="container mx-auto px-6 py-4">
          <Header savedEventIds={savedEventIds} />
        </div>
      </div>
      
      {/* Main content */}
      <div className="flex-1 flex">
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

      {/* Main content: Map and Events */}
      <div className="flex-1 flex flex-col">
        {/* Map */}
        <div className="flex-1">
          <DistrictMap
            selectedDistricts={selectedDistricts}
            onDistrictSelect={handleDistrictSelect}
            className="h-full w-full"
          />
        </div>

        {/* Events list */}
        <div className="h-80 border-t bg-background overflow-y-auto">
          <div className="p-6">
            <h2 className="text-lg font-semibold mb-4">
              Eventos Encontrados ({filteredEvents.length})
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
      </div>
      </div>
    </div>
  )
}