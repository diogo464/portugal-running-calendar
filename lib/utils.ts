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
    // Selected dates filter (calendar view) - takes precedence over date range
    if (filters.selectedDates && filters.selectedDates.size > 0) {
      if (event.date) {
        const eventDateString = event.date // Already in YYYY-MM-DD format
        if (!filters.selectedDates.has(eventDateString)) return false
      } else {
        return false // No date means it can't match selected dates
      }
    } else {
      // Regular date range filter (only when no specific dates are selected)
      // Filter out past events
      if (event.date) {
        const eventDate = parseISO(event.date)
        if (isBefore(eventDate, dateStart)) return false
      }
      
      if (dateEnd && event.date) {
        const eventDate = parseISO(event.date)
        if (isAfter(eventDate, dateEnd)) return false
      }
    }

    // Search filter (case insensitive)
    if (filters.search && !event.name.toLowerCase().includes(filters.search.toLowerCase())) {
      return false
    }

    // Event type filter
    if (filters.eventCategories.length > 0) {
      const hasMatchingType = event.categories.some(type =>
        filters.eventCategories.includes(type as never)
      )
      if (!hasMatchingType) return false
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

      if (distanceToEvent < minProximity) return false
      if (maxProximity !== null && distanceToEvent > maxProximity) return false
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

// Portuguese holidays with hardcoded data for years 2023-2027
export function getPortugueseHolidays(year: number): Array<{ date: string; name: string }> {
  const holidaysData: Record<number, Array<{ date: string; name: string }>> = {
    2023: [
      { date: "2023-01-01", name: "Dia de Ano Novo" },
      { date: "2023-02-21", name: "Carnaval" },
      { date: "2023-04-07", name: "Sexta-feira Santa" },
      { date: "2023-04-09", name: "Páscoa" },
      { date: "2023-04-25", name: "Dia da Liberdade" },
      { date: "2023-05-01", name: "Dia do Trabalhador" },
      { date: "2023-06-08", name: "Corpo de Deus" },
      { date: "2023-06-10", name: "Dia de Portugal" },
      { date: "2023-08-15", name: "Assunção de Nossa Senhora" },
      { date: "2023-10-05", name: "Implantação da República Portuguesa" },
      { date: "2023-11-01", name: "Dia de todos os Santos" },
      { date: "2023-12-01", name: "Restauração da Independência" },
      { date: "2023-12-08", name: "Dia da Imaculada Conceição" },
      { date: "2023-12-25", name: "Natal" }
    ],
    2024: [
      { date: "2024-01-01", name: "Dia de Ano Novo" },
      { date: "2024-02-13", name: "Carnaval" },
      { date: "2024-03-29", name: "Sexta-feira Santa" },
      { date: "2024-03-31", name: "Páscoa" },
      { date: "2024-04-25", name: "Dia da Liberdade" },
      { date: "2024-05-01", name: "Dia do Trabalhador" },
      { date: "2024-05-30", name: "Corpo de Deus" },
      { date: "2024-06-10", name: "Dia de Portugal" },
      { date: "2024-08-15", name: "Assunção de Nossa Senhora" },
      { date: "2024-10-05", name: "Implantação da República Portuguesa" },
      { date: "2024-11-01", name: "Dia de todos os Santos" },
      { date: "2024-12-01", name: "Restauração da Independência" },
      { date: "2024-12-08", name: "Dia da Imaculada Conceição" },
      { date: "2024-12-25", name: "Natal" }
    ],
    2025: [
      { date: "2025-01-01", name: "Dia de Ano Novo" },
      { date: "2025-03-04", name: "Carnaval" },
      { date: "2025-04-18", name: "Sexta-feira Santa" },
      { date: "2025-04-20", name: "Páscoa" },
      { date: "2025-04-25", name: "Dia da Liberdade" },
      { date: "2025-05-01", name: "Dia do Trabalhador" },
      { date: "2025-06-10", name: "Dia de Portugal" },
      { date: "2025-06-19", name: "Corpo de Deus" },
      { date: "2025-08-15", name: "Assunção de Nossa Senhora" },
      { date: "2025-10-05", name: "Implantação da República Portuguesa" },
      { date: "2025-11-01", name: "Dia de todos os Santos" },
      { date: "2025-12-01", name: "Restauração da Independência" },
      { date: "2025-12-08", name: "Dia da Imaculada Conceição" },
      { date: "2025-12-25", name: "Natal" }
    ],
    2026: [
      { date: "2026-01-01", name: "Dia de Ano Novo" },
      { date: "2026-02-17", name: "Carnaval" },
      { date: "2026-04-03", name: "Sexta-feira Santa" },
      { date: "2026-04-05", name: "Páscoa" },
      { date: "2026-04-25", name: "Dia da Liberdade" },
      { date: "2026-05-01", name: "Dia do Trabalhador" },
      { date: "2026-06-04", name: "Corpo de Deus" },
      { date: "2026-06-10", name: "Dia de Portugal" },
      { date: "2026-08-15", name: "Assunção de Nossa Senhora" },
      { date: "2026-10-05", name: "Implantação da República Portuguesa" },
      { date: "2026-11-01", name: "Dia de todos os Santos" },
      { date: "2026-12-01", name: "Restauração da Independência" },
      { date: "2026-12-08", name: "Dia da Imaculada Conceição" },
      { date: "2026-12-25", name: "Natal" }
    ],
    2027: [
      { date: "2027-01-01", name: "Dia de Ano Novo" },
      { date: "2027-02-09", name: "Carnaval" },
      { date: "2027-03-26", name: "Sexta-feira Santa" },
      { date: "2027-03-28", name: "Páscoa" },
      { date: "2027-04-25", name: "Dia da Liberdade" },
      { date: "2027-05-01", name: "Dia do Trabalhador" },
      { date: "2027-05-27", name: "Corpo de Deus" },
      { date: "2027-06-10", name: "Dia de Portugal" },
      { date: "2027-08-15", name: "Assunção de Nossa Senhora" },
      { date: "2027-10-05", name: "Implantação da República Portuguesa" },
      { date: "2027-11-01", name: "Dia de todos os Santos" },
      { date: "2027-12-01", name: "Restauração da Independência" },
      { date: "2027-12-08", name: "Dia da Imaculada Conceição" },
      { date: "2027-12-25", name: "Natal" }
    ]
  }

  return holidaysData[year] || []
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

/**
 * Get the site URL with environment-aware defaults
 * Uses NEXT_PUBLIC_SITE_URL environment variable or defaults based on NODE_ENV
 */
export function getSiteUrl(): string {
  // Default based on environment
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:5173'
  }
  const publicUrl = process.env.NEXT_PUBLIC_SITE_URL
  if (publicUrl === undefined)
    throw new Error("NEXT_PUBLIC_SITE_URL not defined");
  return publicUrl;
}
