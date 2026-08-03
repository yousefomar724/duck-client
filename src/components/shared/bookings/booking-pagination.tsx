"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface BookingPaginationProps {
  page: number
  totalPages: number
  totalItems: number
  onPageChange: (page: number) => void
}

export function BookingPagination({
  page,
  totalPages,
  totalItems,
  onPageChange,
}: BookingPaginationProps) {
  if (totalItems === 0) return null

  return (
    <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-text-muted">
        صفحة {page} من {totalPages}
      </p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="الصفحة السابقة"
        >
          <ChevronRight className="size-4" aria-hidden />
          السابق
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="الصفحة التالية"
        >
          التالي
          <ChevronLeft className="size-4" aria-hidden />
        </Button>
      </div>
    </div>
  )
}

export function BookingPaginationCompact({
  page,
  totalPages,
  className,
}: {
  page: number
  totalPages: number
  className?: string
}) {
  return (
    <span className={cn("text-xs text-text-muted", className)}>
      {page}/{totalPages}
    </span>
  )
}
