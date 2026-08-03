"use client"

import { type Column } from "@tanstack/react-table"
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface DataTableColumnHeaderProps<TData, TValue> {
  column: Column<TData, TValue>
  title: string
  className?: string
}

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
}: DataTableColumnHeaderProps<TData, TValue>) {
  if (!column.getCanSort()) {
    return <div className={cn(className)}>{title}</div>
  }

  const sorted = column.getIsSorted()

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={cn(
        "-ms-3 h-8 data-[state=open]:bg-accent",
        className,
      )}
      onClick={() => column.toggleSorting(sorted === "asc")}
      aria-sort={
        sorted === "asc"
          ? "ascending"
          : sorted === "desc"
            ? "descending"
            : "none"
      }
    >
      <span>{title}</span>
      {sorted === "desc" ? (
        <ArrowDown className="size-4" />
      ) : sorted === "asc" ? (
        <ArrowUp className="size-4" />
      ) : (
        <ChevronsUpDown className="size-4 opacity-50" />
      )}
    </Button>
  )
}
