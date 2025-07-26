import { useRef } from "react"
import { Event, PaginationState } from "@/lib/types"
import { getTotalPages } from "@/lib/utils"
import { EventCard } from "./EventCard"
import { Skeleton } from "@/components/ui/skeleton"
import { Pagination } from "./Pagination"

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
  const totalPages = getTotalPages(pagination.totalItems, pagination.itemsPerPage)
  const startItem = (pagination.currentPage - 1) * pagination.itemsPerPage + 1
  const endItem = Math.min(startItem + events.length - 1, pagination.totalItems)

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
      {/* Top pagination */}
      <div ref={scrollTargetRef}>
        <Pagination pagination={pagination} onPageChange={handlePageChange} />
      </div>

      {/* Results info */}
      <div className="flex justify-between items-center text-sm text-muted-foreground">
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

      {/* Bottom pagination */}
      <Pagination pagination={pagination} onPageChange={handlePageChange} />
    </div>
  )
}