import { EventType, EventTypeDisplayNames } from "@/lib/types"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"

interface EventTypeFilterProps {
  value: EventType[]
  onChange: (value: EventType[]) => void
}

export function EventTypeFilter({ value, onChange }: EventTypeFilterProps) {
  const handleEventTypeToggle = (eventType: EventType, checked: boolean) => {
    if (checked) {
      onChange([...value, eventType])
    } else {
      onChange(value.filter(type => type !== eventType))
    }
  }

  return (
    <div className="space-y-3">
      <Label>Tipos de evento</Label>
      <div className="grid grid-cols-2 gap-3">
        {Object.values(EventType).map((eventType) => (
          <div key={eventType} className="flex items-center space-x-2">
            <Checkbox
              id={eventType}
              checked={value.includes(eventType)}
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
  )
}