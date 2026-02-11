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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatCurrency, formatDateTime } from "@/lib/constants"
import * as bookingsApi from "@/lib/api/bookings"
import { TableSkeleton } from "@/components/shared/loading-skeletons"
import { ErrorDisplay } from "@/components/shared/error-display"
import type { Booking, BookingStatus } from "@/lib/types"

export default function SupplierBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchBookings = async () => {
    setIsLoading(true)
    setError(null)
    const { data, error: fetchError } = await bookingsApi.getMyBookings()
    if (fetchError) {
      setError(fetchError)
    } else {
      setBookings(data || [])
    }
    setIsLoading(false)
  }

  useEffect(() => {
    fetchBookings()
  }, [])

  // Filter bookings by status
  let filteredBookings = bookings
  if (statusFilter !== "all") {
    filteredBookings = bookings.filter(
      (booking) => booking.status === statusFilter,
    )
  }

  // Get trip name for a booking
  const getTripName = (booking: Booking) => {
    if (booking.trip) {
      return typeof booking.trip.name === "string"
        ? booking.trip.name
        : booking.trip.name.ar
    }
    return "غير معروف"
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <PageHeader title="الحجوزات" />
        <TableSkeleton rows={5} columns={7} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <PageHeader title="الحجوزات" />
        <ErrorDisplay error={error} onRetry={fetchBookings} />
      </div>
    )
  }

  return (
    <div className="p-6">
      <PageHeader title="الحجوزات" />

      {/* Status Filter */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <label htmlFor="status-filter" className="text-sm font-medium">
            تصفية حسب الحالة:
          </label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">الكل</SelectItem>
              <SelectItem value="PENDING">قيد الانتظار</SelectItem>
              <SelectItem value="CONFIRMED">مؤكد</SelectItem>
              <SelectItem value="COMPLETED">مكتمل</SelectItem>
              <SelectItem value="CANCELLED">ملغي</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Bookings Table */}
      <div className="rounded-lg border border-gray-300-light bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-duck-navy/5">
              <TableHead className="text-right font-bold">رقم الحجز</TableHead>
              <TableHead className="text-right font-bold">اسم العميل</TableHead>
              <TableHead className="text-right font-bold">رقم الهاتف</TableHead>
              <TableHead className="text-right font-bold">اسم الرحلة</TableHead>
              <TableHead className="text-right font-bold">المبلغ</TableHead>
              <TableHead className="text-right font-bold">الحالة</TableHead>
              <TableHead className="text-right font-bold">التاريخ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredBookings.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center py-8 text-text-muted"
                >
                  لا توجد حجوزات
                </TableCell>
              </TableRow>
            ) : (
              filteredBookings.map((booking) => (
                <TableRow key={booking.id} className="hover:bg-duck-cyan/5">
                  <TableCell className="font-medium">#{booking.id}</TableCell>
                  <TableCell>{booking.full_name}</TableCell>
                  <TableCell className="font-mono text-sm">
                    {booking.phone_number}
                  </TableCell>
                  <TableCell>{getTripName(booking)}</TableCell>
                  <TableCell className="font-bold text-duck-navy">
                    {formatCurrency(booking.amount, booking.currency)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      status={booking.status as BookingStatus}
                      type="booking"
                    />
                  </TableCell>
                  <TableCell className="text-sm text-text-muted">
                    {formatDateTime(booking.created_at)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Summary Stats */}
      {filteredBookings.length > 0 && (
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-gray-300-light p-4">
            <div className="text-sm text-text-muted">إجمالي الحجوزات</div>
            <div className="text-2xl font-bold text-duck-navy mt-1">
              {filteredBookings.length}
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-300-light p-4">
            <div className="text-sm text-text-muted">إجمالي الإيرادات</div>
            <div className="text-2xl font-bold text-duck-cyan mt-1">
              {formatCurrency(
                filteredBookings.reduce((sum: number, b: Booking) => sum + b.amount, 0),
                "EGP",
              )}
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-300-light p-4">
            <div className="text-sm text-text-muted">الحجوزات المؤكدة</div>
            <div className="text-2xl font-bold text-green-600 mt-1">
              {filteredBookings.filter((b: Booking) => b.status === "CONFIRMED").length}
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-300-light p-4">
            <div className="text-sm text-text-muted">قيد الانتظار</div>
            <div className="text-2xl font-bold text-yellow-600 mt-1">
              {filteredBookings.filter((b: Booking) => b.status === "PENDING").length}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
