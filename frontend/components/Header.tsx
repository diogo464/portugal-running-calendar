'use client'

import { Heart, Map, Calendar } from "lucide-react"
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
          {isMapPage 
            ? 'Mapa de Eventos' 
            : isCalendarPage 
              ? 'Calendário de Eventos'
              : 'Eventos de Corrida'
          }
        </h1>
        <p className="text-muted-foreground">
          {isMapPage 
            ? 'Explore eventos por distrito no mapa interativo'
            : isCalendarPage
              ? 'Visualize eventos no calendário anual e filtre por datas'
              : 'Descubra os próximos eventos de corrida em Portugal'
          }
        </p>
      </div>
      
      <div className="flex items-center gap-2">
        <ThemeToggle />
        
        {!isCalendarPage && (
          <Button variant="outline" onClick={handleViewCalendar} className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Calendário
          </Button>
        )}
        
        {!isMapPage && (
          <Button variant="outline" onClick={handleViewMap} className="flex items-center gap-2">
            <Map className="h-4 w-4" />
            Mapa
          </Button>
        )}
        
        {!isHomePage && (
          <Button variant="outline" onClick={handleViewHome} className="flex items-center gap-2">
            Lista
          </Button>
        )}
        
        <Button variant="outline" onClick={handleViewSaved} className="flex items-center gap-2">
          <Heart className="h-4 w-4" />
          Guardados ({savedEventIds.size})
        </Button>
      </div>
    </div>
  )
}