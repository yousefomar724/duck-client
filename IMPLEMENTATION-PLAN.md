# Duck Entertainment Web - Full Rebrand, Restructure & Build Panels

## Context

The project is currently a "Visit Red Sea" tourism landing page with teal/mint colors. **Duck Entertainment** is a water sports company in Aswan, Egypt offering kayaking, stand-up paddle boarding, and water bikes on the Nile.

**What needs to happen:**
1. **Full rebrand** — colors, logo, AND all landing page text content updated to Duck Entertainment's water sports business
2. **Restructure** — from single landing page to multi-section app (landing, auth, admin panel, supplier panel)
3. **Build panels** — admin dashboard and supplier management panel, all in Arabic/RTL with shadcn/ui
4. **Sidebars on right** — following RTL native convention
5. **Site title:** "دوك إنترتينمنت | Duck Entertainment"

The backend (Go/Echo) is at `C:\Users\Yousef\Desktop\work\duck-api` with models for User, Supplier, Trip, Booking, Wallet, TourGuide. No API connection yet — mock data only.

**Destinations** are separate entities representing physical locations (e.g., Aswan Nile, Elephantine Island) — not the same as trips.

---

## Step 1: Color Theme Rebrand

**File:** `src/app/globals.css`

Replace the teal/mint palette with Duck logo colors:

| Variable | Old | New | Purpose |
|---|---|---|---|
| `--duck-navy` | (new) | `#1B2838` | Primary dark navy from logo |
| `--duck-navy-deep` | (new) | `#131E2B` | Deeper navy for footers/dark sections |
| `--duck-yellow` | (new) | `#F5E642` | Yellow from duck body |
| `--duck-yellow-hover` | (new) | `#E6D83B` | Yellow hover state |
| `--duck-cyan` | (new) | `#2BBBC5` | Cyan-teal from water waves |
| `--duck-cyan-light` | (new) | `#3DD1DB` | Lighter cyan for hover |

**Mapping from old classes:**
- `teal-primary` → `duck-cyan`
- `teal-light` → `duck-cyan-light`
- `teal-dark` → `duck-navy`
- `button-mint` → `duck-yellow` (with `text-duck-navy`)
- `dark-bg` → `#1B2838` (navy)
- `dark-bg-deeper` → `#131E2B`

**Update `@theme inline` block** with new color variables.

**Update shadcn CSS variable mappings:**
- `--primary` → `var(--duck-navy)`
- `--accent` → `var(--duck-cyan)`
- `--ring` → `var(--duck-cyan)`

**Files needing class name updates** (replace teal/mint references):
- `src/components/landing/Navbar.tsx`
- `src/components/landing/ResortsSection.tsx`
- `src/components/landing/OffersSection.tsx`
- `src/components/landing/ExperiencesSection.tsx`
- `src/components/landing/Footer.tsx`
- `src/components/landing/HeroSection.tsx` (minimal)

---

## Step 2: Navbar Logo Update

**File:** `src/components/landing/Navbar.tsx`

Replace the text-based "VISIT RED SEA" logo (lines 72-85) with:
```tsx
<Image src="/logo-transparent.png" alt="Duck Entertainment" width={120} height={60} />
```
- Apply `brightness-0 invert` filter when on transparent background (scrolled < threshold)
- Normal display when navbar is solid

Also update logo in `Footer.tsx`.

---

## Step 2b: Landing Page Content Rebrand

Keep the same 10-section structure but update ALL text content to Duck Entertainment's water sports business. Keep existing images/videos for now.

**Section-by-section content updates:**
- **HeroSection**: Headline → "اصنع مغامرتك المائية اللا تُنسى" / subtitle about Nile water sports in Aswan
- **RedSeaSection** → Rename to **NileSection**: Showcase the Nile in Aswan as the primary location
- **AmaalaSection** → Rename to **ActivitiesSection**: Showcase water sports activities (kayak, SUP, water bike)
- **ResortsSection** → Rename to **ServicesSection**: Cards for each service/activity type
- **OffersSection**: Special offers/packages for Duck Entertainment
- **ExperiencesSection**: Water sports experiences (kayaking tours, sunset SUP, etc.)
- **LocationSection**: Map showing Duck's 4 locations in Aswan
- **WeatherSection**: Weather for Aswan (relevant for water sports)
- **Footer**: Duck Entertainment branding, contact info, social links
- **Navbar**: Duck logo, relevant nav links (الخدمات, المواقع, التجارب, احجز)

Update `layout.tsx` metadata title to: "دوك إنترتينمنت | Duck Entertainment"

---

## Step 3: Install shadcn Components

```bash
pnpm dlx shadcn@latest add button card input label separator form sidebar breadcrumb dropdown-menu sheet avatar table tabs badge chart select textarea dialog alert-dialog calendar popover switch skeleton collapsible
```

Additional dependencies:
```bash
pnpm add @tanstack/react-table react-hook-form @hookform/resolvers zod recharts date-fns
```

---

## Step 4: Create Types, Mock Data & Constants

### `src/lib/types.ts`
TypeScript interfaces matching backend models: `User`, `Supplier`, `Trip`, `Booking`, `Wallet`, `BookingStatus`, `PayoutStatus`

### `src/lib/mock-data.ts`
5-10 entries per model with Arabic content, realistic values. Trips reference supplier IDs, bookings reference trip/supplier IDs.

### `src/lib/constants.ts`
Admin nav items, supplier nav items, status color mappings, currency formatting.

---

## Step 5: Folder Structure Reorganization

**Move landing page into route group. Create new route groups:**

```
src/app/
  layout.tsx                    # Root: font, RTL, globals.css only
  globals.css
  (landing)/
    layout.tsx                  # Wraps with Navbar + ScrollManager
    page.tsx                    # Current page.tsx content (all sections)
  (auth)/
    layout.tsx                  # Centered card layout with logo + decorative bg
    login/page.tsx
    register/page.tsx
    forgot-password/page.tsx
    reset-password/page.tsx
  admin/
    layout.tsx                  # Admin sidebar layout
    page.tsx                    # Redirects to /admin/dashboard
    dashboard/page.tsx
    destinations/page.tsx
    payouts/page.tsx
    bookings/page.tsx
  supplier/
    layout.tsx                  # Supplier sidebar layout
    page.tsx                    # Redirects to /supplier/my-trips
    my-trips/
      page.tsx                  # Trip cards list
      create/page.tsx           # Create trip form
      [id]/edit/page.tsx        # Edit trip form
    bookings/page.tsx
```

**Root layout** (`src/app/layout.tsx`) stays minimal — just `<html lang="ar" dir="rtl">`, font, body.

---

## Step 6: Shared Components

**Directory:** `src/components/shared/`

| Component | Purpose |
|---|---|
| `logo.tsx` | Reusable Duck logo with light/dark variant |
| `admin-sidebar.tsx` | Admin sidebar (RIGHT side, RTL native) with nav items (Dashboard, Destinations, Payouts, Bookings) |
| `supplier-sidebar.tsx` | Supplier sidebar (RIGHT side, RTL native) with nav items (My Trips, Bookings) |
| `panel-header.tsx` | Top bar: sidebar trigger + breadcrumbs + user avatar |
| `stat-card.tsx` | Card with icon, Arabic label, value, optional trend |
| `data-table.tsx` | `@tanstack/react-table` + shadcn Table wrapper with search/filter |
| `status-badge.tsx` | Badge with color mapping per status |
| `page-header.tsx` | Page title + action buttons row |

---

## Step 7: Auth Pages

**Layout** (`(auth)/layout.tsx`): Full-height centered, `bg-off-white`, Duck logo at top, decorative navy/cyan gradient accents.

### 7a. Login (`/login`)
- Title: "تسجيل الدخول"
- Email + password fields
- "نسيت كلمة المرور؟" link
- CTA button (duck-yellow bg, duck-navy text)
- Google login button
- "ليس لديك حساب؟ سجل كمزود خدمة" link

### 7b. Register (`/register`)
- Fields: first name, last name, email, phone, password, confirm password, company name
- Google signup option
- "لديك حساب بالفعل؟ تسجيل الدخول" link

### 7c. Forgot Password (`/forgot-password`)
- Email input + submit
- Back to login link

### 7d. Reset Password (`/reset-password`)
- New password + confirm password
- Submit + success state

---

## Step 8: Admin Panel

### Layout (`admin/layout.tsx`)
`SidebarProvider` + `AdminSidebar` + `SidebarInset` with `PanelHeader` + main content area.

### 8a. Dashboard (`/admin/dashboard`)
- 4 stat cards: total bookings, revenue, active suppliers, active trips
- Revenue bar chart (last 6 months)
- Bookings line chart
- Recent bookings table (last 10 rows)

### 8b. Destinations (`/admin/destinations`)
Destinations are **physical locations** (e.g., Aswan Nile, Elephantine Island) — separate from trips.
- Page header: "الوجهات" + "اضافة وجهة" button
- Card grid (3 cols): image, name (ar/en), description, trip count
- Edit/delete dropdown per card
- Add/Edit dialog with form fields: name (ar), description (ar), image URL, status

### 8c. Payouts (`/admin/payouts`)
- 3 stat cards: total paid, pending, failed
- Tabs: الكل | قيد الانتظار | مدفوع | فشل
- Data table: ID, supplier, amount, status, date, action

### 8d. Bookings (`/admin/bookings`)
- Data table: ID, customer, phone, trip, supplier, amount, status, date
- Filters: status select, supplier select
- Row click → Sheet with booking details

---

## Step 9: Supplier Panel

### Layout (`supplier/layout.tsx`)
Same pattern as admin with `SupplierSidebar`.

### 9a. My Trips (`/supplier/my-trips`)
- Page header: "رحلاتي" + "اضافة رحلة" button
- Card grid: image, name, dates, price, max guests
- Edit (link to form) + delete (alert dialog) per card

### 9b. Create/Edit Trip (`/supplier/my-trips/create`, `/supplier/my-trips/[id]/edit`)
Form with sections:
1. Basic: name, description, destination, location
2. Pricing: price, currency, refundable toggle, cancellation policy
3. Schedule: from/to dates, max guests
4. Itinerary: dynamic list
5. Images: URL inputs
6. Availability: dynamic date/slots

### 9c. Bookings (`/supplier/bookings`)
- Data table: ID, customer, phone, trip, amount, status, date
- Filter by status

---

## Implementation Order

1. Color theme rebrand (globals.css + all landing components)
2. Navbar logo update + landing page content rebrand
3. Install shadcn components + dependencies
4. Create types, mock data, constants
5. Folder restructure (move landing into route group)
6. Build shared components (logo, sidebars, data-table, stat-card, etc.)
7. Auth layout + login page
8. Register, forgot password, reset password pages
9. Admin layout + sidebar + dashboard
10. Admin bookings page
11. Admin payouts page
12. Admin destinations page
13. Supplier layout + sidebar + my-trips list
14. Supplier trip create/edit form
15. Supplier bookings page

---

## Verification

After each phase:
1. `pnpm build` — zero errors
2. `pnpm dev` — visually verify pages load correctly
3. Check RTL layout, Arabic text rendering, Duck color theme consistency
4. Test responsive behavior (mobile sidebar collapse, card grids)
5. Verify all routes accessible: `/`, `/login`, `/register`, `/forgot-password`, `/reset-password`, `/admin/dashboard`, `/admin/destinations`, `/admin/payouts`, `/admin/bookings`, `/supplier/my-trips`, `/supplier/my-trips/create`, `/supplier/bookings`