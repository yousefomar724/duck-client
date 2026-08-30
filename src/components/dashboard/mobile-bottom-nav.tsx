"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import {
  adminBottomNavItems,
  supplierBottomNavItems,
  isNavItemActive,
} from "@/lib/constants"
import { getOpsSummary } from "@/lib/api/ops"
import { cn } from "@/lib/utils"

export function MobileBottomNav({ role }: { role: "admin" | "supplier" }) {
  const pathname = usePathname() ?? ""
  const items = role === "admin" ? adminBottomNavItems : supplierBottomNavItems
  const [badge, setBadge] = useState(0)

  useEffect(() => {
    let cancelled = false
    getOpsSummary().then(({ data }) => {
      if (cancelled || !data) return
      setBadge(data.unread_notifications ?? 0)
    })
    return () => {
      cancelled = true
    }
  }, [pathname])

  return (
    <nav
      aria-label="التنقل الرئيسي"
      className="fixed inset-x-0 bottom-0 z-50 grid h-[calc(4rem+env(safe-area-inset-bottom))] grid-cols-5 border-t bg-background pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {items.map((item) => {
        const active = isNavItemActive(pathname, item.href)
        const showBadge = item.href.endsWith("/notifications") && badge > 0
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-11 flex-col items-center justify-center gap-0.5 text-[11px] font-medium",
              active ? "text-duck-cyan" : "text-text-muted",
            )}
          >
            <span className="relative">
              <item.icon className="size-5" aria-hidden />
              {showBadge ? (
                <span className="absolute -top-1 -start-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-0.5 text-[9px] text-white">
                  {badge > 9 ? "9+" : badge}
                </span>
              ) : null}
            </span>
            <span>{item.title}</span>
          </Link>
        )
      })}
    </nav>
  )
}
