"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Ship, Pencil, Trash2, MoreVertical } from "lucide-react"
import PageHeader from "@/components/shared/page-header"
import StatCard from "@/components/shared/stat-card"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DataCardList } from "@/components/dashboard/data-card-list"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { formatCurrency, formatDate, formatTripDuration } from "@/lib/constants"
import { DASHBOARD_LANG } from "@/lib/dashboard/strings"
import { resolveLocalizedField } from "@/lib/dashboard/localize"
import { TripTypeBadge } from "@/components/shared/trip-type-badge"
import * as tripsApi from "@/lib/api/trips"
import * as suppliersApi from "@/lib/api/suppliers"
import { TableSkeleton } from "@/components/shared/loading-skeletons"
import { ErrorDisplay } from "@/components/shared/error-display"
import type { Trip, Supplier } from "@/lib/types"

export default function AdminTripsPage() {
  const getSupplierName = (supplier?: Supplier) => {
    return resolveLocalizedField(supplier?.name, "-")
  }

  const [trips, setTrips] = useState<Trip[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [supplierFilter, setSupplierFilter] = useState<string>("all")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const [tripsRes, suppliersRes] = await Promise.all([
        tripsApi.getTrips(DASHBOARD_LANG),
        suppliersApi.getSuppliers(DASHBOARD_LANG),
      ])

      if (tripsRes.error || suppliersRes.error) {
        setError("فشل في تحميل البيانات")
        return
      }

      setTrips(tripsRes.data || [])
      setSuppliers(suppliersRes.data || [])
    } catch (err) {
      setError("حدث خطأ أثناء تحميل البيانات")
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      setIsDeleting(true)
      const res = await tripsApi.deleteTrip(id)

      if (res.error) {
        setError("فشل في حذف الرحلة")
        return
      }

      setTrips(trips.filter((t) => t.id !== id))
      setDeleteId(null)
    } catch (err) {
      setError("حدث خطأ أثناء حذف الرحلة")
      console.error(err)
    } finally {
      setIsDeleting(false)
    }
  }

  const filteredTrips = trips.filter((t) => {
    if (supplierFilter !== "all" && t.supplier_id !== supplierFilter)
      return false
    if (typeFilter === "trip" && t.is_tour) return false
    if (typeFilter === "tour" && !t.is_tour) return false
    return true
  })

  const totalTrips = trips.length
  const totalTours = trips.filter((t) => t.is_tour).length
  const totalRegularTrips = trips.filter((t) => !t.is_tour).length

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="الرحلات والجولات">
          <Button disabled>+ اضافة رحلة / جولة</Button>
        </PageHeader>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="border rounded-lg p-4 h-24" />
          ))}
        </div>
        <TableSkeleton rows={5} columns={9} />
      </div>
    )
  }

  if (error && !isDeleting) {
    return (
      <div className="space-y-6">
        <PageHeader title="الرحلات والجولات">
          <Button
            asChild
            className="bg-duck-yellow hover:bg-duck-yellow-hover text-duck-navy"
          >
            <Link href="/admin/trips/create">+ اضافة رحلة / جولة</Link>
          </Button>
        </PageHeader>
        <ErrorDisplay error={error} onRetry={fetchData} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title="الرحلات والجولات">
        <Button
          asChild
          className="bg-duck-yellow hover:bg-duck-yellow-hover text-duck-navy"
        >
          <Link href="/admin/trips/create">+ اضافة رحلة / جولة</Link>
        </Button>
      </PageHeader>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="الإجمالي" value={totalTrips} icon={Ship} />
        <StatCard title="الرحلات" value={totalRegularTrips} icon={Ship} />
        <StatCard title="الجولات" value={totalTours} icon={Ship} />
      </div>

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <Select
          dir="rtl"
          value={supplierFilter}
          onValueChange={setSupplierFilter}
        >
          <SelectTrigger className="w-full sm:w-[250px]">
            <SelectValue placeholder="تصفية حسب المورد" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الموردين</SelectItem>
            {suppliers.map((supplier) => (
              <SelectItem key={supplier.id} value={supplier.id.toString()}>
                {getSupplierName(supplier)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select dir="rtl" value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="تصفية حسب النوع" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">الكل</SelectItem>
            <SelectItem value="trip">رحلات فقط</SelectItem>
            <SelectItem value="tour">جولات فقط</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Trips Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {supplierFilter === "all" ? "جميع الرحلات" : `رحلات المورد`}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {filteredTrips.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-text-muted">لا توجد رحلات متاحة</p>
            </div>
          ) : (
            <>
            <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-start">النوع</TableHead>
                  <TableHead className="text-start">الاسم</TableHead>
                  <TableHead className="text-start">المورد</TableHead>
                  <TableHead className="text-start">المرشد</TableHead>
                  <TableHead className="text-start">سعر المصريين</TableHead>
                  <TableHead className="text-start">سعر الأجانب</TableHead>
                  <TableHead className="text-start">التاريخ</TableHead>
                  <TableHead className="text-start">الأشخاص</TableHead>
                  <TableHead className="text-start">المدة</TableHead>
                  <TableHead className="text-start">الإشغال</TableHead>
                  <TableHead className="text-start">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTrips.map((trip) => {
                  const supplier = suppliers.find(
                    (s) => s.id === trip.supplier_id,
                  )
                  const durationLabel =
                    formatTripDuration(trip) ??
                    `${trip.duration ?? 1} ${(trip.duration ?? 1) === 1 ? "ساعة" : "ساعات"}`
                  return (
                    <TableRow
                      key={trip.id}
                      className="hover:bg-duck-cyan/5 transition-colors"
                    >
                      <TableCell>
                        <TripTypeBadge isTour={trip.is_tour} />
                      </TableCell>
                      <TableCell>
                        {resolveLocalizedField(trip.name, "-")}
                      </TableCell>
                      <TableCell>{getSupplierName(supplier)}</TableCell>
                      <TableCell className="text-text-muted">
                        <div className="flex flex-col">
                          <span>{trip.tour_guide?.name || "-"}</span>
                          {trip.guide_mandatory ? (
                            <span className="text-xs text-duck-cyan">
                              إلزامي
                              {(trip.guide_price ?? 0) > 0
                                ? ` (+${formatCurrency(trip.guide_price, trip.currency)})`
                                : ""}
                            </span>
                          ) : (trip.guide_price ?? 0) > 0 ? (
                            <span className="text-xs text-text-muted">
                              اختياري +
                              {formatCurrency(trip.guide_price, trip.currency)}
                            </span>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>
                        {formatCurrency(trip.price, trip.currency)}
                      </TableCell>
                      <TableCell>
                        {(trip.foreigner_price ?? 0) > 0
                          ? formatCurrency(
                              trip.foreigner_price,
                              trip.currency,
                            )
                          : "-"}
                      </TableCell>
                      <TableCell className="text-text-muted">
                        {formatDate(trip.from)}
                      </TableCell>
                      <TableCell>{trip.max_guests}</TableCell>
                      <TableCell>
                        {durationLabel}
                      </TableCell>
                      <TableCell>
                        {trip.is_tour
                          ? "—"
                          : `${trip.activity_minutes ?? (trip.duration ?? 1) * 60} د`}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu dir="rtl">
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-11!">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/admin/trips/${trip.id}/edit`}>
                                <Pencil className="me-2 h-4 w-4" />
                                تعديل
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => setDeleteId(trip.id)}
                            >
                              <Trash2 className="me-2 h-4 w-4" />
                              حذف
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
            </div>
            <DataCardList
              items={filteredTrips.map((trip) => {
                const supplier = suppliers.find((s) => s.id === trip.supplier_id)
                const durationLabel =
                  formatTripDuration(trip) ??
                  `${trip.duration ?? 1} ${(trip.duration ?? 1) === 1 ? "ساعة" : "ساعات"}`
                return {
                  id: trip.id,
                  title: resolveLocalizedField(trip.name, "-"),
                  subtitle: getSupplierName(supplier),
                  badge: <TripTypeBadge isTour={trip.is_tour} />,
                  fields: [
                    {
                      label: "سعر المصريين",
                      value: formatCurrency(trip.price, trip.currency),
                    },
                    {
                      label: "الأشخاص",
                      value: String(trip.max_guests),
                    },
                    {
                      label: "المدة",
                      value: durationLabel,
                    },
                    {
                      label: "الإشغال",
                      value: trip.is_tour
                        ? "—"
                        : `${trip.activity_minutes ?? (trip.duration ?? 1) * 60} د`,
                    },
                  ],
                  actions: (
                    <DropdownMenu dir="rtl">
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-11!">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/admin/trips/${trip.id}/edit`}>
                            <Pencil className="me-2 h-4 w-4" />
                            تعديل
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => setDeleteId(trip.id)}
                        >
                          <Trash2 className="me-2 h-4 w-4" />
                          حذف
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ),
                }
              })}
            />
            </>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <AlertDialog
        open={deleteId !== null}
        onOpenChange={() => setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف الرحلة</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف هذه الرحلة؟ لا يمكن التراجع عن هذه العملية.
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
