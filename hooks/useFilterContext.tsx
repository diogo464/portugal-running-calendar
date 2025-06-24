'use client'

import React, { createContext, useContext, useState, ReactNode } from 'react'
import { EventFilters, EventType } from '@/lib/types'

// Map filters for simplified map page
interface MapFilters {
  eventTypes: EventType[]
  dateRange: EventFilters['dateRange']
  selectedDistricts: number[]
}

// Page-specific filter states
interface FilterStates {
  lista: EventFilters
  calendario: EventFilters
  mapa: MapFilters
}

interface FilterContextType {
  filterStates: FilterStates
  getFilters: (page: keyof FilterStates) => FilterStates[keyof FilterStates]
  setFilters: <T extends keyof FilterStates>(page: T, filters: FilterStates[T]) => void
}

// Default filter states
const defaultListaFilters: EventFilters = {
  search: "",
  eventTypes: [],
  distanceRange: [0, null],
  dateRange: "anytime",
  proximityRange: [0, null],
  proximityCenter: null,
  showEventsWithoutLocation: true
}

const defaultCalendarioFilters: EventFilters = {
  search: "",
  eventTypes: [],
  distanceRange: [0, null],
  dateRange: "anytime",
  proximityRange: [0, null],
  proximityCenter: null,
  showEventsWithoutLocation: true,
  selectedDates: new Set<string>()
}

const defaultMapaFilters: MapFilters = {
  eventTypes: [],
  dateRange: 'anytime',
  selectedDistricts: []
}

const FilterContext = createContext<FilterContextType | undefined>(undefined)

export function FilterProvider({ children }: { children: ReactNode }) {
  const [filterStates, setFilterStates] = useState<FilterStates>({
    lista: defaultListaFilters,
    calendario: defaultCalendarioFilters,
    mapa: defaultMapaFilters
  })

  const getFilters = (page: keyof FilterStates) => {
    return filterStates[page]
  }

  const setFilters = <T extends keyof FilterStates>(page: T, filters: FilterStates[T]) => {
    setFilterStates(prev => ({
      ...prev,
      [page]: filters
    }))
  }

  return (
    <FilterContext.Provider value={{ filterStates, getFilters, setFilters }}>
      {children}
    </FilterContext.Provider>
  )
}

export function useFilterContext() {
  const context = useContext(FilterContext)
  if (context === undefined) {
    throw new Error('useFilterContext must be used within a FilterProvider')
  }
  return context
}