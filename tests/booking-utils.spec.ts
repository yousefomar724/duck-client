import { test, expect } from "@playwright/test"
import {
  filterBookings,
  paginateBookings,
  sortBookings,
} from "../src/lib/booking-utils"
import type { Booking } from "../src/lib/types"

const sampleBookings: Booking[] = [
  {
    ID: 1,
    session_id: "s1",
    user_id: 1,
    trip_id: 10,
    supplier_id: 1,
    amount: 200,
    currency: "EGP",
    full_name: "عمر أحمد",
    phone_number: "01001234567",
    status: "CONFIRMED",
    created_at: "2024-03-10T14:30:00Z",
    booking_date: "2024-04-01T09:00:00Z",
    payment_method: "KASHIER",
  },
  {
    ID: 2,
    session_id: "s2",
    user_id: 2,
    trip_id: 11,
    supplier_id: 1,
    amount: 150,
    currency: "EGP",
    full_name: "سارة محمد",
    phone_number: "01009876543",
    status: "PENDING",
    created_at: "2024-03-11T10:15:00Z",
    booking_date: "2024-04-05T09:00:00Z",
    payment_method: "MANUAL",
  },
  {
    ID: 3,
    session_id: "s3",
    user_id: 3,
    trip_id: 10,
    supplier_id: 2,
    amount: 360,
    currency: "EGP",
    full_name: "محمد علي",
    phone_number: "01005556666",
    status: "SUCCESS",
    created_at: "2024-03-05T16:45:00Z",
    booking_date: "2024-04-02T09:00:00Z",
    payment_method: "KASHIER",
  },
]

test.describe("booking utils", () => {
  test("filters by search query", () => {
    const result = filterBookings(sampleBookings, {
      search: "سارة",
      status: "all",
      payment: "all",
    })
    expect(result).toHaveLength(1)
    expect(result[0]?.ID).toBe(2)
  })

  test("filters by active status group", () => {
    const result = filterBookings(sampleBookings, {
      search: "",
      status: "active",
      payment: "all",
    })
    expect(result.map((b) => b.ID).sort()).toEqual([1, 3])
  })

  test("sorts by amount descending", () => {
    const result = sortBookings(sampleBookings, "amount_desc")
    expect(result.map((b) => b.amount)).toEqual([360, 200, 150])
  })

  test("paginates filtered results", () => {
    const filtered = filterBookings(sampleBookings, {
      search: "",
      status: "all",
      payment: "all",
    })
    const page = paginateBookings(filtered, 1, 2)
    expect(page.items).toHaveLength(2)
    expect(page.totalPages).toBe(2)
  })
})
