import { useState } from "react"
import { Search } from "lucide-react"
import { EventType, EventTypeDisplayNames, EventFilters as IEventFilters } from "@/lib/types"
import { formatDistance } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface EventFiltersProps {
  filters: IEventFilters
  onFiltersChange: (filters: IEventFilters) => void
}

export function EventFilters({ filters, onFiltersChange }: EventFiltersProps) {
  const [distanceValues, setDistanceValues] = useState<number[]>([
    filters.distanceRange[0],
    filters.distanceRange[1] || 30000
  ])

  const handleSearchChange = (value: string) => {
    onFiltersChange({ ...filters, search: value })
  }

  const handleEventTypeToggle = (eventType: EventType, checked: boolean) => {
    const newEventTypes = checked
      ? [...filters.eventTypes, eventType]
      : filters.eventTypes.filter(type => type !== eventType)
    
    onFiltersChange({ ...filters, eventTypes: newEventTypes })
  }

  const handleDistanceChange = (values: number[]) => {
    setDistanceValues(values)
    const [min, max] = values
    onFiltersChange({
      ...filters,
      distanceRange: [min, max === 30000 ? null : max]
    })
  }

  const handleDateRangeChange = (value: IEventFilters['dateRange']) => {
    onFiltersChange({ ...filters, dateRange: value })
  }

  const formatDistanceValue = (value: number) => {
    if (value >= 30000) return "∞"
    return formatDistance(value)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Filtros</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Search */}
        <div className="space-y-2">
          <Label htmlFor="search">Pesquisar eventos</Label>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="search"
              placeholder="Nome do evento..."
              value={filters.search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Event Types */}
        <div className="space-y-3">
          <Label>Tipos de evento</Label>
          <div className="grid grid-cols-2 gap-3">
            {Object.values(EventType).map((eventType) => (
              <div key={eventType} className="flex items-center space-x-2">
                <Checkbox
                  id={eventType}
                  checked={filters.eventTypes.includes(eventType)}
                  onCheckedChange={(checked) => 
                    handleEventTypeToggle(eventType, checked as boolean)
                  }
                />
                <Label 
                  htmlFor={eventType}
                  className="text-sm cursor-pointer"
                >
                  {EventTypeDisplayNames[eventType]}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Distance Range */}
        <div className="space-y-3">
          <Label>Distância</Label>
          <div className="px-2">
            <Slider
              value={distanceValues}
              onValueChange={handleDistanceChange}
              max={30000}
              min={0}
              step={1000}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>{formatDistanceValue(distanceValues[0])}</span>
              <span>{formatDistanceValue(distanceValues[1])}</span>
            </div>
          </div>
        </div>

        {/* Date Range */}
        <div className="space-y-2">
          <Label>Período</Label>
          <Select value={filters.dateRange} onValueChange={handleDateRangeChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="anytime">Qualquer altura</SelectItem>
              <SelectItem value="next_week">Próxima semana</SelectItem>
              <SelectItem value="next_month">Próximo mês</SelectItem>
              <SelectItem value="next_3_months">Próximos 3 meses</SelectItem>
              <SelectItem value="next_6_months">Próximos 6 meses</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  )
}