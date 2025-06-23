import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"

interface EventImageProps {
  images: string[]
  eventName: string
  onFullscreenChange?: (isFullscreen: boolean) => void
}

export function EventImage({ images, eventName, onFullscreenChange }: EventImageProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false)
      }
    }

    if (isFullscreen) {
      document.body.style.overflow = 'hidden'
      document.addEventListener('keydown', handleEscape)
    } else {
      document.body.style.overflow = 'unset'
    }

    onFullscreenChange?.(isFullscreen)

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isFullscreen])

  if (images.length === 0) {
    return null
  }

  const handleImageClick = () => {
    const newFullscreenState = !isFullscreen
    setIsFullscreen(newFullscreenState)
    onFullscreenChange?.(newFullscreenState)
  }

  return (
    <>
      <Card>
        <CardContent className="p-0">
          <img
            src={`/${images[0]}`}
            alt={eventName}
            className="w-full h-64 object-cover rounded-lg cursor-pointer transition-opacity duration-200 hover:opacity-90"
            onClick={handleImageClick}
            onError={(e) => {
              e.currentTarget.style.display = 'none'
            }}
          />
        </CardContent>
      </Card>

      {isFullscreen && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center transition-opacity duration-200 ease-out"
          onClick={handleImageClick}
        >
          <img
            src={`/${images[0]}`}
            alt={eventName}
            className="max-w-full max-h-full object-contain cursor-pointer transition-transform duration-200 ease-out scale-100"
            onClick={handleImageClick}
          />
        </div>
      )}
    </>
  )
}