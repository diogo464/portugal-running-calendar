import { Calendar } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CalendarDay } from "@/components/CalendarDay"
import { Event } from "@/lib/types"
import { getDaysInMonth, getFirstDayOfMonth, monthNames, formatDateKey, isPortugueseHoliday } from "@/lib/utils"

interface CalendarMonthProps {
  monthIndex: number
  year: number
  events: Event[]
  selectedDates: Set<string>
  onDateToggle: (date: Date) => void
}

export function CalendarMonth({
  monthIndex,
  year,
  events,
  selectedDates,
  onDateToggle
}: CalendarMonthProps) {
  const daysInMonth = getDaysInMonth(monthIndex, year)
  const firstDay = getFirstDayOfMonth(monthIndex, year)
  const days = []

  // Group events by date for this month
  const eventsByDate: Record<string, Event[]> = {}
  events.forEach(event => {
    if (event.date) {
      const eventDate = new Date(event.date)
      if (eventDate.getMonth() === monthIndex && eventDate.getFullYear() === year) {
        const dateKey = formatDateKey(eventDate)
        if (!eventsByDate[dateKey]) {
          eventsByDate[dateKey] = []
        }
        eventsByDate[dateKey].push(event)
      }
    }
  })

  // Empty cells for days before the first day of the month
  for (let i = 0; i < firstDay; i++) {
    days.push(<div key={`empty-${i}`} className="h-16 p-1"></div>)
  }

  // Days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, monthIndex, day)
    const dateKey = formatDateKey(date)
    const dayEvents = eventsByDate[dateKey] || []
    const isWeekend = date.getDay() === 0 || date.getDay() === 6
    const { isHoliday, name: holidayName } = isPortugueseHoliday(dateKey, year)
    const isSelected = selectedDates.has(dateKey)

    days.push(
      <CalendarDay
        key={day}
        day={day}
        eventCount={dayEvents.length}
        isWeekend={isWeekend}
        isHoliday={isHoliday}
        holidayName={holidayName}
        isSelected={isSelected}
        onClick={() => onDateToggle(date)}
      />
    )
  }

  return (
    <Card className="col-span-1">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center justify-between">
          {monthNames[monthIndex]} {year}
          <Calendar className="w-4 h-4" />
        </CardTitle>
      </CardHeader>
      <CardContent className="p-2">
        <div className="grid grid-cols-7 gap-0 text-xs font-medium mb-2">
          <div className="text-center p-1">Dom</div>
          <div className="text-center p-1">Seg</div>
          <div className="text-center p-1">Ter</div>
          <div className="text-center p-1">Qua</div>
          <div className="text-center p-1">Qui</div>
          <div className="text-center p-1">Sex</div>
          <div className="text-center p-1">Sáb</div>
        </div>
        <div className="grid grid-cols-7 gap-1">{days}</div>
      </CardContent>
    </Card>
  )
}