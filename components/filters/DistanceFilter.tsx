import { useState } from "react"
import { formatDistance } from "@/lib/utils"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"

interface DistanceFilterProps {
  value: [number, number | null]
  onChange: (value: [number, number | null]) => void
  maxDistance?: number
}

export function DistanceFilter({ 
  value, 
  onChange, 
  maxDistance = 30000 
}: DistanceFilterProps) {
  const [localValues, setLocalValues] = useState<number[]>([
    value[0],
    value[1] || maxDistance
  ])

  const handleDistanceChange = (values: number[]) => {
    const [min, max] = values
    const constrainedValues = [
      Math.min(min, max),
      Math.max(min, max)
    ]
    setLocalValues(constrainedValues)
    onChange([
      constrainedValues[0], 
      constrainedValues[1] === maxDistance ? null : constrainedValues[1]
    ])
  }

  const formatDistanceValue = (value: number) => {
    if (value >= maxDistance) return "∞"
    return formatDistance(value)
  }

  return (
    <div className="space-y-3">
      <Label>Distância</Label>
      <div className="px-2 pt-2">
        <Slider
          value={localValues}
          onValueChange={handleDistanceChange}
          max={maxDistance}
          min={0}
          step={1000}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>{formatDistanceValue(localValues[0])}</span>
          <span>{formatDistanceValue(localValues[1])}</span>
        </div>
      </div>
    </div>
  )
}