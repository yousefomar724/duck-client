"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import PageHeader from "@/components/shared/page-header"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/dashboard/empty-state"
import { Bell } from "lucide-react"
import { getOpsNotifications, markOpsNotificationsRead } from "@/lib/api/ops"
import { opsStrings } from "./ops-strings"
import { useOpsScope } from "./use-ops-scope"
import { cn } from "@/lib/utils"

export function OpsNotifications({ role }: { role: "admin" | "supplier" }) {
  const { supplierId } = useOpsScope(role)
  const [items, setItems] = useState<
    { key: string; type: string; title: string; href: string; read: boolean }[]
  >([])

  const load = useCallback(async () => {
    const { data } = await getOpsNotifications(supplierId)
    if (data) setItems(data.items)
  }, [supplierId])

  useEffect(() => {
    const id = window.setTimeout(() => {
      void load()
    }, 0)
    return () => window.clearTimeout(id)
  }, [load])

  return (
    <div className="space-y-6">
      <PageHeader title={opsStrings.notifications}>
        <Button
          type="button"
          variant="outline"
          className="min-h-11"
          onClick={async () => {
            await markOpsNotificationsRead()
            await load()
          }}
        >
          {opsStrings.markAllRead}
        </Button>
      </PageHeader>
      {items.length === 0 ? (
        <EmptyState icon={Bell} title="لا تنبيهات" description="ستظهر التنبيهات التشغيلية هنا." />
      ) : (
        <ul className="divide-y rounded-xl border bg-white">
          {items.map((item) => (
            <li key={item.key}>
              <Link
                href={item.href}
                className={cn(
                  "flex min-h-14 items-center px-4 text-sm",
                  item.read ? "text-text-muted" : "font-semibold text-text-dark",
                )}
              >
                {item.title}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
