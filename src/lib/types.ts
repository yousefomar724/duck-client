export interface User {
  id: string
  username: string
  email: string
  role: 0 | 1 | 2 // 0=user, 1=supplier, 2=admin
  first_name: string
  last_name: string
  phone_number: string
  supplier_id?: string
  google_id?: string
  created_at: string
}

export interface Supplier {
  id: string
  user_id?: string
  name: string | { ar: string; en: string }
  about: string | { ar: string; en: string }
  icon: string
  rate: number
  active?: boolean
}

export interface Trip {
  id: string
  supplier_id: string
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
  tour_guide_id?: string
  tour_guide?: TourGuide
  destinations?: Destination[]
  created_at?: string
}

export type ResourceType = "kayak" | "water_cycle" | "sup"

export interface PaymentEntry {
  amount: number
  recorded_at: string
  note?: string
}

export interface PricingSnapshot {
  price: number
  foreigner_price: number
  guide_price: number
}

export interface BookingRevision {
  at: string
  by_user_id: string
  by_role: number
  note?: string
  amount_before: number
  amount_after: number
  changes: Record<string, { from: unknown; to: unknown }>
}

export interface Booking {
  ID: string
  session_id: string
  user_id: string
  user?: User
  trip_id: string
  trip?: Trip
  supplier_id: string
  supplier?: Supplier
  amount: number
  currency: string
  full_name: string
  phone_number: string
  status: BookingStatus
  created_at?: string
  CreatedAt?: string
  UpdatedAt?: string
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
  played_before?: boolean
  payment_method?: "KASHIER" | "MANUAL"
  /** What the customer declared they'd send at checkout (0/unset = full amount). */
  declared_amount?: number
  /** What has actually been confirmed received. */
  amount_paid?: number
  payment_entries?: PaymentEntry[]
  duration?: number
  pricing_snapshot?: PricingSnapshot
  pricing_locked?: boolean
  refund_owed?: number
  cancelled_at?: string
  cancelled_by?: string
  cancel_reason?: string
  revisions?: BookingRevision[]
}

export interface Wallet {
  id: string
  user_id: string
  amount: number
  supplier_id: string
}

export type DestinationActivity = "waterbike" | "sup" | "kayak"
export type DestinationPublicStatus = "open" | "coming-soon"

export interface Destination {
  id: string
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
  ID: string
  supplier_id: string
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
  ID: string
  name: string
  price: number
  phone_number: string
  created_at?: string
}

export type FeedbackContext = "booking" | "general"
export type FeedbackStatus = "new" | "read" | "archived"

export interface Feedback {
  id: string
  ID: string
  rating: number
  comment?: string
  name?: string
  contact?: string
  context: FeedbackContext
  booking_ref?: string
  page?: string
  locale?: string
  status: FeedbackStatus
  created_at?: string
  CreatedAt?: string
}

export interface ImageStorage {
  id: string
  user_id: string
  supplier_id?: string
  image_url: string
}

/** Supplier resource limits (kayak, water_cycle, sup) from GET /supplier-storage/:id */
export interface SupplierStorage {
  id: string
  supplier_id: string
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
  trip_id: string
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
  played_before?: boolean
  /** Channel the user heard about us from (e.g. instagram, facebook, friend, other). */
  hear_about_us?: string
  /** Free-text referral detail; required when hear_about_us is "friend" or "other". */
  referral_text?: string
  /** Amount the customer chose to send now (deposit or full); server clamps to a valid range. */
  declared_amount?: number
}

export interface CreateTripRequest {
  supplier_id?: string
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
  destination_ids?: string[]
  cancelation_policy?: { ar: string; en: string }
  refundable: boolean
  tour_guide_id?: string
}
