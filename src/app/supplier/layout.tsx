'use client'

import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import SupplierSidebar from "@/components/shared/supplier-sidebar"
import { RtlPanel } from "@/components/shared/rtl-panel"
import { ProtectedRoute } from "@/components/shared/protected-route"
import { usePathname } from "next/navigation"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"
import { dashboardStrings } from "@/lib/dashboard/strings"
import { UserMenu } from "@/components/shared/user-menu"

export default function SupplierLayout({
  children,
}: {
  children: React.ReactNode
}) {
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
    <SidebarProvider dir="rtl">
      <SupplierSidebar />
      <SidebarInset>
        <header className="flex h-14 sm:h-16 shrink-0 items-center gap-2 border-b px-4 min-w-0">
          <SidebarTrigger className="ms-1 size-11! sm:size-9!" />
          <Separator orientation="vertical" className="ms-2 h-4" />
          <Breadcrumb className="min-w-0">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage className="truncate">لوحة المزود</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="ms-auto flex shrink-0 items-center gap-2">
            <Button asChild size="sm" className="hidden! font-semibold shadow-sm sm:inline-flex!">
              <Link href="/">{dashboardStrings.backToHome}</Link>
            </Button>
            <UserMenu variant="dashboard" />
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6">{content}</main>
      </SidebarInset>
    </SidebarProvider>
    </RtlPanel>
  )

  return (
    <ProtectedRoute
      allowedRoles={[1]}
      loadingFallback={
        isOnboarding ? (
          <main className="min-h-screen p-4 sm:p-6" dir="rtl">
            {loadingContent}
          </main>
        ) : (
          renderSupplierShell(loadingContent)
        )
      }
    >
      {isOnboarding ? (
        <main className="min-h-screen" dir="rtl">
          {children}
        </main>
      ) : (
        renderSupplierShell(children)
      )}
    </ProtectedRoute>
  )
}
