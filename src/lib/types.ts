export interface User {
  id: number
  username: string
  email: string
  role: 0 | 1 | 2 // 0=user, 1=supplier, 2=admin
  first_name: string
  last_name: string
  phone_number: string
  supplier_id?: number
  google_id?: string
  created_at: string
}

export interface Supplier {
  id: number
  user_id: number
  name: { ar: string; en: string }
  about: { ar: string; en: string }
  icon: string
  rate: number
}

export interface Trip {
  id: number
  supplier_id: number
  supplier?: Supplier
  price: number
  currency: string
  rate: number
  destination: string
  location: string
  from: string // ISO date
  to: string // ISO date
  itinerary: { ar: string; en: string }[]
  name: { ar: string; en: string }
  description: { ar: string; en: string }
  availability: { date: string; slots: number }[]
  max_guests: number
  images: string[]
  cancelation_policy: { ar: string; en: string }
  refundable: boolean
  tour_guide_id?: number
  created_at: string
}

export interface Booking {
  id: number
  session_id: string
  user_id: number
  user?: User
  trip_id: number
  trip?: Trip
  supplier_id: number
  supplier?: Supplier
  amount: number
  currency: string
  full_name: string
  phone_number: string
  status: BookingStatus
  created_at: string
}

export interface Wallet {
  id: number
  user_id: number
  amount: number
  supplier_id: number
}

export interface Destination {
  id: number
  name: { ar: string; en: string }
  description: { ar: string; en: string }
  image: string
  status: "active" | "inactive"
  trip_count: number
}

export interface Payout {
  id: number
  supplier_id: number
  supplier?: Supplier
  amount: number
  currency: string
  status: PayoutStatus
  date: string
}

export type BookingStatus = "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED"
export type PayoutStatus = "pending" | "paid" | "failed"
export type UserRole = 0 | 1 | 2
