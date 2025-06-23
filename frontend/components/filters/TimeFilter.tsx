import { EventFilters } from "@/lib/types"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface TimeFilterProps {
  value: EventFilters['dateRange']
  onChange: (value: EventFilters['dateRange']) => void
}

export function TimeFilter({ value, onChange }: TimeFilterProps) {
  return (
    <div className="space-y-2">
      <Label>Período</Label>
      <Select value={value} onValueChange={onChange}>
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
  )
}