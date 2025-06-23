'use client'

import { Heart, Map, Calendar, List } from "lucide-react"
import { useRouter, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/ThemeToggle"

interface HeaderProps {
  savedEventIds: Set<number>
}

export function Header({ savedEventIds }: HeaderProps) {
  const router = useRouter()
  const pathname = usePathname()

  const handleViewSaved = () => {
    router.push('/saved')
  }

  const handleViewMap = () => {
    router.push('/map')
  }

  const handleViewHome = () => {
    router.push('/')
  }

  const handleViewCalendar = () => {
    router.push('/calendar')
  }

  const isMapPage = pathname === '/map'
  const isHomePage = pathname === '/'
  const isCalendarPage = pathname === '/calendar'

  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-3xl font-bold cursor-pointer" onClick={handleViewHome}>
          Portugal Run Calendar
        </h1>
        <p className="text-muted-foreground">
          Descubra os próximos eventos de corrida em Portugal
        </p>
      </div>
      
      <div className="flex items-center gap-2">
        <ThemeToggle />
        
        <Button 
          variant="outline" 
          onClick={isHomePage ? undefined : handleViewHome}
          disabled={isHomePage}
          className={`flex items-center gap-2 ${isHomePage ? 'bg-muted' : ''}`}
        >
          <List className="h-4 w-4" />
          Lista
        </Button>
        
        <Button 
          variant="outline" 
          onClick={isCalendarPage ? undefined : handleViewCalendar}
          disabled={isCalendarPage}
          className={`flex items-center gap-2 ${isCalendarPage ? 'bg-muted' : ''}`}
        >
          <Calendar className="h-4 w-4" />
          Calendário
        </Button>
        
        <Button 
          variant="outline" 
          onClick={isMapPage ? undefined : handleViewMap}
          disabled={isMapPage}
          className={`flex items-center gap-2 ${isMapPage ? 'bg-muted' : ''}`}
        >
          <Map className="h-4 w-4" />
          Mapa
        </Button>
        
        <Button variant="outline" onClick={handleViewSaved} className="flex items-center gap-2">
          <Heart className="h-4 w-4" />
          Guardados ({savedEventIds.size})
        </Button>
      </div>
    </div>
  )
}