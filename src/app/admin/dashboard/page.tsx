"use client"

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
import { mockBookings, mockTrips, mockSuppliers } from "@/lib/mock-data"
import { formatCurrency, formatDateTime } from "@/lib/constants"

export default function AdminDashboard() {
  // Calculate stats
  const totalBookings = mockBookings.length
  const totalRevenue = mockBookings.reduce(
    (sum, booking) => sum + booking.amount,
    0,
  )
  const activeSuppliers = mockSuppliers.length
  const activeTrips = mockTrips.length

  // Get recent bookings (last 10)
  const recentBookings = [...mockBookings]
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
              <TableRow>
                <TableHead className="text-right">رقم الحجز</TableHead>
                <TableHead className="text-right">اسم العميل</TableHead>
                <TableHead className="text-right">اسم الرحلة</TableHead>
                <TableHead className="text-right">المبلغ</TableHead>
                <TableHead className="text-right">الحالة</TableHead>
                <TableHead className="text-right">التاريخ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentBookings.map((booking) => {
                const trip = mockTrips.find((t) => t.id === booking.trip_id)
                return (
                  <TableRow key={booking.id}>
                    <TableCell className="font-medium">#{booking.id}</TableCell>
                    <TableCell>{booking.full_name}</TableCell>
                    <TableCell>{trip?.name.ar || "-"}</TableCell>
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
