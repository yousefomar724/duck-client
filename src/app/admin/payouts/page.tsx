"use client"

import { useState, useEffect } from "react"
import { DollarSign } from "lucide-react"
import PageHeader from "@/components/shared/page-header"
import StatCard from "@/components/shared/stat-card"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import * as payoutsApi from "@/lib/api/payouts"
import * as suppliersApi from "@/lib/api/suppliers"
import { formatCurrency, formatDate } from "@/lib/constants"
import { TableSkeleton } from "@/components/shared/loading-skeletons"
import { ErrorDisplay } from "@/components/shared/error-display"
import type { PayoutStatus, Payout, Supplier } from "@/lib/types"

export default function AdminPayouts() {
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [activeTab, setActiveTab] = useState<"all" | PayoutStatus>("all")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<number | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const [payoutsRes, suppliersRes] = await Promise.all([
        payoutsApi.getPayouts(),
        suppliersApi.getSuppliers(),
      ])

      if (payoutsRes.error || suppliersRes.error) {
        setError("فشل في تحميل البيانات")
        return
      }

      setPayouts(payoutsRes.data || [])
      setSuppliers(suppliersRes.data || [])
    } catch (err) {
      setError("حدث خطأ أثناء تحميل البيانات")
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleStatusUpdate = async (id: number, newStatus: PayoutStatus) => {
    try {
      setUpdatingId(id)
      const res = await payoutsApi.updatePayout(id, { status: newStatus })

      if (res.error) {
        setError("فشل في تحديث حالة الدفعة")
        return
      }

      setPayouts(
        payouts.map((p) => (p.id === id ? { ...p, status: newStatus } : p)),
      )
    } catch (err) {
      setError("حدث خطأ أثناء تحديث الدفعة")
      console.error(err)
    } finally {
      setUpdatingId(null)
    }
  }

  const handleDelete = async (id: number) => {
    try {
      setUpdatingId(id)
      const res = await payoutsApi.deletePayout(id)

      if (res.error) {
        setError("فشل في حذف الدفعة")
        return
      }

      setPayouts(payouts.filter((p) => p.id !== id))
    } catch (err) {
      setError("حدث خطأ أثناء حذف الدفعة")
      console.error(err)
    } finally {
      setUpdatingId(null)
    }
  }

  // Calculate stats
  const totalPaid = payouts
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + p.amount, 0)

  const pendingAmount = payouts
    .filter((p) => p.status === "pending")
    .reduce((sum, p) => sum + p.amount, 0)

  const failedAmount = payouts
    .filter((p) => p.status === "failed")
    .reduce((sum, p) => sum + p.amount, 0)

  // Filter payouts based on active tab
  const filteredPayouts =
    activeTab === "all"
      ? payouts
      : payouts.filter((p) => p.status === activeTab)

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="المدفوعات">
          <Button disabled>+ اضافة دفعة</Button>
        </PageHeader>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="border rounded-lg p-4 h-24" />
          ))}
        </div>
        <TableSkeleton rows={5} columns={5} />
      </div>
    )
  }

  if (error && isLoading === false) {
    return (
      <div className="space-y-6">
        <PageHeader title="المدفوعات">
          <Button>+ اضافة دفعة</Button>
        </PageHeader>
        <ErrorDisplay error={error} onRetry={fetchData} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title="المدفوعات">
        <Button>+ اضافة دفعة</Button>
      </PageHeader>

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
              {filteredPayouts.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-text-muted">لا توجد دفعات متاحة</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">رقم الدفعة</TableHead>
                      <TableHead className="text-right">اسم المورد</TableHead>
                      <TableHead className="text-right">المبلغ</TableHead>
                      <TableHead className="text-right">الحالة</TableHead>
                      <TableHead className="text-right">التاريخ</TableHead>
                      <TableHead className="text-right">الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPayouts.map((payout) => {
                      const supplier = suppliers.find(
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
                            <Select
                              dir="rtl"
                              value={payout.status}
                              onValueChange={(newStatus) =>
                                handleStatusUpdate(
                                  payout.id,
                                  newStatus as PayoutStatus,
                                )
                              }
                              disabled={updatingId === payout.id}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">
                                  قيد الانتظار
                                </SelectItem>
                                <SelectItem value="paid">مدفوع</SelectItem>
                                <SelectItem value="failed">فشل</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-text-muted">
                            {formatDate(payout.date)}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(payout.id)}
                              disabled={updatingId === payout.id}
                              className="text-red-600 hover:text-red-700"
                            >
                              حذف
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
