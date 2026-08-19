"use client"

import { useState, type ReactNode } from "react"
import { SlidersHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { useIsMobile } from "@/hooks/use-mobile"

interface FilterSheetProps {
  children: ReactNode
  activeCount?: number
  label?: string
}

export function FilterSheet({
  children,
  activeCount = 0,
  label = "الفلاتر",
}: FilterSheetProps) {
  const isMobile = useIsMobile()
  const [open, setOpen] = useState(false)

  if (!isMobile) {
    return <div className="flex flex-wrap items-center gap-2">{children}</div>
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button type="button" variant="outline" className="h-11! min-w-11 gap-2">
          <SlidersHorizontal className="size-4" />
          {label}
          {activeCount > 0 ? (
            <Badge variant="secondary" className="rounded-full px-1.5">
              {activeCount}
            </Badge>
          ) : null}
        </Button>
      </SheetTrigger>
      <SheetContent
        side="bottom"
        className="max-h-[85dvh] overflow-y-auto"
        closeLabel="إغلاق"
      >
        <SheetHeader>
          <SheetTitle>{label}</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-3 px-4 pb-6">{children}</div>
      </SheetContent>
    </Sheet>
  )
}
