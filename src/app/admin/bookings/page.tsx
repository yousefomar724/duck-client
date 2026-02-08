"use client"

import { useState } from "react"
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
import { Card, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { mockBookings, mockTrips, mockSuppliers } from "@/lib/mock-data"
import { formatCurrency, formatDateTime } from "@/lib/constants"
import type { BookingStatus } from "@/lib/types"

export default function AdminBookings() {
  const [statusFilter, setStatusFilter] = useState<BookingStatus | "all">("all")
  const [supplierFilter, setSupplierFilter] = useState<number | "all">("all")

  // Filter bookings
  const filteredBookings = mockBookings.filter((booking) => {
    const matchesStatus =
      statusFilter === "all" || booking.status === statusFilter
    const matchesSupplier =
      supplierFilter === "all" || booking.supplier_id === supplierFilter
    return matchesStatus && matchesSupplier
  })

  return (
    <div className="space-y-6">
      <PageHeader title="الحجوزات" />

      {/* Filters */}
      <div className="flex gap-4">
        <Select
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
            <SelectItem value="COMPLETED">مكتمل</SelectItem>
            <SelectItem value="CANCELLED">ملغي</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={supplierFilter.toString()}
          onValueChange={(v) =>
            setSupplierFilter(v === "all" ? "all" : Number(v))
          }
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="تصفية حسب المورد" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الموردين</SelectItem>
            {mockSuppliers.map((supplier) => (
              <SelectItem key={supplier.id} value={supplier.id.toString()}>
                {supplier.name.ar}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Bookings Table */}
      <Card>
        <CardContent className="p-6">
          <Table>
            <TableHeader>
              <TableRow>
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
                const trip = mockTrips.find((t) => t.id === booking.trip_id)
                const supplier = mockSuppliers.find(
                  (s) => s.id === booking.supplier_id,
                )
                return (
                  <TableRow key={booking.id}>
                    <TableCell className="font-medium">#{booking.id}</TableCell>
                    <TableCell>{booking.full_name}</TableCell>
                    <TableCell className="text-text-muted">
                      {booking.phone_number}
                    </TableCell>
                    <TableCell>{trip?.name.ar || "-"}</TableCell>
                    <TableCell>{supplier?.name.ar || "-"}</TableCell>
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
        </CardContent>
      </Card>
    </div>
  )
}
