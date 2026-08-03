"use client"

import {
  Banknote,
  CalendarCheck,
  CheckCircle,
  Clock,
  RefreshCw,
  RotateCcw,
  Search,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import StatCard from "@/components/shared/stat-card"
import {
  ALL_BOOKING_STATUSES,
  ACTIVE_BOOKING_STATUSES,
  getBookingStatusLabel,
} from "@/lib/constants"
import type { Booking, BookingStatus } from "@/lib/types"
import { bookingSortOptions } from "@/lib/booking-utils"
import type { BookingQueryState } from "./use-booking-query-state"

interface BookingStatsRowProps {
  bookings: Booking[]
  showRefundPending?: boolean
  activeStatusFilter: BookingStatus | "all" | "active"
  onStatusFilter: (status: BookingStatus | "all" | "active") => void
}

export function BookingStatsRow({
  bookings,
  showRefundPending = true,
  activeStatusFilter,
  onStatusFilter,
}: BookingStatsRowProps) {
  const totalCount = bookings.length
  const activeCount = bookings.filter((b) =>
    ACTIVE_BOOKING_STATUSES.includes(b.status),
  ).length
  const pendingCount = bookings.filter((b) => b.status === "PENDING").length
  const refundPendingCount = bookings.filter(
    (b) => b.status === "REFUND_PENDING",
  ).length

  return (
    <div
      className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${showRefundPending ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}
    >
      <StatCard
        title="إجمالي الحجوزات"
        value={totalCount}
        icon={CalendarCheck}
        active={activeStatusFilter === "all"}
        onClick={() => onStatusFilter("all")}
      />
      <StatCard
        title="حجوزات نشطة / مدفوعة"
        value={activeCount}
        icon={CheckCircle}
        active={activeStatusFilter === "active"}
        onClick={() => onStatusFilter("active")}
      />
      <StatCard
        title="قيد الانتظار"
        value={pendingCount}
        icon={Clock}
        active={activeStatusFilter === "PENDING"}
        onClick={() => onStatusFilter("PENDING")}
      />
      {showRefundPending && (
        <StatCard
          title="في انتظار الاسترداد"
          value={refundPendingCount}
          icon={Banknote}
          active={activeStatusFilter === "REFUND_PENDING"}
          onClick={() => onStatusFilter("REFUND_PENDING")}
        />
      )}
    </div>
  )
}

interface BookingToolbarProps {
  state: BookingQueryState
  resultCount: number
  totalCount: number
  onChange: (patch: Partial<BookingQueryState>, resetPage?: boolean) => void
  onReset: () => void
  onRefresh: () => void
  isRefreshing?: boolean
}

export function BookingToolbar({
  state,
  resultCount,
  totalCount,
  onChange,
  onReset,
  onRefresh,
  isRefreshing = false,
}: BookingToolbarProps) {
  const hasActiveFilters =
    state.search.trim() !== "" ||
    state.status !== "all" ||
    state.payment !== "all" ||
    state.sort !== "created_desc"

  return (
    <div className="dashboard-surface space-y-4 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-text-muted"
            aria-hidden
          />
          <Input
            value={state.search}
            onChange={(e) => onChange({ search: e.target.value }, true)}
            placeholder="ابحث بالاسم، الهاتف، أو رقم الحجز…"
            className="ps-9"
            aria-label="بحث في الحجوزات"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing}
            aria-label="تحديث القائمة"
          >
            <RefreshCw
              className={`size-4 ${isRefreshing ? "animate-spin" : ""}`}
              aria-hidden
            />
            تحديث
          </Button>
          {hasActiveFilters && (
            <Button type="button" variant="ghost" size="sm" onClick={onReset}>
              <RotateCcw className="size-4" aria-hidden />
              إعادة ضبط
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Select
          dir="rtl"
          value={state.status}
          onValueChange={(v) =>
            onChange(
              { status: v as BookingQueryState["status"] },
              true,
            )
          }
        >
          <SelectTrigger className="w-full sm:w-[220px]" aria-label="تصفية الحالة">
            <SelectValue placeholder="تصفية حسب الحالة" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الحالات</SelectItem>
            <SelectItem value="active">نشط / مدفوع</SelectItem>
            {ALL_BOOKING_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {getBookingStatusLabel(s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          dir="rtl"
          value={state.payment}
          onValueChange={(v) =>
            onChange(
              { payment: v as BookingQueryState["payment"] },
              true,
            )
          }
        >
          <SelectTrigger className="w-full sm:w-[200px]" aria-label="تصفية الدفع">
            <SelectValue placeholder="طريقة الدفع" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل طرق الدفع</SelectItem>
            <SelectItem value="KASHIER">كاشير</SelectItem>
            <SelectItem value="MANUAL">إنستاباي / يدوي</SelectItem>
          </SelectContent>
        </Select>

        <Select
          dir="rtl"
          value={state.sort}
          onValueChange={(v) =>
            onChange({ sort: v as BookingQueryState["sort"] }, true)
          }
        >
          <SelectTrigger className="w-full sm:w-[200px]" aria-label="ترتيب النتائج">
            <SelectValue placeholder="ترتيب" />
          </SelectTrigger>
          <SelectContent>
            {bookingSortOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <p className="text-sm text-text-muted" aria-live="polite">
        {resultCount === totalCount
          ? `${totalCount} حجز`
          : `${resultCount} من ${totalCount} حجز`}
      </p>
    </div>
  )
}
