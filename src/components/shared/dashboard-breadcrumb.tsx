"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { adminNavItems, supplierNavItems } from "@/lib/constants"

const adminPageTitles: Record<string, string> = {
  "/admin/dashboard": "لوحة التحكم",
  "/admin/destinations": "الوجهات",
  "/admin/trips": "الرحلات",
  "/admin/trips/create": "إنشاء رحلة",
  "/admin/payouts": "المدفوعات",
  "/admin/bookings": "الحجوزات",
  "/admin/suppliers": "الموردين",
  "/admin/tour-guides": "المرشدين",
}

const supplierPageTitles: Record<string, string> = {
  "/supplier/my-trips": "رحلاتي",
  "/supplier/my-trips/create": "إنشاء رحلة",
  "/supplier/bookings": "الحجوزات",
  "/supplier/profile": "الملف الشخصي",
  "/supplier/storage": "سعة المعدات",
  "/supplier/onboarding": "إكمال الإعداد",
}

function resolvePageTitle(pathname: string | null): string | null {
  if (!pathname) return null

  if (adminPageTitles[pathname]) return adminPageTitles[pathname]
  if (supplierPageTitles[pathname]) return supplierPageTitles[pathname]

  const adminEdit = pathname.match(/^\/admin\/trips\/(\d+)\/edit$/)
  if (adminEdit) return "تعديل رحلة"

  const supplierEdit = pathname.match(/^\/supplier\/my-trips\/(\d+)\/edit$/)
  if (supplierEdit) return "تعديل رحلة"

  const adminItem = adminNavItems.find((item) => pathname.startsWith(item.href))
  if (adminItem && pathname.startsWith("/admin")) return adminItem.title

  const supplierItem = supplierNavItems.find((item) =>
    pathname.startsWith(item.href),
  )
  if (supplierItem && pathname.startsWith("/supplier")) return supplierItem.title

  return null
}

interface DashboardBreadcrumbProps {
  panelLabel: string
  panelHref: string
}

export function DashboardBreadcrumb({
  panelLabel,
  panelHref,
}: DashboardBreadcrumbProps) {
  const pathname = usePathname()
  const pageTitle = resolvePageTitle(pathname)

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href={panelHref}>{panelLabel}</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        {pageTitle && pathname !== panelHref && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{pageTitle}</BreadcrumbPage>
            </BreadcrumbItem>
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
