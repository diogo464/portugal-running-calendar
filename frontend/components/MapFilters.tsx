import { EventFilters, EventType } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TimeFilter } from "@/components/filters/TimeFilter"
import { EventTypeFilter } from "@/components/filters/EventTypeFilter"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { X } from "lucide-react"

interface MapFiltersProps {
  filters: {
    eventTypes: EventType[]
    dateRange: EventFilters['dateRange']
    selectedDistricts: number[]
  }
  onFiltersChange: (filters: {
    eventTypes: EventType[]
    dateRange: EventFilters['dateRange']
    selectedDistricts: number[]
  }) => void
  districtNames: Record<number, string>
}

export function MapFilters({ 
  filters, 
  onFiltersChange, 
  districtNames 
}: MapFiltersProps) {
  
  const handleEventTypesChange = (eventTypes: EventType[]) => {
    onFiltersChange({ ...filters, eventTypes })
  }

  const handleDateRangeChange = (dateRange: EventFilters['dateRange']) => {
    onFiltersChange({ ...filters, dateRange })
  }

  const handleDistrictRemove = (districtCode: number) => {
    const newSelectedDistricts = filters.selectedDistricts.filter(d => d !== districtCode)
    onFiltersChange({ ...filters, selectedDistricts: newSelectedDistricts })
  }

  const handleClearAllDistricts = () => {
    onFiltersChange({ ...filters, selectedDistricts: [] })
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <TimeFilter
            value={filters.dateRange}
            onChange={handleDateRangeChange}
          />
          
          <EventTypeFilter
            value={filters.eventTypes}
            onChange={handleEventTypesChange}
          />
        </CardContent>
      </Card>

      {/* Selected Districts */}
      {filters.selectedDistricts.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Distritos Selecionados</CardTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleClearAllDistricts}
                className="text-xs h-auto p-1"
              >
                Limpar todos
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-2">
              {filters.selectedDistricts.map(districtCode => (
                <Badge 
                  key={districtCode} 
                  variant="secondary" 
                  className="flex items-center gap-1"
                >
                  {districtNames[districtCode] || `Distrito ${districtCode}`}
                  <X 
                    className="h-3 w-3 cursor-pointer hover:text-red-500" 
                    onClick={() => handleDistrictRemove(districtCode)}
                  />
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}