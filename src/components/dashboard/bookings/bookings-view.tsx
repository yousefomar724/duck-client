"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table"
import {
  Banknote,
  CalendarCheck,
  CheckCircle,
  Clock,
  Download,
  RefreshCw,
  Wallet,
} from "lucide-react"
import PageHeader from "@/components/shared/page-header"
import StatCard from "@/components/shared/stat-card"
import { ErrorDisplay } from "@/components/shared/error-display"
import { DataTablePageSkeleton } from "@/components/shared/loading-skeletons"
import { DataTable } from "@/components/dashboard/data-table"
import { DataTableToolbar } from "@/components/dashboard/data-table-toolbar"
import { DataTablePagination } from "@/components/dashboard/data-table-pagination"
import { EmptyState } from "@/components/dashboard/empty-state"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { BookingDetailSheet } from "./booking-detail-sheet"
import { BookingCardList } from "./booking-card-list"
import {
  getBookingColumns,
  getBookingRowClassName,
} from "./booking-columns"
import { bookingStrings, bookingColumnLabels } from "./booking-strings"
import {
  exportBookingsCsv,
  useBookingFilters,
  type DatePreset,
} from "./use-booking-filters"
import type { BookingActionType } from "./booking-actions"
import {
  ALL_BOOKING_STATUSES,
  bookingStatusMeta,
  needsAction,
  statusGroupLabels,
  type BookingStatusGroup,
} from "@/lib/bookings/status"
import { formatCurrency } from "@/lib/constants"
import { remainingAmount } from "@/lib/bookings/payment"
import type { Booking, BookingStatus, Supplier, TourGuide, Trip } from "@/lib/types"
import { useToast } from "@/lib/stores/toast-store"
import { DASHBOARD_LANG } from "@/lib/dashboard/strings"
import { resolveLocalizedField } from "@/lib/dashboard/localize"
import * as bookingsApi from "@/lib/api/bookings"
import * as tripsApi from "@/lib/api/trips"
import * as suppliersApi from "@/lib/api/suppliers"
import * as tourGuidesApi from "@/lib/api/tour-guides"

interface BookingsViewProps {
  role: "admin" | "supplier"
}

export function BookingsView({ role }: BookingsViewProps) {
  const { addToast } = useToast()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [trips, setTrips] = useState<Trip[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [tourGuides, setTourGuides] = useState<TourGuide[]>([])
  const {
    filters,
    setFilters,
    clearFilters,
    hasActiveFilters,
    filterBookings,
    activeFilterChips,
  } = useBookingFilters(role, suppliers)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [loadingAction, setLoadingAction] = useState<string | null>(null)
  const [guideUpdating, setGuideUpdating] = useState<string | null>(null)
  const [sorting, setSorting] = useState<SortingState>([
    { id: "booking_date", desc: true },
  ])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const [bookingsRes, guidesRes] = await Promise.all([
        role === "admin"
          ? bookingsApi.getBookings()
          : bookingsApi.getMyBookings(),
        tourGuidesApi.getTourGuides(),
      ])

      let tripsData: Trip[] = []
      let suppliersData: Supplier[] = []

      if (role === "admin") {
        const [tripsRes, suppliersRes] = await Promise.all([
          tripsApi.getTrips(DASHBOARD_LANG),
          suppliersApi.getSuppliers(DASHBOARD_LANG),
        ])
        if (tripsRes.error || suppliersRes.error) {
          setError(bookingStrings.loadError)
          return
        }
        tripsData = tripsRes.data || []
        suppliersData = suppliersRes.data || []
      }

      if (bookingsRes.error) {
        setError(bookingsRes.error)
        return
      }

      setBookings(bookingsRes.data || [])
      setTrips(tripsData)
      setSuppliers(suppliersData)
      setTourGuides(guidesRes.data || [])
      setLastUpdated(new Date())
    } catch {
      setError(bookingStrings.genericError)
    } finally {
      setIsLoading(false)
    }
  }, [role])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const filteredBookings = useMemo(
    () => filterBookings(bookings, trips, suppliers),
    [bookings, trips, suppliers, filterBookings],
  )

  const stats = useMemo(() => {
    const needsActionCount = bookings.filter(needsAction).length
    const confirmedCount = bookings.filter((b) => b.status === "CONFIRMED").length
    const pendingCount = bookings.filter((b) => b.status === "PENDING").length
    const refundPendingCount = bookings.filter(
      (b) => b.status === "REFUND_PENDING",
    ).length
    const pendingAmount = bookings
      .filter((b) => b.status === "PENDING")
      .reduce((sum, b) => sum + b.amount, 0)
    const totalRemaining = bookings
      .filter((b) => b.status === "CONFIRMED")
      .reduce((sum, b) => sum + remainingAmount(b), 0)

    return {
      total: bookings.length,
      confirmed: confirmedCount,
      pending: pendingCount,
      refundPending: refundPendingCount,
      needsAction: needsActionCount,
      pendingAmount,
      totalRemaining,
    }
  }, [bookings])

  const handleViewDetails = useCallback((booking: Booking) => {
    setSelectedBooking(booking)
    setSheetOpen(true)
  }, [])

  const handleAction = useCallback(
    async (
      type: BookingActionType,
      booking: Booking,
      note?: string,
      amount?: number,
    ) => {
      const id = booking.ID
      setLoadingAction(id)
      try {
        switch (type) {
          case "adminCancel": {
            const { error: err } = await bookingsApi.adminCancelBooking(id, note)
            if (err) {
              addToast(err, "error")
              return
            }
            addToast(bookingStrings.adminCancelSuccess, "success")
            break
          }
          case "processRefund": {
            const { data, error: err } = await bookingsApi.processRefund(id, note)
            if (err) {
              addToast(err, "error")
              return
            }
            if (data?.booking_status === "REFUNDED") {
              addToast(bookingStrings.refundProcessed, "success")
            } else if (data?.booking_status === "REFUND_FAILED") {
              addToast(bookingStrings.refundFailed, "error")
            } else {
              addToast(bookingStrings.refundProcessed, "success")
            }
            break
          }
          case "confirmPayment": {
            const { error: err } = await bookingsApi.confirmManualPayment(
              id,
              amount,
              note,
            )
            if (err) {
              addToast(err, "error")
              return
            }
            addToast(bookingStrings.paymentConfirmed, "success")
            break
          }
          case "refundPayment": {
            const { error: err } = await bookingsApi.refundManualPayment(id)
            if (err) {
              addToast(err, "error")
              return
            }
            addToast(bookingStrings.paymentRefunded, "success")
            break
          }
          case "collectBalance": {
            const { error: err } = await bookingsApi.collectBalance(
              id,
              amount,
              note,
            )
            if (err) {
              addToast(err, "error")
              return
            }
            addToast(bookingStrings.balanceCollected, "success")
            break
          }
        }
        await fetchData()
      } finally {
        setLoadingAction(null)
      }
    },
    [addToast, fetchData],
  )

  const handleGuideChange = useCallback(
    async (tripId: string, guideId: string) => {
      setGuideUpdating(tripId)
      const payload = {
        tour_guide_id: guideId === "none" ? null : guideId,
      }
      const { error: err } = await tripsApi.updateTrip(
        tripId,
        payload as Parameters<typeof tripsApi.updateTrip>[1],
      )
      setGuideUpdating(null)
      if (err) {
        addToast(err, "error")
        return
      }
      addToast(bookingStrings.guideUpdated, "success")
      await fetchData()
    },
    [addToast, fetchData],
  )

  const columns = useMemo(
    () =>
      getBookingColumns({
        role,
        trips,
        suppliers,
        loadingAction,
        onAction: handleAction,
      }),
    [role, trips, suppliers, loadingAction, handleAction],
  )

  const table = useReactTable({
    data: filteredBookings,
    columns,
    state: { sorting, columnVisibility },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 25 } },
  })

  const selectedTrip = selectedBooking
    ? trips.find((t) => t.id === selectedBooking.trip_id) ??
      selectedBooking.trip
    : undefined
  const selectedSupplier = selectedBooking
    ? suppliers.find((s) => s.id === selectedBooking.supplier_id) ??
      selectedBooking.supplier
    : undefined

  if (isLoading && bookings.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={bookingStrings.pageTitle}
          description={bookingStrings.pageDescription}
        />
        <DataTablePageSkeleton statCount={role === "admin" ? 4 : 3} />
      </div>
    )
  }

  if (error && bookings.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title={bookingStrings.pageTitle} />
        <ErrorDisplay error={error} onRetry={fetchData} />
      </div>
    )
  }

  const paginatedRows = table.getRowModel().rows.map((r) => r.original)
  const isEmpty = filteredBookings.length === 0

  return (
    <div className="space-y-6">
      <PageHeader
        title={bookingStrings.pageTitle}
        description={bookingStrings.pageDescription}
        sticky
      >
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={fetchData}
          disabled={isLoading}
        >
          <RefreshCw className={isLoading ? "animate-spin" : ""} />
          {bookingStrings.refresh}
        </Button>
        {lastUpdated && (
          <span className="text-xs text-text-muted hidden sm:inline">
            {bookingStrings.lastUpdated(
              lastUpdated.toLocaleTimeString("ar-EG", {
                hour: "2-digit",
                minute: "2-digit",
              }),
            )}
          </span>
        )}
      </PageHeader>

      <div
        className={`grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 ${role === "admin" ? "lg:grid-cols-5" : "lg:grid-cols-4"}`}
      >
        <StatCard
          title={bookingStrings.totalBookings}
          value={stats.total}
          icon={CalendarCheck}
          onClick={() => setFilters({ statusGroup: "all", status: "all" })}
          isActive={filters.statusGroup === "all" && filters.status === "all"}
        />
        <StatCard
          title={bookingStrings.confirmedBookings}
          value={stats.confirmed}
          icon={CheckCircle}
          tone="success"
          onClick={() => setFilters({ statusGroup: "active", status: "all" })}
          isActive={filters.statusGroup === "active"}
        />
        <StatCard
          title={bookingStrings.pendingBookings}
          value={stats.pending}
          icon={Clock}
          tone="warning"
          hint={
            stats.pendingAmount > 0
              ? formatCurrency(stats.pendingAmount)
              : undefined
          }
          onClick={() => setFilters({ status: "PENDING", statusGroup: "all" })}
          isActive={filters.status === "PENDING"}
        />
        <StatCard
          title={bookingStrings.totalRemaining}
          value={formatCurrency(stats.totalRemaining)}
          icon={Wallet}
          tone="warning"
          onClick={() => setFilters({ status: "CONFIRMED", statusGroup: "all" })}
          isActive={filters.status === "CONFIRMED"}
        />
        {role === "admin" && (
          <StatCard
            title={bookingStrings.refundPendingBookings}
            value={stats.refundPending}
            icon={Banknote}
            tone="danger"
            hint={
              stats.needsAction > 0
                ? bookingStrings.needsActionCount(stats.needsAction)
                : undefined
            }
            onClick={() =>
              setFilters({ statusGroup: "needsAction", status: "all" })
            }
            isActive={filters.statusGroup === "needsAction"}
          />
        )}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {filters.status !== "all"
              ? bookingStrings.filteredBookings(
                  bookingStatusMeta[filters.status as BookingStatus].label,
                )
              : filters.statusGroup !== "all"
                ? bookingStrings.filteredBookings(
                    statusGroupLabels[filters.statusGroup],
                  )
                : bookingStrings.allBookings}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <DataTableToolbar
            searchValue={filters.search}
            onSearchChange={(v) => setFilters({ search: v })}
            searchPlaceholder={bookingStrings.searchPlaceholder}
            activeFilters={activeFilterChips}
            onClearFilters={clearFilters}
            filteredCount={filteredBookings.length}
            totalCount={bookings.length}
            actions={
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => exportBookingsCsv(filteredBookings)}
                disabled={filteredBookings.length === 0}
              >
                <Download className="size-4" />
                {bookingStrings.exportCsv}
              </Button>
            }
          >
            <Select
              value={
                filters.status !== "all"
                  ? filters.status
                  : filters.statusGroup
              }
              onValueChange={(v) => {
                if (
                  ["all", "needsAction", "active", "done", "dead"].includes(v)
                ) {
                  setFilters({
                    statusGroup: v as BookingStatusGroup | "all",
                    status: "all",
                  })
                } else {
                  setFilters({
                    status: v as BookingStatus,
                    statusGroup: "all",
                  })
                }
              }}
            >
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder={bookingStrings.filterByStatus} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{bookingStrings.allStatuses}</SelectItem>
                {(
                  Object.entries(statusGroupLabels) as [
                    BookingStatusGroup | "all",
                    string,
                  ][]
                )
                  .filter(([k]) => k !== "all")
                  .map(([group, label]) => (
                    <SelectItem key={group} value={group}>
                      {label}
                    </SelectItem>
                  ))}
                <SelectGroup>
                  <SelectLabel>حالة محددة</SelectLabel>
                  {ALL_BOOKING_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {bookingStatusMeta[s].label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>

            <Select
              value={filters.paymentMethod}
              onValueChange={(v) =>
                setFilters({
                  paymentMethod: v as typeof filters.paymentMethod,
                })
              }
            >
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder={bookingStrings.filterByPayment} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{bookingStrings.allPayments}</SelectItem>
                <SelectItem value="MANUAL">يدوي</SelectItem>
                <SelectItem value="KASHIER">كاشير</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.paymentState}
              onValueChange={(v) =>
                setFilters({
                  paymentState: v as typeof filters.paymentState,
                })
              }
            >
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder={bookingStrings.paymentState} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{bookingStrings.allPaymentStates}</SelectItem>
                <SelectItem value="PAID">مدفوع بالكامل</SelectItem>
                <SelectItem value="PARTIAL">مدفوع جزئياً</SelectItem>
                <SelectItem value="UNPAID">غير مدفوع</SelectItem>
              </SelectContent>
            </Select>

            {role === "admin" && (
              <Select
                value={filters.supplierId}
                onValueChange={(v) => setFilters({ supplierId: v })}
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder={bookingStrings.filterBySupplier} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {bookingStrings.allSuppliers}
                  </SelectItem>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {typeof s.name === "string"
                        ? s.name
                        : resolveLocalizedField(s.name)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline" size="sm">
                  {bookingStrings.columns}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {table
                  .getAllColumns()
                  .filter((col) => col.getCanHide())
                  .map((col) => (
                    <DropdownMenuCheckboxItem
                      key={col.id}
                      checked={col.getIsVisible()}
                      onCheckedChange={(v) => col.toggleVisibility(!!v)}
                    >
                      {bookingColumnLabels[col.id] ?? col.id}
                    </DropdownMenuCheckboxItem>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </DataTableToolbar>

          <ToggleGroup
            type="single"
            value={filters.datePreset}
            onValueChange={(v) => {
              if (v) setFilters({ datePreset: v as DatePreset })
            }}
            className="flex-wrap justify-start"
          >
            <ToggleGroupItem value="all" size="sm" className="!min-w-fit">
              الكل
            </ToggleGroupItem>
            <ToggleGroupItem value="today" size="sm" className="!min-w-fit">
              {bookingStrings.today}
            </ToggleGroupItem>
            <ToggleGroupItem value="week" size="sm" className="!min-w-fit">
              {bookingStrings.thisWeek}
            </ToggleGroupItem>
            <ToggleGroupItem value="month" size="sm" className="!min-w-fit">
              {bookingStrings.thisMonth}
            </ToggleGroupItem>
            <ToggleGroupItem value="upcoming" size="sm" className="!min-w-fit">
              {bookingStrings.upcoming}
            </ToggleGroupItem>
          </ToggleGroup>

          {isEmpty ? (
            <EmptyState
              icon={CalendarCheck}
              title={
                hasActiveFilters
                  ? bookingStrings.noResults
                  : bookingStrings.noBookings
              }
              description={
                hasActiveFilters
                  ? bookingStrings.noResultsDescription
                  : bookingStrings.noBookingsDescription
              }
              actionLabel={
                hasActiveFilters ? bookingStrings.clearFilters : undefined
              }
              onAction={hasActiveFilters ? clearFilters : undefined}
            />
          ) : (
            <>
              <div className="hidden md:block">
                <DataTable
                  table={table}
                  onRowClick={handleViewDetails}
                  getRowClassName={getBookingRowClassName}
                />
              </div>
              <BookingCardList
                bookings={paginatedRows}
                role={role}
                trips={trips}
                suppliers={suppliers}
                loadingAction={loadingAction}
                onAction={handleAction}
                onViewDetails={handleViewDetails}
              />
              <DataTablePagination table={table} />
            </>
          )}
        </CardContent>
      </Card>

      <BookingDetailSheet
        booking={selectedBooking}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        role={role}
        trip={selectedTrip}
        supplier={selectedSupplier}
        tourGuides={tourGuides}
        guideUpdating={guideUpdating}
        loadingAction={loadingAction}
        onGuideChange={handleGuideChange}
        onAction={handleAction}
      />
    </div>
  )
}
