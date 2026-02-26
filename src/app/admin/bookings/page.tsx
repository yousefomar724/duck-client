"use client"

import { useState, useEffect } from "react"
import PageHeader from "@/components/shared/page-header"
import StatusBadge from "@/components/shared/status-badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import * as bookingsApi from "@/lib/api/bookings"
import * as tripsApi from "@/lib/api/trips"
import * as suppliersApi from "@/lib/api/suppliers"
import { formatCurrency, formatDateTime } from "@/lib/constants"
import { TableSkeleton } from "@/components/shared/loading-skeletons"
import { ErrorDisplay } from "@/components/shared/error-display"
import StatCard from "@/components/shared/stat-card"
import { CalendarCheck, CheckCircle, Clock } from "lucide-react"
import type { BookingStatus, Booking, Trip, Supplier } from "@/lib/types"

export default function AdminBookings() {
  const getSupplierName = (supplier?: Supplier) => {
    if (!supplier) return "-"
    return typeof supplier.name === "string"
      ? supplier.name
      : supplier.name.ar || supplier.name.en || "-"
  }

  const [bookings, setBookings] = useState<Booking[]>([])
  const [trips, setTrips] = useState<Trip[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [statusFilter, setStatusFilter] = useState<BookingStatus | "all">("all")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const [bookingsRes, tripsRes, suppliersRes] = await Promise.all([
        bookingsApi.getBookings(),
        tripsApi.getTrips(),
        suppliersApi.getSuppliers(),
      ])

      if (bookingsRes.error || tripsRes.error || suppliersRes.error) {
        setError("فشل في تحميل البيانات")
        return
      }

      setBookings(bookingsRes.data || [])
      setTrips(tripsRes.data || [])
      setSuppliers(suppliersRes.data || [])
    } catch (err) {
      setError("حدث خطأ أثناء تحميل البيانات")
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  // Filter bookings
  const filteredBookings = bookings.filter((booking) => {
    const matchesStatus =
      statusFilter === "all" || booking.status === statusFilter
    return matchesStatus
  })

  // Calculate stats
  const totalCount = bookings.length
  const confirmedCount = bookings.filter((b) => b.status === "CONFIRMED").length
  const pendingCount = bookings.filter((b) => b.status === "PENDING").length

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="الحجوزات" />
        <TableSkeleton rows={5} columns={8} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="الحجوزات" />
        <ErrorDisplay error={error} onRetry={fetchData} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title="الحجوزات" />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="إجمالي الحجوزات"
          value={totalCount}
          icon={CalendarCheck}
        />
        <StatCard
          title="حجوزات مؤكدة"
          value={confirmedCount}
          icon={CheckCircle}
        />
        <StatCard
          title="حجوزات قيد الانتظار"
          value={pendingCount}
          icon={Clock}
        />
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <Select
          dir="rtl"
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="تصفية حسب الحالة" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الحالات</SelectItem>
            <SelectItem value="PENDING">قيد الانتظار</SelectItem>
            <SelectItem value="CONFIRMED">مؤكد</SelectItem>
            <SelectItem value="CANCELLED">ملغي</SelectItem>
            <SelectItem value="FAILED">فشل</SelectItem>
            <SelectItem value="SUCCESS">نجح</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Bookings Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {statusFilter === "all"
              ? "جميع الحجوزات"
              : `الحجوزات - ${statusFilter}`}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {filteredBookings.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-text-muted">لا توجد حجوزات متاحة</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-right">رقم الحجز</TableHead>
                  <TableHead className="text-right">اسم العميل</TableHead>
                  <TableHead className="text-right">رقم الهاتف</TableHead>
                  <TableHead className="text-right">اسم الرحلة</TableHead>
                  <TableHead className="text-right">المورد</TableHead>
                  <TableHead className="text-right">المبلغ</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">التاريخ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBookings.map((booking) => {
                  const trip = trips.find((t) => t.id === booking.trip_id)
                  const supplier = suppliers.find(
                    (s) => s.id === booking.supplier_id,
                  )
                  return (
                    <TableRow key={booking.id} className="hover:bg-duck-cyan/5 transition-colors">
                      <TableCell className="font-medium">
                        #{booking.id}
                      </TableCell>
                      <TableCell>{booking.full_name}</TableCell>
                      <TableCell className="text-text-muted">
                        {booking.phone_number}
                      </TableCell>
                      <TableCell>{trip?.name.ar || "-"}</TableCell>
                      <TableCell>{getSupplierName(supplier)}</TableCell>
                      <TableCell>
                        {formatCurrency(booking.amount, booking.currency)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={booking.status} type="booking" />
                      </TableCell>
                      <TableCell className="text-text-muted">
                        {formatDateTime(booking.created_at)}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
