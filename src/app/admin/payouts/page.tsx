"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import * as payoutsApi from "@/lib/api/payouts"
import * as suppliersApi from "@/lib/api/suppliers"
import {
  formatCurrency,
  formatDate,
  getPayoutDateString,
  isPaidPayoutStatus,
  currencies,
  payoutStatusColors,
} from "@/lib/constants"
import { TableSkeleton } from "@/components/shared/loading-skeletons"
import { ErrorDisplay } from "@/components/shared/error-display"
import type { PayoutStatus, Payout, Supplier } from "@/lib/types"

const ROW_STATUS_ORDER: PayoutStatus[] = [
  "pending",
  "paid",
  "failed",
  "success",
  "confirmed",
]

function payoutStatusLabel(status: string): string {
  const colors = payoutStatusColors[status as PayoutStatus]
  return colors?.label ?? status
}

function rowStatusValues(current: string): string[] {
  const base: string[] = [...ROW_STATUS_ORDER]
  if (!base.includes(current)) {
    base.push(current)
  }
  return base
}

export default function AdminPayouts() {
  const getSupplierName = (supplier?: Supplier) => {
    if (!supplier) return "مورد غير معروف"
    return typeof supplier.name === "string"
      ? supplier.name
      : supplier.name.ar || supplier.name.en || "مورد غير معروف"
  }

  const [payouts, setPayouts] = useState<Payout[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [activeTab, setActiveTab] = useState<"all" | PayoutStatus>("all")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<number | null>(null)

  const [createOpen, setCreateOpen] = useState(false)
  const [formSupplierId, setFormSupplierId] = useState("")
  const [formAmount, setFormAmount] = useState("")
  const [formCurrency, setFormCurrency] = useState("EGP")
  const [formStatus, setFormStatus] = useState<PayoutStatus>("pending")
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const resetCreateForm = useCallback(() => {
    setFormSupplierId("")
    setFormAmount("")
    setFormCurrency("EGP")
    setFormStatus("pending")
    setFormError(null)
  }, [])

  const fetchData = async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent === true
    try {
      if (!silent) {
        setIsLoading(true)
      }
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
      if (!silent) {
        setIsLoading(false)
      }
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleCreateOpenChange = (open: boolean) => {
    setCreateOpen(open)
    if (!open) resetCreateForm()
  }

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!formSupplierId) {
      setFormError("اختر المورد")
      return
    }
    const amountNum = parseFloat(formAmount)
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      setFormError("أدخل مبلغاً صحيحاً أكبر من صفر")
      return
    }

    setSubmitting(true)
    try {
      const res = await payoutsApi.createPayout({
        supplier_id: Number(formSupplierId),
        amount: amountNum,
        currency: formCurrency,
        status: formStatus,
      })
      if (res.error) {
        setFormError(res.error)
        return
      }
      await fetchData({ silent: true })
      setCreateOpen(false)
      resetCreateForm()
    } catch (err) {
      setFormError("حدث خطأ أثناء إنشاء الدفعة")
      console.error(err)
    } finally {
      setSubmitting(false)
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
        payouts.map((p) => (p.ID === id ? { ...p, status: newStatus } : p)),
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

      setPayouts(payouts.filter((p) => p.ID !== id))
    } catch (err) {
      setError("حدث خطأ أثناء حذف الدفعة")
      console.error(err)
    } finally {
      setUpdatingId(null)
    }
  }

  const totalPaid = useMemo(
    () =>
      payouts
        .filter((p) => isPaidPayoutStatus(String(p.status)))
        .reduce((sum, p) => sum + p.amount, 0),
    [payouts],
  )

  const pendingAmount = useMemo(
    () =>
      payouts
        .filter((p) => p.status === "pending")
        .reduce((sum, p) => sum + p.amount, 0),
    [payouts],
  )

  const failedAmount = useMemo(
    () =>
      payouts
        .filter((p) => p.status === "failed")
        .reduce((sum, p) => sum + p.amount, 0),
    [payouts],
  )

  const filteredPayouts = useMemo(() => {
    if (activeTab === "all") return payouts
    if (activeTab === "paid") {
      return payouts.filter((p) => isPaidPayoutStatus(String(p.status)))
    }
    return payouts.filter((p) => p.status === activeTab)
  }, [payouts, activeTab])

  const addPayoutButton = (
    <Button
      type="button"
      onClick={() => {
        setFormError(null)
        setCreateOpen(true)
      }}
      disabled={isLoading}
    >
      + اضافة دفعة
    </Button>
  )

  return (
    <>
      <Dialog open={createOpen} onOpenChange={handleCreateOpenChange}>
        <DialogContent dir="rtl" className="sm:max-w-md">
          <form onSubmit={handleCreateSubmit}>
            <DialogHeader>
              <DialogTitle>إضافة دفعة جديدة</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {formError ? (
                <p className="text-sm text-red-600" role="alert">
                  {formError}
                </p>
              ) : null}
              <div className="grid gap-2">
                <Label htmlFor="payout-supplier">المورد</Label>
                <Select
                  dir="rtl"
                  value={formSupplierId || undefined}
                  onValueChange={setFormSupplierId}
                  disabled={submitting || suppliers.length === 0}
                >
                  <SelectTrigger id="payout-supplier">
                    <SelectValue placeholder="اختر المورد" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {getSupplierName(s)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {suppliers.length === 0 && !isLoading ? (
                  <p className="text-xs text-muted-foreground">
                    لا يوجد موردون محمّلون. أعد تحميل الصفحة أو تحقق من الاتصال.
                  </p>
                ) : null}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="payout-amount">المبلغ</Label>
                <Input
                  id="payout-amount"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.01"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  disabled={submitting}
                  placeholder="0.00"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="payout-currency">العملة</Label>
                <Select
                  dir="rtl"
                  value={formCurrency}
                  onValueChange={setFormCurrency}
                  disabled={submitting}
                >
                  <SelectTrigger id="payout-currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="payout-status">الحالة</Label>
                <Select
                  dir="rtl"
                  value={formStatus}
                  onValueChange={(v) => setFormStatus(v as PayoutStatus)}
                  disabled={submitting}
                >
                  <SelectTrigger id="payout-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">قيد الانتظار</SelectItem>
                    <SelectItem value="paid">مدفوع</SelectItem>
                    <SelectItem value="failed">فشل</SelectItem>
                    <SelectItem value="success">نجح</SelectItem>
                    <SelectItem value="confirmed">مؤكد</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleCreateOpenChange(false)}
                disabled={submitting}
              >
                إلغاء
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "جاري الحفظ..." : "حفظ"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <div className="space-y-6">
        <PageHeader title="المدفوعات">{addPayoutButton}</PageHeader>

        {isLoading ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="border rounded-lg p-4 h-24" />
              ))}
            </div>
            <TableSkeleton rows={5} columns={5} />
          </>
        ) : error ? (
          <ErrorDisplay error={error} onRetry={fetchData} />
        ) : (
          <>
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

            <Card>
              <CardContent className="px-6">
                <Tabs
                  dir="rtl"
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
                          <TableRow className="bg-muted/50">
                            <TableHead className="text-right">
                              رقم الدفعة
                            </TableHead>
                            <TableHead className="text-right">
                              اسم المورد
                            </TableHead>
                            <TableHead className="text-right">المبلغ</TableHead>
                            <TableHead className="text-right">الحالة</TableHead>
                            <TableHead className="text-right">
                              التاريخ
                            </TableHead>
                            <TableHead className="text-right">
                              الإجراءات
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredPayouts.map((payout) => {
                            const supplier = suppliers.find(
                              (s) => s.id === payout.supplier_id,
                            )
                            const statusKey = String(payout.status)
                            const statusOptions = rowStatusValues(statusKey)
                            return (
                              <TableRow
                                key={payout.ID}
                                className="hover:bg-duck-cyan/5 transition-colors"
                              >
                                <TableCell className="font-medium">
                                  #{payout.ID}
                                </TableCell>
                                <TableCell>
                                  {getSupplierName(supplier)}
                                </TableCell>
                                <TableCell>
                                  {formatCurrency(
                                    payout.amount,
                                    payout.currency,
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Select
                                    dir="rtl"
                                    value={statusKey}
                                    onValueChange={(newStatus) =>
                                      handleStatusUpdate(
                                        payout.ID,
                                        newStatus as PayoutStatus,
                                      )
                                    }
                                    disabled={updatingId === payout.ID}
                                  >
                                    <SelectTrigger className="w-38">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {statusOptions.map((sv) => (
                                        <SelectItem key={sv} value={sv}>
                                          {payoutStatusLabel(sv)}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                                <TableCell className="text-text-muted">
                                  {formatDate(getPayoutDateString(payout))}
                                </TableCell>
                                <TableCell>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDelete(payout.ID)}
                                    disabled={updatingId === payout.ID}
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
          </>
        )}
      </div>
    </>
  )
}
