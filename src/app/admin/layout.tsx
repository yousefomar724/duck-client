"use client"

import Link from "next/link"
import { dashboardStrings } from "@/lib/dashboard/strings"
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
import AdminSidebar from "@/components/shared/admin-sidebar"
import { RtlPanel } from "@/components/shared/rtl-panel"
import { ProtectedRoute } from "@/components/shared/protected-route"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProtectedRoute allowedRoles={[2]}>
      <RtlPanel>
      <SidebarProvider dir="rtl">
        <AdminSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="me-1" />
            <Separator orientation="vertical" className="me-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage>لوحة الإدارة</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <div className="ms-auto shrink-0">
              <Button asChild size="sm" className="font-semibold shadow-sm">
                <Link href="/">{dashboardStrings.backToHome}</Link>
              </Button>
            </div>
          </header>
          <main className="flex-1 p-6">{children}</main>
        </SidebarInset>
      </SidebarProvider>
      </RtlPanel>
    </ProtectedRoute>
  )
}
