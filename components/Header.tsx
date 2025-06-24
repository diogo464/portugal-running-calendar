'use client'

import { Heart, Map, Calendar, List, Menu, X } from "lucide-react"
import { useRouter, usePathname } from "next/navigation"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/ThemeToggle"

interface HeaderProps {
  savedEventIds: Set<number>
}

export function Header({ savedEventIds }: HeaderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const handleViewSaved = () => {
    router.push('/saved')
    setIsMenuOpen(false)
  }

  const handleViewMap = () => {
    router.push('/map')
    setIsMenuOpen(false)
  }

  const handleViewHome = () => {
    router.push('/')
    setIsMenuOpen(false)
  }

  const handleViewCalendar = () => {
    router.push('/calendar')
    setIsMenuOpen(false)
  }

  const isMapPage = pathname === '/map'
  const isHomePage = pathname === '/'
  const isCalendarPage = pathname === '/calendar'

  return (
    <div className="mb-6">
      {/* Desktop Header */}
      <div className="hidden md:flex items-center justify-between">
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

      {/* Mobile Header */}
      <div className="md:hidden">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold cursor-pointer" onClick={handleViewHome}>
              Run Calendar
            </h1>
            <p className="text-sm text-muted-foreground">
              Eventos de corrida em Portugal
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2"
              aria-label="Toggle menu"
            >
              {isMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="mt-4 p-4 bg-background border rounded-lg shadow-lg">
            <div className="flex flex-col gap-2">
              <Button 
                variant="outline" 
                onClick={isHomePage ? undefined : handleViewHome}
                disabled={isHomePage}
                className={`flex items-center gap-2 justify-start ${isHomePage ? 'bg-muted' : ''}`}
              >
                <List className="h-4 w-4" />
                Lista
              </Button>
              
              <Button 
                variant="outline" 
                onClick={isCalendarPage ? undefined : handleViewCalendar}
                disabled={isCalendarPage}
                className={`flex items-center gap-2 justify-start ${isCalendarPage ? 'bg-muted' : ''}`}
              >
                <Calendar className="h-4 w-4" />
                Calendário
              </Button>
              
              <Button 
                variant="outline" 
                onClick={isMapPage ? undefined : handleViewMap}
                disabled={isMapPage}
                className={`flex items-center gap-2 justify-start ${isMapPage ? 'bg-muted' : ''}`}
              >
                <Map className="h-4 w-4" />
                Mapa
              </Button>
              
              <Button variant="outline" onClick={handleViewSaved} className="flex items-center gap-2 justify-start">
                <Heart className="h-4 w-4" />
                Guardados ({savedEventIds.size})
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}