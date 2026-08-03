"use client"

import {
  type Table as TanstackTable,
  flexRender,
} from "@tanstack/react-table"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

interface DataTableProps<TData> {
  table: TanstackTable<TData>
  onRowClick?: (row: TData) => void
  getRowClassName?: (row: TData) => string
  emptyMessage?: string
  className?: string
}

export function DataTable<TData>({
  table,
  onRowClick,
  getRowClassName,
  emptyMessage = "لا توجد نتائج",
  className,
}: DataTableProps<TData>) {
  const rows = table.getRowModel().rows

  return (
    <div className={cn("rounded-md border overflow-hidden", className)}>
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="bg-muted/50 hover:bg-muted/50">
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id} className="text-start whitespace-nowrap">
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={table.getAllColumns().length}
                className="h-32 text-center text-text-muted"
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() ? "selected" : undefined}
                className={cn(
                  onRowClick && "cursor-pointer hover:bg-duck-cyan/5",
                  getRowClassName?.(row.original),
                )}
                onClick={() => onRowClick?.(row.original)}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    onClick={(e) => {
                      const target = e.target as HTMLElement
                      if (
                        target.closest("button") ||
                        target.closest("a") ||
                        target.closest("[role='menuitem']") ||
                        target.closest("[data-prevent-row-click]")
                      ) {
                        e.stopPropagation()
                      }
                    }}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
