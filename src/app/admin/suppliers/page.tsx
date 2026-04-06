"use client"

import { useState, useEffect } from "react"
import { Users } from "lucide-react"
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
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import * as suppliersApi from "@/lib/api/suppliers"
import * as authApi from "@/lib/api/auth"
import { TableSkeleton } from "@/components/shared/loading-skeletons"
import { ErrorDisplay } from "@/components/shared/error-display"
import type { Supplier } from "@/lib/types"

function getSupplierName(supplier: Supplier): string {
  return typeof supplier.name === "string"
    ? supplier.name
    : supplier.name?.ar || supplier.name?.en || "-"
}

function getSupplierAbout(supplier: Supplier): string {
  const about = supplier.about
  if (!about) return "-"
  const text = typeof about === "string" ? about : about?.ar || about?.en || "-"
  return text.length > 60 ? `${text.slice(0, 60)}...` : text
}

export default function AdminSuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [activeTab, setActiveTab] = useState<"all" | "active" | "inactive">(
    "all",
  )
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<number | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const res = await suppliersApi.getSuppliers()
      if (res.error) {
        setError("فشل في تحميل الموردين")
        return
      }
      setSuppliers(res.data || [])
    } catch (err) {
      setError("حدث خطأ أثناء تحميل الموردين")
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleActivateToggle = async (supplier: Supplier) => {
    const userId = supplier.user_id
    if (userId == null) return
    const newActive = !(supplier.active ?? true)
    try {
      setUpdatingId(supplier.id)
      const res = await authApi.activateUser(userId, newActive)
      if (res.error) {
        setError("فشل في تحديث حالة المورد")
        return
      }
      setSuppliers(
        suppliers.map((s) =>
          s.id === supplier.id ? { ...s, active: newActive } : s,
        ),
      )
    } catch (err) {
      setError("حدث خطأ أثناء تحديث الحالة")
      console.error(err)
    } finally {
      setUpdatingId(null)
    }
  }

  const handleDelete = async (userId: number) => {
    try {
      setIsDeleting(true)
      const res = await authApi.deleteUser(userId)
      if (res.error) {
        setError("فشل في حذف المورد")
        return
      }
      setSuppliers(suppliers.filter((s) => s.user_id !== userId))
      setDeleteId(null)
    } catch (err) {
      setError("حدث خطأ أثناء الحذف")
      console.error(err)
    } finally {
      setIsDeleting(false)
    }
  }

  const totalCount = suppliers.length
  const activeCount = suppliers.filter((s) => s.active !== false).length
  const inactiveCount = suppliers.filter((s) => s.active === false).length

  const filteredSuppliers =
    activeTab === "all"
      ? suppliers
      : activeTab === "active"
        ? suppliers.filter((s) => s.active !== false)
        : suppliers.filter((s) => s.active === false)

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="الموردين" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="border rounded-lg p-4 h-24" />
          ))}
        </div>
        <TableSkeleton rows={5} columns={6} />
      </div>
    )
  }

  if (error && !isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="الموردين" />
        <ErrorDisplay error={error} onRetry={fetchData} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title="الموردين" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="إجمالي الموردين" value={totalCount} icon={Users} />
        <StatCard title="موردين نشطين" value={activeCount} icon={Users} />
        <StatCard title="موردين غير نشطين" value={inactiveCount} icon={Users} />
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
              <TabsTrigger value="active">نشط</TabsTrigger>
              <TabsTrigger value="inactive">غير نشط</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab}>
              {filteredSuppliers.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-text-muted">لا يوجد موردين</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-right w-14" />
                      <TableHead className="text-right">الاسم</TableHead>
                      <TableHead className="text-right">نبذة</TableHead>
                      <TableHead className="text-right">التقييم</TableHead>
                      <TableHead className="text-right">الحالة</TableHead>
                      <TableHead className="text-right">الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSuppliers.map((supplier) => {
                      const hasUserId = supplier.user_id != null
                      const isActive = supplier.active !== false
                      return (
                        <TableRow
                          key={supplier.id}
                          className="hover:bg-duck-cyan/5 transition-colors"
                        >
                          <TableCell>
                            <Avatar className="h-9 w-9">
                              {supplier.icon ? (
                                <img
                                  src={supplier.icon}
                                  alt=""
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <AvatarFallback className="bg-duck-cyan/20 text-duck-cyan">
                                  {getSupplierName(supplier).charAt(0) || "م"}
                                </AvatarFallback>
                              )}
                            </Avatar>
                          </TableCell>
                          <TableCell className="font-medium">
                            {getSupplierName(supplier)}
                          </TableCell>
                          <TableCell className="text-text-muted max-w-[200px] truncate">
                            {getSupplierAbout(supplier)}
                          </TableCell>
                          <TableCell>{supplier.rate ?? 0}</TableCell>
                          <TableCell>
                            <Switch
                              checked={isActive}
                              onCheckedChange={() =>
                                handleActivateToggle(supplier)
                              }
                              disabled={
                                !hasUserId || updatingId === supplier.id
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                hasUserId && setDeleteId(supplier.user_id!)
                              }
                              disabled={
                                !hasUserId || updatingId === supplier.id
                              }
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

      <AlertDialog
        open={deleteId !== null}
        onOpenChange={() => setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف المورد</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف هذا المورد؟ سيتم حذف الحساب والبيانات المرتبطة
              به ولا يمكن التراجع عن هذه العملية.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel disabled={isDeleting}>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDelete(deleteId)}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "جاري الحذف..." : "حذف"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
