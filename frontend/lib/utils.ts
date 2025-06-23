import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { addMonths, addWeeks, isAfter, isBefore, parseISO } from "date-fns"
import { Event, EventFilters, Coordinates } from "./types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDistance(meters: number): string {
  if (meters >= 1000) {
    const km = meters / 1000
    return km % 1 === 0 ? `${km}km` : `${km.toFixed(1)}km`
  }
  return `${meters}m`
}

export function formatDate(dateString: string | null): string {
  if (!dateString) return "Data não disponível"
  
  try {
    const date = parseISO(dateString)
    return new Intl.DateTimeFormat('pt-PT', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(date)
  } catch {
    return "Data inválida"
  }
}

export function formatDateRange(startDate: string | null, endDate: string | null): string {
  if (!startDate) return "Datas não disponíveis"
  
  const start = formatDate(startDate)
  if (!endDate || startDate === endDate) return start
  
  const end = formatDate(endDate)
  return `${start} - ${end}`
}

export function getDateRangeFilter(range: EventFilters['dateRange']): { start: Date; end: Date | null } {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  switch (range) {
    case 'next_week':
      return { start: today, end: addWeeks(today, 1) }
    case 'next_month':
      return { start: today, end: addMonths(today, 1) }
    case 'next_3_months':
      return { start: today, end: addMonths(today, 3) }
    case 'next_6_months':
      return { start: today, end: addMonths(today, 6) }
    case 'anytime':
    default:
      return { start: today, end: null }
  }
}

export function filterEvents(events: Event[], filters: EventFilters): Event[] {
  const { start: dateStart, end: dateEnd } = getDateRangeFilter(filters.dateRange)
  
  return events.filter(event => {
    // Filter out past events
    if (event.start_date) {
      const eventDate = parseISO(event.start_date)
      if (isBefore(eventDate, dateStart)) return false
    }
    
    // Selected dates filter (calendar view) - takes precedence over date range
    if (filters.selectedDates && filters.selectedDates.size > 0) {
      if (event.start_date) {
        const eventDateString = event.start_date // Already in YYYY-MM-DD format
        if (!filters.selectedDates.has(eventDateString)) return false
      } else {
        return false // No date means it can't match selected dates
      }
    } else {
      // Regular date range filter (only when no specific dates are selected)
      if (dateEnd && event.start_date) {
        const eventDate = parseISO(event.start_date)
        if (isAfter(eventDate, dateEnd)) return false
      }
    }
    
    // Search filter (case insensitive)
    if (filters.search && !event.name.toLowerCase().includes(filters.search.toLowerCase())) {
      return false
    }
    
    // Event type filter
    if (filters.eventTypes.length > 0) {
      const hasMatchingType = event.types.some(type => 
        filters.eventTypes.includes(type as never)
      )
      if (!hasMatchingType) return false
    }
    
    // Distance filter
    const [minDistance, maxDistance] = filters.distanceRange
    if (event.distances.length > 0) {
      const hasMatchingDistance = event.distances.some(distance => {
        if (distance < minDistance) return false
        if (maxDistance !== null && distance > maxDistance) return false
        return true
      })
      if (!hasMatchingDistance) return false
    }
    
    // Proximity filter
    if (filters.proximityCenter) {
      const [minProximity, maxProximity] = filters.proximityRange
      
      if (!event.coordinates) {
        // Event has no location - only show if the checkbox is checked
        return filters.showEventsWithoutLocation
      }
      
      // Calculate distance from user to event
      const distanceToEvent = calculateDistance(filters.proximityCenter, event.coordinates)
      
      if (distanceToEvent < minProximity * 1000) return false // Convert km to meters
      if (maxProximity !== null && distanceToEvent > maxProximity * 1000) return false
    }
    
    return true
  })
}

export function paginate<T>(items: T[], page: number, itemsPerPage: number): T[] {
  const startIndex = (page - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  return items.slice(startIndex, endIndex)
}

export function getTotalPages(totalItems: number, itemsPerPage: number): number {
  return Math.ceil(totalItems / itemsPerPage)
}

/**
 * Calculate the distance between two coordinates using the Haversine formula
 * @param from Starting coordinates
 * @param to Destination coordinates
 * @returns Distance in meters
 */
export function calculateDistance(from: Coordinates, to: Coordinates): number {
  const R = 6371000 // Earth's radius in meters
  const φ1 = (from.lat * Math.PI) / 180
  const φ2 = (to.lat * Math.PI) / 180
  const Δφ = ((to.lat - from.lat) * Math.PI) / 180
  const Δλ = ((to.lon - from.lon) * Math.PI) / 180

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c
}

/**
 * Format distance for display (converts meters to km when appropriate)
 */
export function formatDistanceFromMeters(meters: number): string {
  if (meters >= 1000) {
    const km = meters / 1000
    return `${Math.round(km)}km`
  }
  return `${Math.round(meters)}m`
}

/**
 * Calendar utility functions
 */

// Portuguese holidays (dummy implementation - every 40 days)
export function getPortugueseHolidays(year: number): Array<{ date: string; name: string }> {
  const holidays: Array<{ date: string; name: string }> = []
  
  // Add a holiday every 40 days (dummy implementation)
  for (let i = 0; i < 365; i += 40) {
    const holidayDate = new Date(year, 0, 1 + i)
    if (holidayDate.getFullYear() === year) {
      const dateString = holidayDate.toISOString().split('T')[0]
      holidays.push({
        date: dateString,
        name: `Feriado ${Math.floor(i / 40) + 1}`
      })
    }
  }
  
  return holidays
}

// Check if a date is a Portuguese holiday
export function isPortugueseHoliday(date: string, year: number): { isHoliday: boolean; name?: string } {
  const holidays = getPortugueseHolidays(year)
  const holiday = holidays.find(h => h.date === date)
  return {
    isHoliday: !!holiday,
    name: holiday?.name
  }
}

// Get event density color based on count and day type
export function getEventDensityColor(count: number, isWeekend: boolean, isHoliday: boolean): string {
  if (isHoliday) {
    return "bg-red-500 text-white" // Holiday events
  }

  if (isWeekend) {
    if (count >= 10) return "bg-blue-600 text-white"
    if (count >= 5) return "bg-blue-500 text-white"
    if (count >= 2) return "bg-blue-400 text-white"
    if (count >= 1) return "bg-blue-300 text-gray-800"
    return "bg-gray-100 text-gray-600"
  } else {
    if (count >= 5) return "bg-gray-500 text-white"
    if (count >= 3) return "bg-gray-400 text-white"
    if (count >= 1) return "bg-gray-300 text-gray-800"
    return "bg-gray-100 text-gray-600"
  }
}

// Format date key for calendar selection
export function formatDateKey(date: Date): string {
  return date.toISOString().split('T')[0] // YYYY-MM-DD format
}

// Get days in month
export function getDaysInMonth(month: number, year: number): number {
  return new Date(year, month + 1, 0).getDate()
}

// Get first day of month (0 = Sunday, 1 = Monday, etc.)
export function getFirstDayOfMonth(month: number, year: number): number {
  return new Date(year, month, 1).getDay()
}

// Month names in Portuguese
export const monthNames = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
]