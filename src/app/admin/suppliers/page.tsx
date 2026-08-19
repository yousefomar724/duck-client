"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
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
import { Avatar, AvatarImage } from "@/components/ui/avatar"
import { DUCK_LOGO_PLACEHOLDER, resolveImageUrl } from "@/lib/image-utils"
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
import { DASHBOARD_LANG } from "@/lib/dashboard/strings"
import { resolveLocalizedField } from "@/lib/dashboard/localize"
import * as authApi from "@/lib/api/auth"
import { TableSkeleton } from "@/components/shared/loading-skeletons"
import { ErrorDisplay } from "@/components/shared/error-display"
import { DataCardList } from "@/components/dashboard/data-card-list"
import { Input } from "@/components/ui/input"
import type { Supplier } from "@/lib/types"

function getSupplierName(supplier: Supplier): string {
  return resolveLocalizedField(supplier.name, "-")
}

function SupplierTableAvatar({ supplier }: { supplier: Supplier }) {
  const [failed, setFailed] = useState(false)
  const resolved = supplier.icon ? resolveImageUrl(supplier.icon) : null
  const showLogo = !resolved || failed
  return (
    <Avatar className="h-9 w-9">
      <AvatarImage
        src={showLogo ? DUCK_LOGO_PLACEHOLDER : resolved}
        alt=""
        className={showLogo ? "object-contain p-1.5" : "object-cover"}
        onError={() => setFailed(true)}
      />
    </Avatar>
  )
}

function getSupplierAbout(supplier: Supplier): string {
  const text = resolveLocalizedField(supplier.about, "-")
  return text.length > 60 ? `${text.slice(0, 60)}...` : text
}

export default function AdminSuppliersPage() {
  const router = useRouter()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [activeTab, setActiveTab] = useState<"all" | "active" | "inactive">(
    "all",
  )
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [search, setSearch] = useState("")

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const res = await suppliersApi.getSuppliers(DASHBOARD_LANG)
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

  const handleDelete = async (userId: string) => {
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

  const filteredSuppliers = (
    activeTab === "all"
      ? suppliers
      : activeTab === "active"
        ? suppliers.filter((s) => s.active !== false)
        : suppliers.filter((s) => s.active === false)
  ).filter((s) => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    return (
      getSupplierName(s).toLowerCase().includes(q) ||
      getSupplierAbout(s).toLowerCase().includes(q)
    )
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="الموردين" />
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
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

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
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
            <div className="mb-4 overflow-x-auto">
              <TabsList className="w-max h-auto flex-nowrap justify-start">
                <TabsTrigger value="all">الكل</TabsTrigger>
                <TabsTrigger value="active">نشط</TabsTrigger>
                <TabsTrigger value="inactive">غير نشط</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value={activeTab}>
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="بحث بالاسم..."
                className="mb-4 max-w-md"
              />
              {filteredSuppliers.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-text-muted">لا يوجد موردين</p>
                </div>
              ) : (
                <>
                <div className="hidden md:block">
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
                          className="hover:bg-duck-cyan/5 cursor-pointer transition-colors"
                          onClick={(e) => {
                            if (
                              (e.target as HTMLElement).closest(
                                "[data-prevent-row-click]",
                              )
                            ) {
                              return
                            }
                            router.push(`/admin/suppliers/${supplier.id}`)
                          }}
                        >
                          <TableCell>
                            <SupplierTableAvatar supplier={supplier} />
                          </TableCell>
                          <TableCell>
                            {getSupplierName(supplier)}
                            <Link
                              href={`/admin/suppliers/${supplier.id}`}
                              className="mt-1 block text-xs text-duck-cyan hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              عرض
                            </Link>
                          </TableCell>
                          <TableCell className="text-text-muted max-w-[200px] truncate">
                            {getSupplierAbout(supplier)}
                          </TableCell>
                          <TableCell>{supplier.rate ?? 0}</TableCell>
                          <TableCell data-prevent-row-click>
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
                          <TableCell data-prevent-row-click>
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
                </div>
                <DataCardList
                  items={filteredSuppliers.map((supplier) => {
                    const hasUserId = supplier.user_id != null
                    const isActive = supplier.active !== false
                    return {
                      id: supplier.id,
                      title: getSupplierName(supplier),
                      subtitle: getSupplierAbout(supplier),
                      badge: (
                        <span className="text-xs text-text-muted">
                          {supplier.rate ?? 0} ★
                        </span>
                      ),
                      fields: [
                        {
                          label: "الحالة",
                          value: (
                            <label className="flex items-center gap-2 text-sm">
                              <Switch
                                checked={isActive}
                                onCheckedChange={() =>
                                  handleActivateToggle(supplier)
                                }
                                disabled={
                                  !hasUserId || updatingId === supplier.id
                                }
                              />
                              {isActive ? "نشط" : "غير نشط"}
                            </label>
                          ),
                        },
                      ],
                      actions: (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-11! text-red-600 hover:text-red-700"
                          onClick={() =>
                            hasUserId && setDeleteId(supplier.user_id!)
                          }
                          disabled={!hasUserId || updatingId === supplier.id}
                        >
                          حذف
                        </Button>
                      ),
                      onClick: () =>
                        router.push(`/admin/suppliers/${supplier.id}`),
                    }
                  })}
                />
                </>
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
