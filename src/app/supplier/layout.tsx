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
import SupplierSidebar from "@/components/shared/supplier-sidebar"
import { ProtectedRoute } from "@/components/shared/protected-route"
import { usePathname } from "next/navigation"

export default function SupplierLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isOnboarding = pathname?.startsWith("/supplier/onboarding")

  return (
    <ProtectedRoute allowedRoles={[1]}>
      {isOnboarding ? (
        <main className="min-h-screen">{children}</main>
      ) : (
        <SidebarProvider>
          <SupplierSidebar />
          <SidebarInset>
            <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
              <SidebarTrigger className="ms-1" />
              <Separator orientation="vertical" className="ms-2 h-4" />
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbPage>لوحة المزود</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </header>
            <main className="flex-1 p-6">{children}</main>
          </SidebarInset>
        </SidebarProvider>
      )}
    </ProtectedRoute>
  )
}
