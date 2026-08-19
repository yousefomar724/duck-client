"use client"

import { useEffect, useState } from "react"
import { Search, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { FilterSheet } from "@/components/dashboard/filter-sheet"

export interface ActiveFilter {
  key: string
  label: string
  onRemove: () => void
}

interface DataTableToolbarProps {
  searchValue: string
  onSearchChange: (value: string) => void
  searchPlaceholder?: string
  activeFilters?: ActiveFilter[]
  onClearFilters?: () => void
  filteredCount?: number
  totalCount?: number
  children?: React.ReactNode
  actions?: React.ReactNode
  className?: string
  collapsibleFilters?: boolean
}

export function DataTableToolbar({
  searchValue,
  onSearchChange,
  searchPlaceholder = "بحث...",
  activeFilters = [],
  onClearFilters,
  filteredCount,
  totalCount,
  children,
  actions,
  className,
  collapsibleFilters = false,
}: DataTableToolbarProps) {
  const [localSearch, setLocalSearch] = useState(searchValue)

  useEffect(() => {
    setLocalSearch(searchValue)
  }, [searchValue])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== searchValue) {
        onSearchChange(localSearch)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [localSearch, searchValue, onSearchChange])

  const hasActiveFilters =
    activeFilters.length > 0 || searchValue.trim().length > 0

  return (
    <div className={cn("space-y-3", className)}>
      <div className="grid gap-3 sm:items-center">
        <div className="relative max-w-md">
          <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-text-muted" />
          <Input
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="!ps-9 !pe-9"
          />
          {localSearch && (
            <button
              type="button"
              onClick={() => {
                setLocalSearch("")
                onSearchChange("")
              }}
              className="absolute end-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-dark"
              aria-label="مسح البحث"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {collapsibleFilters ? (
            <FilterSheet activeCount={activeFilters.length}>{children}</FilterSheet>
          ) : (
            children
          )}
          {actions}
        </div>
      </div>


      {(hasActiveFilters || filteredCount !== undefined) && (
        <div className="flex flex-wrap items-center gap-2">
          {filteredCount !== undefined && totalCount !== undefined && (
            <span className="text-sm text-text-muted">
              عرض {filteredCount} من {totalCount}
            </span>
          )}
          {activeFilters.map((filter) => (
            <Badge
              key={filter.key}
              variant="secondary"
              className="gap-1 pe-1"
            >
              {filter.label}
              <button
                type="button"
                onClick={filter.onRemove}
                className="rounded-full p-0.5 hover:bg-muted"
                aria-label={`إزالة فلتر ${filter.label}`}
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
          {hasActiveFilters && onClearFilters && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClearFilters}
              className="h-7 text-xs"
            >
              مسح الفلاتر
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
