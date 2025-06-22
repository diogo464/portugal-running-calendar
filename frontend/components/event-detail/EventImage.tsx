import { Card, CardContent } from "@/components/ui/card"

interface EventImageProps {
  images: string[]
  eventName: string
}

export function EventImage({ images, eventName }: EventImageProps) {
  if (images.length === 0) {
    return null
  }

  return (
    <Card>
      <CardContent className="p-0">
        <img
          src={`/${images[0]}`}
          alt={eventName}
          className="w-full h-64 object-cover rounded-lg"
          onError={(e) => {
            e.currentTarget.style.display = 'none'
          }}
        />
      </CardContent>
    </Card>
  )
}