import { EventFilters, Event } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DistanceFilter } from "@/components/filters/DistanceFilter"
import { TimeFilter } from "@/components/filters/TimeFilter"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { X } from "lucide-react"

interface MapFiltersProps {
  filters: {
    distanceRange: [number, number | null]
    dateRange: EventFilters['dateRange']
    selectedDistricts: number[]
  }
  onFiltersChange: (filters: {
    distanceRange: [number, number | null]
    dateRange: EventFilters['dateRange']
    selectedDistricts: number[]
  }) => void
  events: Event[]
  districtNames: Record<number, string>
}

export function MapFilters({ 
  filters, 
  onFiltersChange, 
  events, 
  districtNames 
}: MapFiltersProps) {
  
  const handleDistanceChange = (distanceRange: [number, number | null]) => {
    onFiltersChange({ ...filters, distanceRange })
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

  const filteredEventsCount = events.filter(event => {
    // Apply filters similar to main page logic
    const distanceMatch = event.distances.some(distance => {
      const [min, max] = filters.distanceRange
      return distance >= min && (max === null || distance <= max)
    })

    // Date filter logic would go here (simplified for now)
    const dateMatch = true // Implement date filtering based on event dates

    // District filter
    const districtMatch = filters.selectedDistricts.length === 0 || 
      (event.district_code && filters.selectedDistricts.includes(event.district_code))

    return distanceMatch && dateMatch && districtMatch
  }).length

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <DistanceFilter
            value={filters.distanceRange}
            onChange={handleDistanceChange}
          />
          
          <TimeFilter
            value={filters.dateRange}
            onChange={handleDateRangeChange}
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

      {/* Results Summary */}
      <Card>
        <CardContent className="pt-6">
          <div className="text-sm text-muted-foreground text-center">
            <span className="font-medium text-foreground">{filteredEventsCount}</span> eventos encontrados
          </div>
        </CardContent>
      </Card>
    </div>
  )
}