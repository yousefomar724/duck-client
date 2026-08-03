import { test, expect } from "@playwright/test"

const mockBookings = [
  {
    ID: 101,
    session_id: "sess_101",
    user_id: 1,
    trip_id: 1,
    supplier_id: 1,
    amount: 250,
    currency: "EGP",
    full_name: "أحمد حسن",
    phone_number: "01001112222",
    status: "CONFIRMED",
    created_at: "2024-03-10T14:30:00Z",
    booking_date: "2024-04-10T09:00:00Z",
    payment_method: "KASHIER",
  },
  {
    ID: 102,
    session_id: "sess_102",
    user_id: 2,
    trip_id: 2,
    supplier_id: 1,
    amount: 180,
    currency: "EGP",
    full_name: "ليلى محمود",
    phone_number: "01003334444",
    status: "PENDING",
    created_at: "2024-03-11T10:15:00Z",
    booking_date: "2024-04-12T09:00:00Z",
    payment_method: "MANUAL",
  },
]

const mockTrips = [
  {
    id: 1,
    name: { ar: "رحلة كاياك", en: "Kayak Trip" },
    supplier_id: 1,
    is_tour: false,
    from: "2024-04-10T08:00:00Z",
    to: "2024-04-10T11:00:00Z",
  },
  {
    id: 2,
    name: { ar: "جولة بحرية", en: "Sea Tour" },
    supplier_id: 1,
    is_tour: true,
    from: "2024-04-12T08:00:00Z",
    to: "2024-04-12T12:00:00Z",
  },
]

async function mockAdminBookingApis(page: import("@playwright/test").Page) {
  await page.route("**/api/v1/bookings**", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockBookings),
      })
      return
    }
    await route.continue()
  })

  await page.route("**/api/v1/trips**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(mockTrips),
    })
  })

  await page.route("**/api/v1/suppliers**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        { id: 1, name: { ar: "مزود تجريبي", en: "Demo Supplier" } },
      ]),
    })
  })

  await page.route("**/api/v1/tour-guides**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([{ ID: 1, name: "مرشد 1" }]),
    })
  })
}

test.describe("admin bookings UX", () => {
  test.beforeEach(async ({ page }) => {
    await mockAdminBookingApis(page)
  })

  test.beforeEach(({ }, testInfo) => {
    test.skip(
      testInfo.project.name === "mobile-chrome",
      "Desktop table layout is hidden on mobile viewports",
    )
  })

  test("shows summary columns and supports search filtering", async ({ page }) => {
    await page.goto("/admin/bookings")

    await expect(page.getByRole("heading", { name: "الحجوزات" })).toBeVisible()
    const desktopTable = page.locator("table")
    await expect(desktopTable.getByText("أحمد حسن")).toBeVisible()
    await expect(desktopTable.getByText("رحلة كاياك")).toBeVisible()

    await page.getByLabel("بحث في الحجوزات").fill("ليلى")
    await expect(desktopTable.getByText("ليلى محمود")).toBeVisible()
    await expect(desktopTable.getByText("أحمد حسن")).not.toBeVisible()
    await expect(page).toHaveURL(/q=%D9%84%D9%8A%D9%84%D9%89/)
  })

  test("syncs expanded booking state in URL and keyboard interaction", async ({
    page,
  }) => {
    await page.goto("/admin/bookings")

    const row = page.locator("table").getByRole("button", {
      name: "تفاصيل الحجز رقم 101",
    })
    await row.click()
    await expect(page).toHaveURL(/expanded=101/)
    await expect(
      page.getByRole("heading", { name: "العميل والحجز" }).first(),
    ).toBeVisible()

    await row.focus()
    await page.keyboard.press(" ")
    await expect(page).not.toHaveURL(/expanded=101/)
  })

  test("shows contextual empty state for filtered results", async ({ page }) => {
    await page.goto("/admin/bookings")
    await page.getByLabel("بحث في الحجوزات").fill("لايوجد")
    await expect(page.getByText("لا توجد نتائج مطابقة")).toBeVisible()
  })
})

test.describe("admin bookings mobile", () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test.beforeEach(async ({ page }) => {
    await mockAdminBookingApis(page)
  })

  test("renders mobile booking cards instead of desktop table", async ({
    page,
  }) => {
    await page.goto("/admin/bookings")
    await expect(
      page.getByRole("button", { name: "تفاصيل الحجز رقم 101" }),
    ).toBeVisible()
    await expect(page.locator("table")).toBeHidden()
  })

  test("supports search on mobile cards", async ({ page }) => {
    await page.goto("/admin/bookings")
    await page.getByLabel("بحث في الحجوزات").fill("ليلى")
    await expect(
      page.getByRole("button", { name: "تفاصيل الحجز رقم 102" }),
    ).toBeVisible()
    await expect(
      page.getByRole("button", { name: "تفاصيل الحجز رقم 101" }),
    ).not.toBeVisible()
  })
})
