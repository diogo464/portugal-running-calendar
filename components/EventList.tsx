import { ChevronLeft, ChevronRight } from "lucide-react"
import { useRef, useState, useEffect } from "react"
import { Event, PaginationState } from "@/lib/types"
import { getTotalPages } from "@/lib/utils"
import { EventCard } from "./EventCard"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"

interface EventListProps {
  events: Event[]
  loading: boolean
  pagination: PaginationState
  savedEventIds: Set<number>
  onToggleSave: (eventId: number) => void
  onPageChange: (page: number) => void
}

export function EventList({
  events,
  loading,
  pagination,
  savedEventIds,
  onToggleSave,
  onPageChange
}: EventListProps) {
  const scrollTargetRef = useRef<HTMLDivElement>(null)
  const [maxPageNumbers, setMaxPageNumbers] = useState(5)
  const totalPages = getTotalPages(pagination.totalItems, pagination.itemsPerPage)
  const startItem = (pagination.currentPage - 1) * pagination.itemsPerPage + 1
  const endItem = Math.min(startItem + events.length - 1, pagination.totalItems)

  useEffect(() => {
    const updatePageNumbers = () => {
      if (window.innerWidth >= 768) {
        setMaxPageNumbers(7)
      } else if (window.innerWidth >= 640) {
        setMaxPageNumbers(5)
      } else {
        setMaxPageNumbers(3)
      }
    }

    updatePageNumbers()
    window.addEventListener('resize', updatePageNumbers)
    return () => window.removeEventListener('resize', updatePageNumbers)
  }, [])

  const handlePageChange = (page: number) => {
    onPageChange(page)
    scrollTargetRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-6 w-24" />
        </div>
        <div className="grid gap-4 grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))' }}>
          {Array.from({ length: pagination.itemsPerPage }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-48 w-full" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-muted-foreground">
          <p className="text-lg font-medium">Nenhum evento encontrado</p>
          <p className="text-sm mt-1">Tente ajustar os filtros para ver mais resultados</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Results info */}
      <div ref={scrollTargetRef} className="flex justify-between items-center text-sm text-muted-foreground">
        <span>
          A mostrar {startItem}-{endItem} de {pagination.totalItems} eventos
        </span>
        {totalPages > 1 && (
          <span>
            Página {pagination.currentPage} de {totalPages}
          </span>
        )}
      </div>

      {/* Events grid */}
      <div className="grid gap-4 grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))' }}>
        {events.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            isSaved={savedEventIds.has(event.id)}
            onToggleSave={onToggleSave}
          />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between w-full">
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.currentPage === 1}
            onClick={() => handlePageChange(pagination.currentPage - 1)}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Anterior
          </Button>
          
          <div className="flex items-center space-x-1">
            {/* Show page numbers - responsive count */}
            {Array.from({ length: Math.min(totalPages, maxPageNumbers) }, (_, i) => {
              let pageNum: number
              
              if (totalPages <= maxPageNumbers) {
                pageNum = i + 1
              } else if (pagination.currentPage <= Math.floor(maxPageNumbers / 2) + 1) {
                pageNum = i + 1
              } else if (pagination.currentPage >= totalPages - Math.floor(maxPageNumbers / 2)) {
                pageNum = totalPages - maxPageNumbers + 1 + i
              } else {
                pageNum = pagination.currentPage - Math.floor(maxPageNumbers / 2) + i
              }
              
              return (
                <Button
                  key={pageNum}
                  variant={pageNum === pagination.currentPage ? "default" : "outline"}
                  size="sm"
                  onClick={() => handlePageChange(pageNum)}
                  className="w-8 h-8 p-0"
                >
                  {pageNum}
                </Button>
              )
            })}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.currentPage === totalPages}
            onClick={() => handlePageChange(pagination.currentPage + 1)}
          >
            Próxima
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  )
}