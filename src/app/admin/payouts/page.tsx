"use client"

import { useState } from "react"
import { DollarSign } from "lucide-react"
import PageHeader from "@/components/shared/page-header"
import StatCard from "@/components/shared/stat-card"
import StatusBadge from "@/components/shared/status-badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { mockPayouts, mockSuppliers } from "@/lib/mock-data"
import { formatCurrency, formatDate } from "@/lib/constants"
import type { PayoutStatus } from "@/lib/types"

export default function AdminPayouts() {
  const [activeTab, setActiveTab] = useState<"all" | PayoutStatus>("all")

  // Calculate stats
  const totalPaid = mockPayouts
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + p.amount, 0)

  const pendingAmount = mockPayouts
    .filter((p) => p.status === "pending")
    .reduce((sum, p) => sum + p.amount, 0)

  const failedAmount = mockPayouts
    .filter((p) => p.status === "failed")
    .reduce((sum, p) => sum + p.amount, 0)

  // Filter payouts based on active tab
  const filteredPayouts =
    activeTab === "all"
      ? mockPayouts
      : mockPayouts.filter((p) => p.status === activeTab)

  return (
    <div className="space-y-6">
      <PageHeader title="المدفوعات" />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="إجمالي المدفوعات"
          value={formatCurrency(totalPaid)}
          icon={DollarSign}
        />
        <StatCard
          title="المبالغ قيد الانتظار"
          value={formatCurrency(pendingAmount)}
          icon={DollarSign}
        />
        <StatCard
          title="المبالغ الفاشلة"
          value={formatCurrency(failedAmount)}
          icon={DollarSign}
        />
      </div>

      {/* Payouts Table with Tabs */}
      <Card>
        <CardContent className="p-6">
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as typeof activeTab)}
          >
            <TabsList className="mb-4">
              <TabsTrigger value="all">الكل</TabsTrigger>
              <TabsTrigger value="pending">قيد الانتظار</TabsTrigger>
              <TabsTrigger value="paid">مدفوع</TabsTrigger>
              <TabsTrigger value="failed">فشل</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">رقم الدفعة</TableHead>
                    <TableHead className="text-right">اسم المورد</TableHead>
                    <TableHead className="text-right">المبلغ</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                    <TableHead className="text-right">التاريخ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayouts.map((payout) => {
                    const supplier = mockSuppliers.find(
                      (s) => s.id === payout.supplier_id,
                    )
                    return (
                      <TableRow key={payout.id}>
                        <TableCell className="font-medium">
                          #{payout.id}
                        </TableCell>
                        <TableCell>{supplier?.name.ar || "-"}</TableCell>
                        <TableCell>
                          {formatCurrency(payout.amount, payout.currency)}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={payout.status} type="payout" />
                        </TableCell>
                        <TableCell className="text-text-muted">
                          {formatDate(payout.date)}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
