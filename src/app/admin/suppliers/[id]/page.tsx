"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import {
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table"
import {
  Banknote,
  CalendarCheck,
  MoreHorizontal,
  Ship,
  Wallet as WalletIcon,
} from "lucide-react"
import PageHeader from "@/components/shared/page-header"
import StatCard from "@/components/shared/stat-card"
import { ErrorDisplay } from "@/components/shared/error-display"
import { DashboardSkeleton } from "@/components/shared/loading-skeletons"
import { EmptyState } from "@/components/dashboard/empty-state"
import { DetailField } from "@/components/dashboard/detail-field"
import { DataTable } from "@/components/dashboard/data-table"
import { BookingCardList } from "@/components/dashboard/bookings/booking-card-list"
import {
  getBookingColumns,
  getBookingRowClassName,
} from "@/components/dashboard/bookings/booking-columns"
import { bookingStrings } from "@/components/dashboard/bookings/booking-strings"
import type { BookingActionType } from "@/components/dashboard/bookings/booking-actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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
import { computeBookingStats } from "@/lib/bookings/stats"
import { formatCurrency, payoutStatusColors } from "@/lib/constants"
import { DASHBOARD_LANG } from "@/lib/dashboard/strings"
import { resolveLocalizedField } from "@/lib/dashboard/localize"
import { DUCK_LOGO_PLACEHOLDER, resolveImageUrl } from "@/lib/image-utils"
import { useToast } from "@/lib/stores/toast-store"
import * as bookingsApi from "@/lib/api/bookings"
import * as tripsApi from "@/lib/api/trips"
import * as suppliersApi from "@/lib/api/suppliers"
import * as payoutsApi from "@/lib/api/payouts"
import * as supplierStorageApi from "@/lib/api/supplier-storage"
import * as walletApi from "@/lib/api/wallet"
import * as authApi from "@/lib/api/auth"
import type { Booking, Payout, PayoutStatus, Supplier, SupplierStorage, Trip, Wallet } from "@/lib/types"

function supplierName(supplier: Supplier | null): string {
  if (!supplier) return "المورد"
  return resolveLocalizedField(supplier.name, "المورد")
}

export default function AdminSupplierDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params.id
  const router = useRouter()
  const { addToast } = useToast()

  const [supplier, setSupplier] = useState<Supplier | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [trips, setTrips] = useState<Trip[]>([])
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [storage, setStorage] = useState<SupplierStorage | null>(null)
  const [wallet, setWallet] = useState<Wallet | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updating, setUpdating] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [loadingAction, setLoadingAction] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const [supplierRes, bookingsRes, tripsRes, payoutsRes, storageRes, walletsRes] =
        await Promise.all([
          suppliersApi.getSupplier(id, DASHBOARD_LANG),
          bookingsApi.getBookings({ supplier_id: id }),
          tripsApi.getTrips(DASHBOARD_LANG, id),
          payoutsApi.getPayouts(undefined, id),
          supplierStorageApi.getStorage(id),
          walletApi.getAllWallets(),
        ])
      if (supplierRes.error || !supplierRes.data) {
        setError(supplierRes.error || "المورد غير موجود")
        return
      }
      setSupplier(supplierRes.data)
      setBookings(bookingsRes.data || [])
      setTrips(tripsRes.data || [])
      setPayouts(payoutsRes.data || [])
      setStorage(storageRes.data)
      setWallet(
        (walletsRes.data || []).find((item) => item.supplier_id === id) ?? null,
      )
    } catch {
      setError("حدث خطأ أثناء تحميل بيانات المورد")
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const stats = useMemo(() => computeBookingStats(bookings), [bookings])
  const recentBookings = useMemo(
    () =>
      [...bookings]
        .sort((a, b) => {
          const da = new Date(a.booking_date ?? a.created_at ?? 0).getTime()
          const db = new Date(b.booking_date ?? b.created_at ?? 0).getTime()
          return db - da
        })
        .slice(0, 10),
    [bookings],
  )

  const handleActivateToggle = async () => {
    if (!supplier?.user_id) return
    const newActive = !(supplier.active ?? true)
    try {
      setUpdating(true)
      const res = await authApi.activateUser(supplier.user_id, newActive)
      if (res.error) {
        addToast("فشل في تحديث حالة المورد", "error")
        return
      }
      setSupplier({ ...supplier, active: newActive })
    } finally {
      setUpdating(false)
    }
  }

  const handleDelete = async () => {
    if (!supplier?.user_id) return
    try {
      setIsDeleting(true)
      const res = await authApi.deleteUser(supplier.user_id)
      if (res.error) {
        addToast("فشل في حذف المورد", "error")
        return
      }
      router.push("/admin/suppliers")
    } finally {
      setIsDeleting(false)
    }
  }

  const handleAction = useCallback(
    async (type: BookingActionType, booking: Booking, note?: string) => {
      const bookingId = booking.ID
      setLoadingAction(bookingId)
      try {
        if (type === "adminDelete") {
          const { error: err } = await bookingsApi.deleteBooking(bookingId, note)
          if (err) {
            addToast(err, "error")
            return
          }
          addToast(bookingStrings.adminDeleteSuccess, "success")
        } else if (type === "adminCancel") {
          const { error: err } = await bookingsApi.adminCancelBooking(bookingId, note)
          if (err) {
            addToast(err, "error")
            return
          }
          addToast(bookingStrings.adminCancelSuccess, "success")
        }
        await fetchData()
      } finally {
        setLoadingAction(null)
      }
    },
    [addToast, fetchData],
  )

  const columns = useMemo(
    () =>
      getBookingColumns({
        role: "admin",
        trips,
        suppliers: supplier ? [supplier] : [],
        loadingAction,
        hideSupplier: true,
        onAction: handleAction,
      }),
    [trips, supplier, loadingAction, handleAction],
  )

  const table = useReactTable({
    data: recentBookings,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  if (isLoading) return <DashboardSkeleton />
  if (error || !supplier) {
    return <ErrorDisplay error={error || "المورد غير موجود"} onRetry={fetchData} />
  }

  const name = supplierName(supplier)
  const isActive = supplier.active !== false
  const iconSrc = resolveImageUrl(supplier.icon) ?? DUCK_LOGO_PLACEHOLDER

  return (
    <div className="space-y-6">
      <PageHeader
        title={name}
        description="الموردين"
      >
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <div className="flex items-center gap-2 rounded-lg border px-3 py-2">
            <span className="text-sm">{isActive ? "نشط" : "غير نشط"}</span>
            <Switch
              checked={isActive}
              onCheckedChange={handleActivateToggle}
              disabled={!supplier.user_id || updating}
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" size="icon" className="size-11!">
                <MoreHorizontal className="size-4" />
                <span className="sr-only">المزيد</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                variant="destructive"
                disabled={!supplier.user_id}
                onClick={() => setDeleteOpen(true)}
              >
                حذف المورد
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </PageHeader>

      <div className="flex items-center gap-3">
        <Avatar className="size-14">
          <AvatarImage src={iconSrc} alt={name} />
          <AvatarFallback>{name.charAt(0)}</AvatarFallback>
        </Avatar>
        <div>
          <p className="text-sm text-text-muted">التقييم {supplier.rate ?? 0}</p>
          <p className="text-xs text-text-muted">
            <Link href="/admin/suppliers" className="hover:underline">
              الموردين
            </Link>
            {" / "}
            {name}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard title="إجمالي الحجوزات" value={stats.total} icon={CalendarCheck} />
        <StatCard
          title={bookingStrings.netCollected}
          value={formatCurrency(stats.netCollected)}
          icon={Banknote}
          tone="success"
        />
        <StatCard
          title={bookingStrings.totalRemaining}
          value={formatCurrency(stats.outstanding)}
          icon={WalletIcon}
          tone="warning"
        />
        <StatCard
          title="رصيد المحفظة"
          value={formatCurrency(wallet?.amount ?? 0)}
          icon={WalletIcon}
        />
      </div>

      <Tabs defaultValue="bookings" className="w-full">
        <div className="-mx-4 md:mx-0 md:px-0 overflow-x-auto px-4">
          <TabsList className="w-max h-auto flex-nowrap justify-start">
            <TabsTrigger value="bookings" className="flex-none">الحجوزات</TabsTrigger>
            <TabsTrigger value="trips" className="flex-none">الرحلات</TabsTrigger>
            <TabsTrigger value="storage" className="flex-none">المخزون</TabsTrigger>
            <TabsTrigger value="payouts" className="flex-none">المدفوعات</TabsTrigger>
            <TabsTrigger value="about" className="flex-none">نبذة</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="bookings" className="space-y-4 pt-4">
          {recentBookings.length === 0 ? (
            <EmptyState
              icon={CalendarCheck}
              title={bookingStrings.noBookings}
              description={bookingStrings.noBookingsDescription}
            />
          ) : (
            <>
              <div className="hidden md:block">
                <DataTable table={table} getRowClassName={getBookingRowClassName} />
              </div>
              <BookingCardList
                bookings={recentBookings}
                role="admin"
                trips={trips}
                suppliers={[supplier]}
                loadingAction={loadingAction}
                onAction={handleAction}
                onViewDetails={(booking) =>
                  router.push(
                    `/admin/bookings?q=${encodeURIComponent(booking.ID)}`,
                  )
                }
              />
            </>
          )}
          <Button asChild className="w-full sm:w-auto">
            <Link href={`/admin/bookings?supplier=${id}`}>
              عرض كل حجوزات المورد
            </Link>
          </Button>
        </TabsContent>

        <TabsContent value="trips" className="grid gap-3 pt-4 sm:grid-cols-2">
          {trips.length === 0 ? (
            <EmptyState icon={Ship} title="لا توجد رحلات" description="لم يضف هذا المورد رحلات بعد." />
          ) : (
            trips.map((trip) => (
              <Link
                key={trip.id}
                href={`/admin/trips/${trip.id}/edit`}
                className="rounded-lg border p-4 hover:bg-muted/40"
              >
                <p className="font-medium">{resolveLocalizedField(trip.name)}</p>
                <p className="text-sm text-text-muted">
                  {formatCurrency(trip.price, trip.currency)}
                </p>
              </Link>
            ))
          )}
        </TabsContent>

        <TabsContent value="storage" className="grid grid-cols-2 gap-3 pt-4 lg:grid-cols-3">
          {(["kayak", "water_cycle", "sup"] as const).map((key) => (
            <Card key={key}>
              <CardHeader>
                <CardTitle className="text-base">
                  {key === "kayak" ? "كاياك" : key === "sup" ? "التجديف وقوفاً" : "دراجة مائية"}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-bold">
                {storage?.resources?.[key] ?? 0}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="payouts" className="space-y-3 pt-4">
          {payouts.length === 0 ? (
            <p className="text-sm text-text-muted">لا توجد دفعات</p>
          ) : (
            payouts.map((payout) => {
              const tone = payoutStatusColors[payout.status as PayoutStatus]
              return (
                <Card key={payout.ID}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div>
                      <p className="font-medium">
                        {formatCurrency(payout.amount, payout.currency)}
                      </p>
                      <p className="text-xs text-text-muted">{payout.ID}</p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${tone?.bg ?? "bg-muted"} ${tone?.text ?? ""}`}
                    >
                      {tone?.label ?? payout.status}
                    </span>
                  </CardContent>
                </Card>
              )
            })
          )}
        </TabsContent>

        <TabsContent value="about" className="grid gap-4 pt-4 sm:grid-cols-2">
          <DetailField label="الاسم" value={name} />
          <DetailField label="التقييم" value={String(supplier.rate ?? 0)} />
          <DetailField
            label="الحالة"
            value={isActive ? "نشط" : "غير نشط"}
          />
          <div className="sm:col-span-2">
            <DetailField
              label="نبذة"
              value={resolveLocalizedField(supplier.about, "—")}
            />
          </div>
        </TabsContent>
      </Tabs>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف المورد</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف هذا المورد؟ سيتم حذف الحساب والبيانات المرتبطة
              به ولا يمكن التراجع عن هذه العملية.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-3">
            <AlertDialogCancel disabled={isDeleting}>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
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
