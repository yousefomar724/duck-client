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
  user_id?: number
  name: string | { ar: string; en: string }
  about: string | { ar: string; en: string }
  icon: string
  rate: number
  active?: boolean
}

export interface Trip {
  id: number
  supplier_id: number
  supplier?: Supplier
  price: number
  currency: string
  rate: number
  destination: boolean
  location: boolean
  from: string // ISO date
  to?: string // ISO date
  duration: number
  itinerary?: { ar: string; en: string }[] | { ar: string; en: string }
  name: { ar: string; en: string }
  description: { ar: string; en: string }
  availability?: { date: string; slots: number }[] | { ar: string; en: string }
  max_guests: number
  images?: string[] | { [key: string]: string }
  cancelation_policy: { ar: string; en: string }
  refundable: boolean
  tour_guide_id?: number
  tour_guide?: TourGuide
  destinations?: Destination[]
  created_at?: string
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

export type DestinationActivity = "waterbike" | "sup" | "kayak"
export type DestinationPublicStatus = "open" | "coming-soon"

export interface Destination {
  id: number
  name: { ar: string; en: string }
  description: { ar: string; en: string }
  image: string
  images?: string[]
  lat?: number
  lng?: number
  activities?: DestinationActivity[]
  status: "active" | "inactive"
  public_status?: DestinationPublicStatus
  operating_hours?: string
  trip_count?: number
  trips?: Trip[]
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

export type BookingStatus = "PENDING" | "CONFIRMED" | "CANCELLED" | "FAILED" | "SUCCESS"
export type PayoutStatus = "pending" | "paid" | "failed"
export type UserRole = 0 | 1 | 2

// Additional types for API integration
export interface TourGuide {
  id: number
  name: string
  price: number
  phone_number: string
  created_at?: string
}

export interface ImageStorage {
  id: number
  user_id: number
  supplier_id: number
  image_url: string
}

export interface RegisterInput {
  username: string
  email: string
  password: string
  first_name: string
  last_name: string
  phone_number?: string
  role?: number // 1 = supplier (default for /register page)
}

export interface CreateBookingRequest {
  trip_id: number
  full_name: string
  phone_number: string
}

export interface CreateTripRequest {
  supplier_id?: number
  name: { ar: string; en: string }
  description: { ar: string; en: string }
  price: number
  currency: string
  destination: boolean
  location: boolean
  from: string
  to?: string
  duration?: number
  itinerary?: { ar: string; en: string }
  availability?: { ar: string; en: string }
  max_guests: number
  images?: string[]
  destination_ids?: number[]
  cancelation_policy?: { ar: string; en: string }
  refundable: boolean
  tour_guide_id?: number
}
