# Plan: Connect duck-web (Next.js) with duck-api (Go)

## Context

The frontend (Next.js 16, React 19, TypeScript, shadcn/ui) is 95% UI-complete but uses entirely mock data with no real API calls, no auth system, and no route protection. The backend (Go, Echo, PostgreSQL, GORM) has auth, trips, suppliers, bookings, wallets, images, and tour guides endpoints but is missing Destination/Payout models and has several bugs. This plan connects both, fixing backend issues and adding missing features.

---

## Phase 1: Backend Bug Fixes

### 1.1 Fix `AdminAuth` middleware — checks `role != 1` instead of `role != 2`

- **File:** `duck-api/internal/middleware/jwt_auth.go:61`
- Change `role != 1` to `role != 2` so admin-only routes (wallet management, tour guide CRUD) require Admin role

### 1.2 Fix booking handler context key mismatch

- **File:** `duck-api/internal/handlers/booking_handler.go:43`
- Change `c.Get("userID")` to `c.Get("user_id")` to match what JWT middleware sets at `jwt_auth.go:44`

### 1.3 Remove unique constraint on `Trip.SupplierID`

- **File:** `duck-api/internal/models/trip.go:11`
- Change `gorm:"not null;unique"` to `gorm:"not null"` — suppliers should have multiple trips

### 1.4 Apply CORS middleware

- **File:** `duck-api/internal/middleware/cors.go` — verify it allows the frontend origin
- **File:** `duck-api/main.go` or `duck-api/internal/routes/api.go` — apply the CORS middleware to the Echo instance

---

## Phase 2: Backend New Models & Endpoints

### 2.1 Destination model + CRUD (admin-managed, many-to-many with trips)

**New files:**

- `duck-api/internal/models/destination.go`
- `duck-api/internal/repositories/destination_repository.go`
- `duck-api/internal/services/destination_service.go`
- `duck-api/internal/handlers/destination_handler.go`

**Destination model:**

```go
type Destination struct {
    gorm.Model
    Name        json.RawMessage `json:"name" gorm:"type:json;not null"`        // {ar, en}
    Description json.RawMessage `json:"description" gorm:"type:json;not null"` // {ar, en}
    Image       string          `json:"image"`
    Status      string          `json:"status" gorm:"default:'active'"`        // active/inactive
    Trips       []Trip          `json:"trips" gorm:"many2many:trip_destinations;"`
}
```

**Join table:** `trip_destinations` (auto-created by GORM many2many tag)

**Update Trip model** (`models/trip.go`):

- Add `Destinations []Destination gorm:"many2many:trip_destinations;"` field
- Keep `Destination bool` and `Location bool` as flags (has a destination? has a location?)

**Endpoints** (add to `routes/api.go`):
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/destinations` | Public | List all destinations (query: `lang`, `status`) |
| GET | `/destinations/:id` | Public | Get one destination |
| POST | `/destinations` | Admin | Create destination |
| PATCH | `/destinations/:id` | Admin | Update destination |
| DELETE | `/destinations/:id` | Admin | Delete destination |

### 2.2 Payout model + CRUD (admin creates manually)

**New files:**

- `duck-api/internal/models/payout.go`
- `duck-api/internal/repositories/payout_repository.go`
- `duck-api/internal/services/payout_service.go`
- `duck-api/internal/handlers/payout_handler.go`

**Payout model:**

```go
type Payout struct {
    gorm.Model
    SupplierID uint     `json:"supplier_id" gorm:"not null"`
    Supplier   Supplier `json:"supplier" gorm:"foreignKey:SupplierID"`
    Amount     float64  `json:"amount" gorm:"not null"`
    Currency   string   `json:"currency" gorm:"default:'EGP'"`
    Status     string   `json:"status" gorm:"default:'pending'"` // pending/paid/failed
}
```

**Endpoints:**
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/payouts` | Admin | List all payouts (query: `status`, `supplier_id`) |
| GET | `/payouts/:id` | Admin | Get one payout |
| POST | `/payouts` | Admin | Create payout |
| PATCH | `/payouts/:id` | Admin | Update payout (change status) |
| DELETE | `/payouts/:id` | Admin | Delete payout |

### 2.3 Add `GET /auth/me` endpoint

- **File:** `duck-api/internal/handlers/auth_handler.go` — add `Me` handler
- **File:** `duck-api/internal/routes/api.go` — add `auth.GET("/me", authHandler.Me, middleware.JWTAuth(cfg))`
- Returns the full User object (with Supplier relation if role=1) for the authenticated user

### 2.4 Add `GET /bookings` endpoints for listing bookings

- **File:** `duck-api/internal/handlers/booking_handler.go` — add `List` handler
- **File:** `duck-api/internal/repositories/booking_repo.go` — add `FindAll`, `FindBySupplierID` methods
- **File:** `duck-api/internal/services/booking_service.go` — add `ListBookings`, `ListSupplierBookings`
- **Routes:**
  - `GET /bookings` (Admin) — list all bookings with trip/supplier relations
  - `GET /bookings/my-bookings` (JWT) — list bookings for authenticated supplier's trips

### 2.5 Register auto-migrations for new models

- **File:** `duck-api/config/database.go` — add `Destination`, `Payout` to AutoMigrate call

---

## Phase 3: Frontend Foundation

### 3.1 Environment configuration

- **Create:** `duck-web/.env.local`
  ```
  NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1
  NEXT_PUBLIC_GOOGLE_CLIENT_ID=<from backend config>
  ```

### 3.2 Next.js API proxy (avoids CORS issues in dev)

- **Modify:** `duck-web/next.config.ts` — add `rewrites` to proxy `/api/*` to backend
  ```ts
  async rewrites() {
    return [{ source: '/api/:path*', destination: 'http://localhost:8080/api/:path*' }];
  }
  ```
- Also add `images.remotePatterns` for `localhost:8080` (uploaded images)

### 3.3 API client

- **Create:** `duck-web/src/lib/api/client.ts`
  - Fetch-based HTTP client (works in both server/client components)
  - Auto-attaches `Authorization: Bearer <token>` header
  - Auto-appends `?lang=` query param from current locale
  - Returns typed `{ data, error }` responses
  - Handles 401 by clearing auth and redirecting to `/login`
  - Special handling for `multipart/form-data` (image uploads)

### 3.4 API service modules (one per domain)

- **Create:** `duck-web/src/lib/api/auth.ts` — `login`, `loginWithGoogle`, `register`, `forgotPassword`, `resetPassword`, `getMe`
- **Create:** `duck-web/src/lib/api/trips.ts` — `getTrips`, `getTrip`, `getMyTrips`, `createTrip`, `updateTrip`, `deleteTrip`
- **Create:** `duck-web/src/lib/api/suppliers.ts` — `getSuppliers`, `getSupplier`, `updateSupplier`
- **Create:** `duck-web/src/lib/api/bookings.ts` — `createBooking`, `getBookings`, `getMyBookings`
- **Create:** `duck-web/src/lib/api/wallet.ts` — `getWallet`, `getAllWallets`, `updateBalance`
- **Create:** `duck-web/src/lib/api/images.ts` — `uploadImage`, `getImages`, `deleteImage`
- **Create:** `duck-web/src/lib/api/tour-guides.ts` — full CRUD
- **Create:** `duck-web/src/lib/api/destinations.ts` — full CRUD
- **Create:** `duck-web/src/lib/api/payouts.ts` — full CRUD
- **Create:** `duck-web/src/lib/api/index.ts` — barrel export

### 3.5 Update TypeScript types

- **Modify:** `duck-web/src/lib/types.ts`
  - `Trip.destination`: keep as `boolean` (flag)
  - `Trip.location`: keep as `boolean` (flag)
  - Add `destination_ids?: number[]` or `destinations?: Destination[]` to Trip
  - `BookingStatus`: add `"FAILED" | "SUCCESS"`, remove `"COMPLETED"`
  - Add `TourGuide` interface: `{ id, name, price, phone_number }`
  - Add `ImageStorage` interface: `{ id, user_id, supplier_id, image_url }`
  - Add `RegisterInput` interface
  - Add `CreateBookingRequest` interface
  - Add `CreateTripRequest` interface (multilingual fields as `{ ar: string, en: string }`)
  - Update `Destination` to include `trips?: Trip[]` relation

---

## Phase 4: Authentication System

### 4.1 Token storage utility

- **Create:** `duck-web/src/lib/auth/token.ts`
  - `setToken(token)`, `getToken()`, `clearToken()` using `localStorage`
  - `decodeToken(token)` — decode JWT payload to get `{ user_id, role, exp }`

### 4.2 Auth context provider

- **Create:** `duck-web/src/lib/auth/auth-context.tsx`
  - `AuthProvider` component wrapping app
  - `useAuth()` hook returning: `{ user, token, isLoading, isAuthenticated, login, loginWithGoogle, register, logout }`
  - On mount: read token, decode, check expiry, fetch `/auth/me` for full user profile
  - Store user profile (name, role, supplier info) in context state

### 4.3 Wire auth provider into root layout

- **Modify:** `duck-web/src/app/layout.tsx` — wrap children with `<AuthProvider>`

### 4.4 Protected route component

- **Create:** `duck-web/src/components/shared/protected-route.tsx`
  - Takes `allowedRoles: number[]` prop
  - Redirects to `/login` if not authenticated
  - Redirects to `/` if wrong role
  - Shows loading skeleton while checking auth

### 4.5 Apply route protection

- **Modify:** `duck-web/src/app/admin/layout.tsx` — wrap with `<ProtectedRoute allowedRoles={[2]}>`
- **Modify:** `duck-web/src/app/supplier/layout.tsx` — wrap with `<ProtectedRoute allowedRoles={[1]}>`

---

## Phase 5: Connect Auth Pages

### 5.1 Login page

- **Modify:** `duck-web/src/app/(auth)/login/page.tsx`
  - Wire form to `useAuth().login(email, password)`
  - Wire Google button to Google OAuth + `useAuth().loginWithGoogle(token)`
  - Add loading state, error display (inline or toast)
  - On success: redirect to `/supplier/my-trips` (role=1) or `/admin/dashboard` (role=2)

### 5.2 Register page

- **Modify:** `duck-web/src/app/(auth)/register/page.tsx`
  - Wire form to `register()` API call
  - Map fields: first_name, last_name, username (company name), email, phone, password
  - Add zod validation with react-hook-form
  - Auto-login after successful registration

### 5.3 Forgot password page

- **Modify:** `duck-web/src/app/(auth)/forgot-password/page.tsx`
  - Wire form to `forgotPassword(email)` API
  - Show success message after submission

### 5.4 Reset password page

- **Modify:** `duck-web/src/app/(auth)/reset-password/page.tsx`
  - Read `token` from URL query params
  - Wire form to `resetPassword(token, password)` API

---

## Phase 6: Connect Supplier Pages

### 6.1 Dynamic sidebar user info

- **Modify:** `duck-web/src/components/shared/supplier-sidebar.tsx`
  - Use `useAuth()` to get user name dynamically (from `/auth/me` response)
  - Wire logout button to `useAuth().logout()`

### 6.2 My Trips page

- **Modify:** `duck-web/src/app/supplier/my-trips/page.tsx`
  - Replace `mockTrips` with `getMyTrips(lang)` API call in `useEffect`
  - Add loading skeletons and error handling
  - Wire delete button to `deleteTrip(id)` + refetch

### 6.3 Create Trip page

- **Modify:** `duck-web/src/app/supplier/my-trips/create/page.tsx`
  - Update form fields: `destination`/`location` as boolean toggles
  - Add destination picker (multi-select from destinations fetched via `GET /destinations`)
  - Add image upload using `POST /images` endpoint (file input instead of URL input)
  - Wire submit to: upload images first, then `createTrip()` with multilingual data
  - Format multilingual fields as `{ ar: "...", en: "..." }` objects

### 6.4 Edit Trip page

- **Modify:** `duck-web/src/app/supplier/my-trips/[id]/edit/page.tsx`
  - Fetch trip by ID on mount (without `lang` param to get full multilingual data)
  - Pre-populate form with existing data
  - Wire submit to `updateTrip(id, data)`

### 6.5 Supplier Bookings page

- **Modify:** `duck-web/src/app/supplier/bookings/page.tsx`
  - Replace `mockBookings` with `getMyBookings()` API call (new endpoint)
  - Wire filters to query params
  - Calculate summary stats from real data

---

## Phase 7: Connect Admin Pages

### 7.1 Dynamic sidebar user info

- **Modify:** `duck-web/src/components/shared/admin-sidebar.tsx`
  - Same as supplier sidebar — `useAuth()` for user info + logout

### 7.2 Admin Dashboard

- **Modify:** `duck-web/src/app/admin/dashboard/page.tsx`
  - Fetch real data: `getSuppliers()`, `getBookings()` (new admin endpoint)
  - Calculate KPIs from real data (total bookings, revenue, active suppliers, trips)
  - Show real recent bookings table

### 7.3 Admin Destinations page

- **Modify:** `duck-web/src/app/admin/destinations/page.tsx`
  - Replace `mockDestinations` with `getDestinations(lang)` API
  - Wire create/edit/delete to real API endpoints
  - Add create/edit dialog/form for destinations (image upload + multilingual name/description)

### 7.4 Admin Bookings page

- **Modify:** `duck-web/src/app/admin/bookings/page.tsx`
  - Replace `mockBookings` with `getBookings()` admin endpoint
  - Wire filters (status, supplier) to API query params

### 7.5 Admin Payouts page

- **Modify:** `duck-web/src/app/admin/payouts/page.tsx`
  - Replace `mockPayouts` with `getPayouts()` API
  - Wire tabs (status filter) to API query params
  - Add create payout form (select supplier, amount)
  - Wire status update to `updatePayout(id, { status })` API

---

## Phase 8: Landing Page Updates

### 8.1 Add "Join as Supplier" button

- **Modify:** `duck-web/src/components/landing/Navbar.tsx`
  - Add "Join as Supplier" / "انضم كمزود" button/link pointing to `/register`
  - If user is authenticated: show "Dashboard" linking to appropriate panel based on role
  - Add to both desktop nav and mobile sheet menu

### 8.2 Connect landing sections to real data (optional)

- If the Experiences/Offers sections show trip data, fetch from `GET /trips?lang=ar`
- Landing page map data can remain static (location coordinates are not in the backend)

---

## Phase 9: Shared UI Components

### 9.1 Loading skeletons

- **Create:** `duck-web/src/components/shared/loading-skeleton.tsx`
  - Reusable skeletons for: trip cards, table rows, stat cards
  - Use existing shadcn `<Skeleton>` component

### 9.2 Error display

- **Create:** `duck-web/src/components/shared/error-display.tsx`
  - Reusable error card with retry button

### 9.3 Toast notifications

- Add `sonner` or shadcn toast for success/error feedback on mutations

---

## Phase 10: Payment Flow

### 10.1 Backend: Configure Kashier redirect

- **Modify:** `duck-api/internal/handlers/booking_handler.go:93`
  - Uncomment the redirect line, point to frontend URL (e.g., `http://localhost:3000/booking/success` or `/booking/failed`)

### 10.2 Frontend: Payment result pages

- **Create:** `duck-web/src/app/booking/success/page.tsx` — success confirmation page
- **Create:** `duck-web/src/app/booking/failed/page.tsx` — failure page with retry option

---

## Implementation Order

| Step | Task                                                                | Dependencies     |
| ---- | ------------------------------------------------------------------- | ---------------- |
| 1    | Backend bug fixes (Phase 1)                                         | None             |
| 2    | Backend new models: Destination, Payout (Phase 2.1, 2.2)            | Step 1           |
| 3    | Backend new endpoints: GET /auth/me, GET /bookings (Phase 2.3, 2.4) | Step 1           |
| 4    | Frontend env + proxy + API client (Phase 3.1-3.3)                   | None             |
| 5    | Frontend types update + API services (Phase 3.4, 3.5)               | Step 4           |
| 6    | Frontend auth system (Phase 4)                                      | Steps 3, 5       |
| 7    | Connect auth pages (Phase 5)                                        | Step 6           |
| 8    | Shared UI: skeletons, errors, toasts (Phase 9)                      | Step 4           |
| 9    | Connect supplier pages (Phase 6)                                    | Steps 6, 8       |
| 10   | Connect admin pages (Phase 7)                                       | Steps 2, 3, 6, 8 |
| 11   | Landing page updates (Phase 8)                                      | Step 6           |
| 12   | Payment flow (Phase 10)                                             | Steps 3, 9       |

---

## Verification

1. **Auth flow:** Register a supplier -> login -> verify JWT stored -> verify redirect to supplier panel -> verify protected routes redirect unauthenticated users
2. **Supplier CRUD:** Create trip with image uploads -> verify in my-trips list -> edit trip -> delete trip
3. **Admin panel:** Login as admin -> verify dashboard stats from real data -> CRUD destinations -> view bookings -> create/manage payouts
4. **Bookings:** Create a booking -> verify Kashier redirect URL returned -> test callback flow
5. **i18n:** Switch language -> verify API calls include `?lang=` param -> verify multilingual data renders correctly
6. **Landing:** Verify "Join as Supplier" button visible -> click navigates to register
7. **Error cases:** Test expired token redirect -> test API errors show in UI -> test loading states

---

## Files Summary

**Backend — New files (8):**

- `models/destination.go`, `repositories/destination_repository.go`, `services/destination_service.go`, `handlers/destination_handler.go`
- `models/payout.go`, `repositories/payout_repository.go`, `services/payout_service.go`, `handlers/payout_handler.go`

**Backend — Modified files (7):**

- `middleware/jwt_auth.go` (AdminAuth fix)
- `handlers/booking_handler.go` (key fix + list handler + redirect)
- `models/trip.go` (remove unique, add destinations relation)
- `repositories/booking_repo.go` (add list methods)
- `services/booking_service.go` (add list methods)
- `routes/api.go` (new routes)
- `config/database.go` (auto-migrate new models)

**Frontend — New files (14):**

- `.env.local`
- `src/lib/api/client.ts`, `auth.ts`, `trips.ts`, `suppliers.ts`, `bookings.ts`, `wallet.ts`, `images.ts`, `tour-guides.ts`, `destinations.ts`, `payouts.ts`, `index.ts`
- `src/lib/auth/token.ts`, `auth-context.tsx`
- `src/components/shared/protected-route.tsx`, `loading-skeleton.tsx`, `error-display.tsx`
- `src/app/booking/success/page.tsx`, `src/app/booking/failed/page.tsx`

**Frontend — Modified files (16):**

- `next.config.ts` (proxy rewrites)
- `src/lib/types.ts` (type alignment)
- `src/app/layout.tsx` (AuthProvider)
- `src/app/(auth)/login/page.tsx`, `register/page.tsx`, `forgot-password/page.tsx`, `reset-password/page.tsx`
- `src/app/supplier/layout.tsx`, `my-trips/page.tsx`, `my-trips/create/page.tsx`, `my-trips/[id]/edit/page.tsx`, `bookings/page.tsx`
- `src/app/admin/layout.tsx`, `dashboard/page.tsx`, `destinations/page.tsx`, `bookings/page.tsx`, `payouts/page.tsx`
- `src/components/shared/supplier-sidebar.tsx`, `admin-sidebar.tsx`
- `src/components/landing/Navbar.tsx`
