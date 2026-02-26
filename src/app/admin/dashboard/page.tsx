"use client"

import { useState, useEffect } from "react"
import { CalendarCheck, DollarSign, Ship, Users } from "lucide-react"
import StatCard from "@/components/shared/stat-card"
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
import { formatCurrency, formatDateTime } from "@/lib/constants"
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

  // Get recent bookings (last 10)
  const recentBookings = [...bookings]
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )
    .slice(0, 10)

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="إجمالي الحجوزات"
          value={totalBookings}
          icon={CalendarCheck}
        />
        <StatCard
          title="إجمالي الإيرادات"
          value={formatCurrency(totalRevenue)}
          icon={DollarSign}
        />
        <StatCard
          title="الموردين النشطين"
          value={activeSuppliers}
          icon={Users}
        />
        <StatCard title="الرحلات النشطة" value={activeTrips} icon={Ship} />
      </div>

      {/* Recent Bookings Table */}
      <Card>
        <CardHeader>
          <CardTitle>الحجوزات الأخيرة</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-right">رقم الحجز</TableHead>
                <TableHead className="text-right">اسم العميل</TableHead>
                <TableHead className="text-right">اسم الرحلة</TableHead>
                <TableHead className="text-right">المبلغ</TableHead>
                <TableHead className="text-right">الحالة</TableHead>
                <TableHead className="text-right">التاريخ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentBookings.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-8 h-44 text-text-muted"
                  >
                    لا توجد حجوزات
                  </TableCell>
                </TableRow>
              ) : (
                recentBookings.map((booking) => {
                  const trip = trips.find((t) => t.id === booking.trip_id)
                  return (
                    <TableRow key={booking.id} className="hover:bg-duck-cyan/5 transition-colors">
                      <TableCell className="font-medium">
                        #{booking.id}
                      </TableCell>
                      <TableCell>{booking.full_name}</TableCell>
                      <TableCell>{trip?.name?.ar ?? "-"}</TableCell>
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
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
