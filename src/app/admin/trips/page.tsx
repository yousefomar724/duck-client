"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Ship, Pencil, Trash2, MoreVertical } from "lucide-react"
import PageHeader from "@/components/shared/page-header"
import StatCard from "@/components/shared/stat-card"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { formatCurrency, formatDate } from "@/lib/constants"
import * as tripsApi from "@/lib/api/trips"
import * as suppliersApi from "@/lib/api/suppliers"
import { TableSkeleton } from "@/components/shared/loading-skeletons"
import { ErrorDisplay } from "@/components/shared/error-display"
import type { Trip, Supplier } from "@/lib/types"

export default function AdminTripsPage() {
  const getSupplierName = (supplier?: Supplier) => {
    if (!supplier) return "-"
    return typeof supplier.name === "string"
      ? supplier.name
      : supplier.name.ar || supplier.name.en || "-"
  }

  const [trips, setTrips] = useState<Trip[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [supplierFilter, setSupplierFilter] = useState<string>("all")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const [tripsRes, suppliersRes] = await Promise.all([
        tripsApi.getTrips(),
        suppliersApi.getSuppliers(),
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

  const handleDelete = async (id: number) => {
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
    if (supplierFilter !== "all" && t.supplier_id !== parseInt(supplierFilter))
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="border rounded-lg p-4 h-24" />
          ))}
        </div>
        <TableSkeleton rows={5} columns={10} />
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
          <SelectTrigger className="w-[250px]">
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
          <SelectTrigger className="w-[200px]">
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
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-right">رقم</TableHead>
                  <TableHead className="text-right">النوع</TableHead>
                  <TableHead className="text-right">الاسم</TableHead>
                  <TableHead className="text-right">المورد</TableHead>
                  <TableHead className="text-right">المرشد</TableHead>
                  <TableHead className="text-right">السعر</TableHead>
                  <TableHead className="text-right">التاريخ</TableHead>
                  <TableHead className="text-right">الأشخاص</TableHead>
                  <TableHead className="text-right">المدة</TableHead>
                  <TableHead className="text-right">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTrips.map((trip) => {
                  const supplier = suppliers.find(
                    (s) => s.id === trip.supplier_id,
                  )
                  const duration = trip.duration ?? 1
                  return (
                    <TableRow
                      key={trip.id}
                      className="hover:bg-duck-cyan/5 transition-colors"
                    >
                      <TableCell className="font-medium">#{trip.id}</TableCell>
                      <TableCell>
                        <span
                          className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${
                            trip.is_tour
                              ? "bg-purple-100 text-purple-700"
                              : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {trip.is_tour ? "جولة" : "رحلة"}
                        </span>
                      </TableCell>
                      <TableCell>
                        {typeof trip.name === "string"
                          ? trip.name
                          : trip.name?.ar || "-"}
                      </TableCell>
                      <TableCell>{getSupplierName(supplier)}</TableCell>
                      <TableCell className="text-text-muted">
                        {trip.tour_guide?.name || "-"}
                      </TableCell>
                      <TableCell>
                        {formatCurrency(trip.price, trip.currency)}
                      </TableCell>
                      <TableCell className="text-text-muted">
                        {formatDate(trip.from)}
                      </TableCell>
                      <TableCell>{trip.max_guests}</TableCell>
                      <TableCell>
                        {duration} {duration === 1 ? "يوم" : "أيام"}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu dir="rtl">
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
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
