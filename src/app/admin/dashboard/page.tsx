"use client"

import { useState, useEffect } from "react"
import { CalendarCheck, DollarSign, Ship, Users } from "lucide-react"
import PageHeader from "@/components/shared/page-header"
import StatCard from "@/components/shared/stat-card"
import StatusBadge from "@/components/shared/status-badge"
import { EmptyState } from "@/components/dashboard/empty-state"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency, formatDateTime } from "@/lib/constants"
import { DASHBOARD_LANG } from "@/lib/dashboard/strings"
import { resolveLocalizedField } from "@/lib/dashboard/localize"
import * as bookingsApi from "@/lib/api/bookings"
import * as tripsApi from "@/lib/api/trips"
import * as suppliersApi from "@/lib/api/suppliers"
import { DashboardSkeleton } from "@/components/shared/loading-skeletons"
import { ErrorDisplay } from "@/components/shared/error-display"
import type { Booking, Trip, Supplier } from "@/lib/types"

export default function AdminDashboard() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [trips, setTrips] = useState<Trip[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
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
        suppliersApi.getSuppliers(DASHBOARD_LANG),
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

  if (isLoading) {
    return <DashboardSkeleton />
  }

  if (error) {
    return <ErrorDisplay error={error} onRetry={fetchData} />
  }

  // Calculate stats
  const totalBookings = bookings.length
  const totalRevenue = bookings.reduce(
    (sum, booking) => sum + booking.amount,
    0,
  )
  const activeSuppliers = suppliers.length
  const activeTrips = trips.length

  const recentBookings = [...bookings]
    .sort((a, b) => {
      const dateA = a.created_at ?? a.CreatedAt ?? a.UpdatedAt ?? 0
      const dateB = b.created_at ?? b.CreatedAt ?? b.UpdatedAt ?? 0
      return new Date(dateB).getTime() - new Date(dateA).getTime()
    })
    .slice(0, 10)

  return (
    <div className="space-y-6">
      <PageHeader
        title="لوحة التحكم"
        description="نظرة عامة على الحجوزات والإيرادات والنشاط"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="إجمالي الحجوزات"
          value={totalBookings}
          icon={CalendarCheck}
          tone="neutral"
        />
        <StatCard
          title="إجمالي الإيرادات"
          value={formatCurrency(totalRevenue)}
          icon={DollarSign}
          tone="success"
        />
        <StatCard
          title="الموردين النشطين"
          value={activeSuppliers}
          icon={Users}
        />
        <StatCard title="الرحلات النشطة" value={activeTrips} icon={Ship} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>الحجوزات الأخيرة</CardTitle>
        </CardHeader>
        <CardContent>
          {recentBookings.length === 0 ? (
            <EmptyState
              icon={CalendarCheck}
              title="لا توجد حجوزات"
              description="ستظهر أحدث الحجوزات هنا."
            />
          ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-right">اسم العميل</TableHead>
                <TableHead className="text-right">اسم الرحلة</TableHead>
                <TableHead className="text-right">المبلغ</TableHead>
                <TableHead className="text-right">الحالة</TableHead>
                <TableHead className="text-right">موعد الحجز</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentBookings.map((booking) => (
                    <TableRow
                      key={booking.ID}
                      className="hover:bg-duck-cyan/5 transition-colors cursor-pointer"
                      onClick={() => {
                        window.location.href = `/admin/bookings?q=${encodeURIComponent(booking.ID)}`
                      }}
                    >
                      <TableCell>{booking.full_name}</TableCell>
                      <TableCell>
                        {resolveLocalizedField(booking.trip?.name, "-")}
                      </TableCell>
                      <TableCell>
                        {formatCurrency(booking.amount, booking.currency)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={booking.status} type="booking" />
                      </TableCell>
                      <TableCell className="text-text-muted">
                        {formatDateTime(booking.booking_date ?? "")}
                      </TableCell>
                    </TableRow>
              ))}
            </TableBody>
          </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
