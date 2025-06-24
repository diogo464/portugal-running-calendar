import { getEventDensityColor } from "@/lib/utils"

interface CalendarDayProps {
  day: number
  eventCount: number
  isWeekend: boolean
  isHoliday: boolean
  holidayName?: string
  isSelected: boolean
  onClick: () => void
}

export function CalendarDay({
  day,
  eventCount,
  isWeekend,
  isHoliday,
  holidayName,
  isSelected,
  onClick
}: CalendarDayProps) {
  const colorClass = getEventDensityColor(eventCount, isWeekend, isHoliday)
  
  const title = [
    `${eventCount} evento${eventCount !== 1 ? 's' : ''}`,
    holidayName && `${holidayName}`,
    isSelected && '(Selecionado)'
  ].filter(Boolean).join(' - ')

  return (
    <div
      className={`h-16 p-1 border-2 ${colorClass} rounded-sm relative group cursor-pointer transition-all hover:scale-105 ${
        isSelected
          ? "border-white shadow-lg ring-2 ring-blue-600 ring-offset-1"
          : "border-border hover:border-gray-400"
      }`}
      title={title}
      onClick={onClick}
    >
      <div className="text-sm font-medium">{day}</div>
      {eventCount > 0 && <div className="text-xs mt-1">{eventCount}</div>}
      {isHoliday && <div className="absolute top-0 right-0 w-2 h-2 bg-yellow-400 rounded-full"></div>}
      {isSelected && (
        <div className="absolute top-0 left-0 w-3 h-3 bg-blue-600 rounded-full flex items-center justify-center">
          <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
        </div>
      )}
    </div>
  )
}