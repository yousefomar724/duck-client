"use client"

import { useEffect, useState } from "react"
import PageHeader from "@/components/shared/page-header"
import { Input } from "@/components/ui/input"
import { DataCardList } from "@/components/dashboard/data-card-list"
import { getCustomers } from "@/lib/api/customers"
import { formatCurrency, formatDateShort } from "@/lib/constants"
import { opsStrings } from "./ops-strings"
import { useOpsScope } from "./use-ops-scope"
import { EmptyState } from "@/components/dashboard/empty-state"
import { Users } from "lucide-react"

export function CustomersView({ role }: { role: "admin" | "supplier" }) {
  const { supplierId } = useOpsScope(role)
  const [q, setQ] = useState("")
  const [items, setItems] = useState<
    { phone_number: string; name: string; bookings: number; last_visit: string; total: number }[]
  >([])

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void getCustomers(q, 1, supplierId).then(({ data }) => {
        if (data) setItems(data.items)
      })
    }, 250)
    return () => window.clearTimeout(handle)
  }, [q, supplierId])

  return (
    <div className="space-y-6">
      <PageHeader title={opsStrings.customers} />
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="بحث بالاسم أو الهاتف"
        className="min-h-11"
      />
      {items.length === 0 ? (
        <EmptyState icon={Users} title="لا عملاء" />
      ) : (
        <DataCardList
          className="md:block"
          items={items.map((row) => ({
            id: row.phone_number,
            title: row.name,
            subtitle: row.phone_number,
            fields: [
              { label: "الحجوزات", value: row.bookings },
              { label: "آخر زيارة", value: formatDateShort(row.last_visit) },
              { label: "الإجمالي", value: formatCurrency(row.total) },
            ],
          }))}
        />
      )}
    </div>
  )
}
