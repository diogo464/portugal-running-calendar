import { Card, CardContent } from "@/components/ui/card"
import { Event } from "@/lib/types"

interface CalendarStatsProps {
  events: Event[]
  year: number
}

export function CalendarStats({ events, year }: CalendarStatsProps) {
  // Filter events for the current year
  const yearEvents = events.filter(event => {
    if (!event.date) return false
    const eventDate = new Date(event.date)
    return eventDate.getFullYear() === year
  })

  const totalEvents = yearEvents.length
  
  const weekendEvents = yearEvents.filter(event => {
    if (!event.date) return false
    const eventDate = new Date(event.date)
    const dayOfWeek = eventDate.getDay()
    return dayOfWeek === 0 || dayOfWeek === 6 // Sunday or Saturday
  }).length

  const weekdayEvents = totalEvents - weekendEvents

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <Card>
        <CardContent className="p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{totalEvents.toLocaleString()}</div>
          <div className="text-sm text-muted-foreground">Total de Eventos</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4 text-center">
          <div className="text-2xl font-bold text-blue-500">{weekendEvents.toLocaleString()}</div>
          <div className="text-sm text-muted-foreground">
            Eventos de Fim de Semana {totalEvents > 0 && `(${Math.round((weekendEvents / totalEvents) * 100)}%)`}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4 text-center">
          <div className="text-2xl font-bold text-gray-500">{weekdayEvents.toLocaleString()}</div>
          <div className="text-sm text-muted-foreground">
            Eventos de Dia de Semana {totalEvents > 0 && `(${Math.round((weekdayEvents / totalEvents) * 100)}%)`}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}