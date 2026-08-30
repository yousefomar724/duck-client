import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface MobileActionBarProps {
  children: ReactNode
  className?: string
}

export function MobileActionBar({ children, className }: MobileActionBarProps) {
  return (
    <div
      className={cn(
        "fixed inset-x-0 z-40 border-t bg-background/95 px-4 pt-3 md:hidden",
        "bottom-[var(--bottom-nav-h,0px)]",
        "pb-3",
        className,
      )}
    >
      {children}
    </div>
  )
}
