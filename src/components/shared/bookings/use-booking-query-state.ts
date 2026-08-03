"use client"

import { useCallback, useMemo } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import type { BookingStatus } from "@/lib/types"
import { ALL_BOOKING_STATUSES } from "@/lib/constants"
import type { BookingSortField } from "@/lib/booking-utils"

export interface BookingQueryState {
  search: string
  status: BookingStatus | "all" | "active"
  payment: "all" | "KASHIER" | "MANUAL"
  sort: BookingSortField
  page: number
  expanded: number | null
}

const DEFAULT_STATE: BookingQueryState = {
  search: "",
  status: "all",
  payment: "all",
  sort: "created_desc",
  page: 1,
  expanded: null,
}

function parseIntParam(value: string | null): number | null {
  if (!value) return null
  const n = Number.parseInt(value, 10)
  return Number.isFinite(n) ? n : null
}

export function useBookingQueryState() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const state = useMemo<BookingQueryState>(() => {
    const status = searchParams.get("status")
    const payment = searchParams.get("payment")
    const sort = searchParams.get("sort")
    const page = parseIntParam(searchParams.get("page"))
    const expanded = parseIntParam(searchParams.get("expanded"))

    const validSorts: BookingSortField[] = [
      "created_desc",
      "created_asc",
      "date_desc",
      "date_asc",
      "amount_desc",
      "amount_asc",
    ]

    const parsedStatus = status as BookingStatus | "all" | "active" | null

    return {
      search: searchParams.get("q") ?? DEFAULT_STATE.search,
      status:
        parsedStatus === "active" ||
        parsedStatus === "all" ||
        (parsedStatus && ALL_BOOKING_STATUSES.includes(parsedStatus as BookingStatus))
          ? (parsedStatus as BookingQueryState["status"])
          : DEFAULT_STATE.status,
      payment:
        payment === "KASHIER" || payment === "MANUAL"
          ? payment
          : DEFAULT_STATE.payment,
      sort: validSorts.includes(sort as BookingSortField)
        ? (sort as BookingSortField)
        : DEFAULT_STATE.sort,
      page: page && page > 0 ? page : DEFAULT_STATE.page,
      expanded: expanded,
    }
  }, [searchParams])

  const setState = useCallback(
    (patch: Partial<BookingQueryState>, resetPage = false) => {
      const next = {
        ...state,
        ...patch,
        page: resetPage ? 1 : (patch.page ?? state.page),
      }

      const params = new URLSearchParams()
      if (next.search.trim()) params.set("q", next.search.trim())
      if (next.status !== "all") params.set("status", next.status)
      if (next.payment !== "all") params.set("payment", next.payment)
      if (next.sort !== DEFAULT_STATE.sort) params.set("sort", next.sort)
      if (next.page > 1) params.set("page", String(next.page))
      if (next.expanded != null) params.set("expanded", String(next.expanded))

      const query = params.toString()
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      })
    },
    [pathname, router, state],
  )

  const resetFilters = useCallback(() => {
    router.replace(pathname, { scroll: false })
  }, [pathname, router])

  return { state, setState, resetFilters }
}
