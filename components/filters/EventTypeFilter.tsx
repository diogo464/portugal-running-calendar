import { EventCategory, EventCategoryDisplayName } from "@/lib/types"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"

interface EventTypeFilterProps {
  value: EventCategory[]
  onChange: (value: EventCategory[]) => void
}

export function EventTypeFilter({ value, onChange }: EventTypeFilterProps) {
  const handleEventTypeToggle = (eventType: EventCategory, checked: boolean) => {
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
        {Object.values(EventCategory).map((eventType) => (
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
              {EventCategoryDisplayName[eventType]}
            </Label>
          </div>
        ))}
      </div>
    </div>
  )
}