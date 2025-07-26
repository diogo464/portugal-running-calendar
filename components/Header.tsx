'use client'

import { Heart, Map, Calendar, List, Menu, X } from "lucide-react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/ThemeToggle"

interface HeaderProps {
  savedEventIds: Set<number>
}

export function Header({ savedEventIds }: HeaderProps) {
  const pathname = usePathname()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const isMapPage = pathname === '/map'
  const isHomePage = pathname === '/'
  const isCalendarPage = pathname === '/calendar'

  return (
    <div className="mb-6">
      {/* Desktop Header */}
      <div className="hidden md:flex items-center justify-between">
        <div>
          <Link href="/">
            <h1 className="text-3xl font-bold cursor-pointer">
              Portugal Run Calendar
            </h1>
          </Link>
          <p className="text-muted-foreground">
            Descubra os próximos eventos de corrida em Portugal
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <ThemeToggle />
          
          {isHomePage ? (
            <Button 
              variant="outline" 
              disabled
              className="flex items-center gap-2 bg-muted"
            >
              <List className="h-4 w-4" />
              Lista
            </Button>
          ) : (
            <Link href="/">
              <Button 
                variant="outline" 
                className="flex items-center gap-2"
              >
                <List className="h-4 w-4" />
                Lista
              </Button>
            </Link>
          )}
          
          {isCalendarPage ? (
            <Button 
              variant="outline" 
              disabled
              className="flex items-center gap-2 bg-muted"
            >
              <Calendar className="h-4 w-4" />
              Calendário
            </Button>
          ) : (
            <Link href="/calendar">
              <Button 
                variant="outline" 
                className="flex items-center gap-2"
              >
                <Calendar className="h-4 w-4" />
                Calendário
              </Button>
            </Link>
          )}
          
          {isMapPage ? (
            <Button 
              variant="outline" 
              disabled
              className="flex items-center gap-2 bg-muted"
            >
              <Map className="h-4 w-4" />
              Mapa
            </Button>
          ) : (
            <Link href="/map">
              <Button 
                variant="outline" 
                className="flex items-center gap-2"
              >
                <Map className="h-4 w-4" />
                Mapa
              </Button>
            </Link>
          )}
          
          <Link href="/saved">
            <Button variant="outline" className="flex items-center gap-2">
              <Heart className="h-4 w-4" />
              Guardados ({savedEventIds.size})
            </Button>
          </Link>
        </div>
      </div>

      {/* Mobile Header */}
      <div className="md:hidden">
        <div className="flex items-center justify-between">
          <div>
            <Link href="/">
              <h1 className="text-2xl font-bold cursor-pointer">
                Run Calendar
              </h1>
            </Link>
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
              {isHomePage ? (
                <Button 
                  variant="outline" 
                  disabled
                  className="flex items-center gap-2 justify-start bg-muted"
                >
                  <List className="h-4 w-4" />
                  Lista
                </Button>
              ) : (
                <Link href="/" onClick={() => setIsMenuOpen(false)}>
                  <Button 
                    variant="outline" 
                    className="flex items-center gap-2 justify-start w-full"
                  >
                    <List className="h-4 w-4" />
                    Lista
                  </Button>
                </Link>
              )}
              
              {isCalendarPage ? (
                <Button 
                  variant="outline" 
                  disabled
                  className="flex items-center gap-2 justify-start bg-muted"
                >
                  <Calendar className="h-4 w-4" />
                  Calendário
                </Button>
              ) : (
                <Link href="/calendar" onClick={() => setIsMenuOpen(false)}>
                  <Button 
                    variant="outline" 
                    className="flex items-center gap-2 justify-start w-full"
                  >
                    <Calendar className="h-4 w-4" />
                    Calendário
                  </Button>
                </Link>
              )}
              
              {isMapPage ? (
                <Button 
                  variant="outline" 
                  disabled
                  className="flex items-center gap-2 justify-start bg-muted"
                >
                  <Map className="h-4 w-4" />
                  Mapa
                </Button>
              ) : (
                <Link href="/map" onClick={() => setIsMenuOpen(false)}>
                  <Button 
                    variant="outline" 
                    className="flex items-center gap-2 justify-start w-full"
                  >
                    <Map className="h-4 w-4" />
                    Mapa
                  </Button>
                </Link>
              )}
              
              <Link href="/saved" onClick={() => setIsMenuOpen(false)}>
                <Button variant="outline" className="flex items-center gap-2 justify-start w-full">
                  <Heart className="h-4 w-4" />
                  Guardados ({savedEventIds.size})
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}