import { useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { CalendarMonth } from "@/components/CalendarMonth"
import { CalendarLegend } from "@/components/CalendarLegend"
import { CalendarStats } from "@/components/CalendarStats"
import { Event } from "@/lib/types"
import { formatDateKey } from "@/lib/utils"

interface YearlyCalendarProps {
  events: Event[]
  selectedDates: Set<string>
  onDateSelectionChange: (selectedDates: Set<string>) => void
}

export function YearlyCalendar({ events, selectedDates, onDateSelectionChange }: YearlyCalendarProps) {
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())

  const handleDateToggle = (date: Date) => {
    const dateKey = formatDateKey(date)
    const newSelected = new Set(selectedDates)

    if (newSelected.has(dateKey)) {
      newSelected.delete(dateKey)
    } else {
      newSelected.add(dateKey)
    }

    onDateSelectionChange(newSelected)
  }

  const clearSelection = () => {
    onDateSelectionChange(new Set())
  }

  return (
    <div className="space-y-6">
      {/* Year navigation */}
      <div className="flex items-center justify-between">
        <Button 
          variant="outline" 
          onClick={() => setCurrentYear(currentYear - 1)} 
          className="flex items-center gap-2"
        >
          <ChevronLeft className="w-4 h-4" />
          {currentYear - 1}
        </Button>
        <h2 className="text-2xl font-bold">Calendário {currentYear}</h2>
        <Button 
          variant="outline" 
          onClick={() => setCurrentYear(currentYear + 1)} 
          className="flex items-center gap-2"
        >
          {currentYear + 1}
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Statistics */}
      <CalendarStats events={events} year={currentYear} />

      {/* Selected days info */}
      {selectedDates.size > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">Dias Selecionados ({selectedDates.size})</h3>
            <Button variant="outline" size="sm" onClick={clearSelection}>
              Limpar Seleção
            </Button>
          </div>
          <div className="text-sm text-muted-foreground">
            Clique nos dias do calendário para selecionar/desselecionar datas. Os eventos serão filtrados pelos dias selecionados.
          </div>
        </Card>
      )}

      {/* Legend */}
      <CalendarLegend />

      {/* Calendar grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 12 }, (_, i) => (
          <CalendarMonth
            key={i}
            monthIndex={i}
            year={currentYear}
            events={events}
            selectedDates={selectedDates}
            onDateToggle={handleDateToggle}
          />
        ))}
      </div>

      <div className="text-center text-sm text-muted-foreground">
        <p>Passe o cursor sobre as datas para ver o número de eventos. Clique para selecionar datas.</p>
        <p>Períodos de maior atividade: Primavera (Março-Maio) e Outono (Setembro-Novembro)</p>
      </div>
    </div>
  )
}