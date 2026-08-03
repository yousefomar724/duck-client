import Link from "next/link"
import { getTranslations } from "next-intl/server"
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import AdminSidebar from "@/components/shared/admin-sidebar"
import { RtlPanel } from "@/components/shared/rtl-panel"
import { SkipToContent } from "@/components/shared/skip-to-content"
import { DashboardBreadcrumb } from "@/components/shared/dashboard-breadcrumb"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const t = await getTranslations("common")

  return (
    // <ProtectedRoute allowedRoles={[2]}>
    <RtlPanel>
      <SkipToContent />
      <SidebarProvider dir="rtl">
        <AdminSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger
              className="me-1 dashboard-focus-ring"
              aria-label="فتح القائمة الجانبية"
            />
            <Separator orientation="vertical" className="me-2 h-4" />
            <DashboardBreadcrumb
              panelLabel="لوحة الإدارة"
              panelHref="/admin/dashboard"
            />
            <div className="ms-auto shrink-0">
              <Button asChild size="sm" className="font-semibold shadow-sm">
                <Link href="/">{t("backToHome")}</Link>
              </Button>
            </div>
          </header>
          <main id="main-content" className="flex-1 p-4 sm:p-6">
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </RtlPanel>
    // </ProtectedRoute>
  )
}
