'use client'

import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import SupplierSidebar from "@/components/shared/supplier-sidebar"
import { RtlPanel } from "@/components/shared/rtl-panel"
import { ProtectedRoute } from "@/components/shared/protected-route"
import { SkipToContent } from "@/components/shared/skip-to-content"
import { DashboardBreadcrumb } from "@/components/shared/dashboard-breadcrumb"
import { usePathname } from "next/navigation"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"
import { useTranslations } from "next-intl"

export default function SupplierLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const t = useTranslations("common")
  const pathname = usePathname()
  const isOnboarding = pathname?.startsWith("/supplier/onboarding")
  const loadingContent = (
    <div className="space-y-4">
      <Skeleton className="h-8 w-52" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  )

  const renderSupplierShell = (content: React.ReactNode) => (
    <RtlPanel>
      <SkipToContent />
      <SidebarProvider dir="rtl">
        <SupplierSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger
              className="me-1 dashboard-focus-ring"
              aria-label="فتح القائمة الجانبية"
            />
            <Separator orientation="vertical" className="me-2 h-4" />
            <DashboardBreadcrumb
              panelLabel="لوحة المزود"
              panelHref="/supplier/my-trips"
            />
            <div className="ms-auto shrink-0">
              <Button asChild size="sm" className="font-semibold shadow-sm">
                <Link href="/">{t("backToHome")}</Link>
              </Button>
            </div>
          </header>
          <main id="main-content" className="flex-1 p-4 sm:p-6">
            {content}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </RtlPanel>
  )

  return (
    <ProtectedRoute
      allowedRoles={[1]}
      loadingFallback={
        isOnboarding ? (
          <main className="min-h-screen p-4 sm:p-6" dir="rtl" id="main-content">
            {loadingContent}
          </main>
        ) : (
          renderSupplierShell(loadingContent)
        )
      }
    >
      {isOnboarding ? (
        <>
          <SkipToContent />
          <main className="min-h-screen" dir="rtl" id="main-content">
            {children}
          </main>
        </>
      ) : (
        renderSupplierShell(children)
      )}
    </ProtectedRoute>
  )
}
