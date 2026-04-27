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
  is_tour?: boolean
  price: number
  foreigner_price: number
  guide_mandatory: boolean
  guide_price: number
  display_order: number
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

export type ResourceType = "kayak" | "water_cycle" | "sup"

export interface Booking {
  ID: number
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
  /** ISO 8601 date string */
  booking_date?: string
  quantity?: number
  local_guests?: number
  foreigner_guests?: number
  hear_about_us?: string
  referral_text?: string
  resource_type?: string
  order_ref?: string
  order_id?: string
  wants_guide?: boolean
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
  ID: number
  supplier_id: number
  supplier?: Supplier
  amount: number
  currency: string
  /** Backend may return additional string statuses (e.g. success, confirmed). */
  status: PayoutStatus | string
  /** Legacy/mock field; API uses GORM `CreatedAt` / `created_at`. */
  date?: string
  CreatedAt?: string
  created_at?: string
}

export type BookingStatus =
  | "PENDING"
  | "CONFIRMED"
  | "CANCELLED"
  | "FAILED"
  | "SUCCESS"
  | "REFUND_PENDING"
  | "REFUNDED"
  | "REFUND_FAILED"
  | "COMPLETED"
  | "PAID"
export type PayoutStatus =
  | "pending"
  | "paid"
  | "failed"
  | "success"
  | "confirmed"
export type UserRole = 0 | 1 | 2

// Additional types for API integration
export interface TourGuide {
  ID: number
  name: string
  price: number
  phone_number: string
  created_at?: string
}

export interface ImageStorage {
  id: number
  user_id: number
  supplier_id?: number
  image_url: string
}

/** Supplier resource limits (kayak, water_cycle, sup) from GET /supplier-storage/:id */
export interface SupplierStorage {
  id: number
  supplier_id: number
  supplier?: Supplier
  /** Parsed JSON map of resource type -> max count */
  resources: Record<string, number>
}

export interface SetStorageRequest {
  resources: Record<string, number>
}

export interface RegisterInput {
  username: string
  email: string
  password: string
  first_name: string
  last_name: string
  phone_number?: string
  role: 0 | 1 // 0 = normal user, 1 = supplier
}

export interface CreateBookingRequest {
  trip_id: number
  full_name: string
  phone_number: string
  /** ISO 8601 datetime string */
  booking_date: string
  resource_type: ResourceType
  /** Total quantity (equals local_guests + foreigner_guests; server recomputes for non-tours). */
  quantity: number
  local_guests: number
  foreigner_guests: number
  duration?: number
  /** User preference for a tour guide (ignored when guide_mandatory). */
  wants_guide?: boolean
  /** Channel the user heard about us from (e.g. instagram, facebook, friend, other). */
  hear_about_us?: string
  /** Free-text referral detail; required when hear_about_us is "friend" or "other". */
  referral_text?: string
}

export interface CreateTripRequest {
  supplier_id?: number
  is_tour?: boolean
  name: { ar: string; en: string }
  description: { ar: string; en: string }
  price: number
  foreigner_price: number
  guide_mandatory: boolean
  guide_price?: number
  display_order?: number
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
