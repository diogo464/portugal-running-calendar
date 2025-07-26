import { ChevronLeft, ChevronRight } from "lucide-react"
import { useState, useEffect } from "react"
import { PaginationState } from "@/lib/types"
import { getTotalPages } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface PaginationProps {
  pagination: PaginationState
  onPageChange: (page: number) => void
}

export function Pagination({ pagination, onPageChange }: PaginationProps) {
  const [maxPageNumbers, setMaxPageNumbers] = useState(5)
  const totalPages = getTotalPages(pagination.totalItems, pagination.itemsPerPage)

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

  if (totalPages <= 1) {
    return null
  }

  return (
    <div className="flex items-center justify-between w-full">
      <Button
        variant="outline"
        size="sm"
        disabled={pagination.currentPage === 1}
        onClick={() => onPageChange(pagination.currentPage - 1)}
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
              onClick={() => onPageChange(pageNum)}
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
        onClick={() => onPageChange(pagination.currentPage + 1)}
      >
        Próxima
        <ChevronRight className="h-4 w-4 ml-1" />
      </Button>
    </div>
  )
}