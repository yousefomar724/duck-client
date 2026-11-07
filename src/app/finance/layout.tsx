import type { Metadata } from "next"
import { ErpProvider } from "@/components/finance/context/ErpContext"
import { MockGate } from "@/components/finance/MockGate"
import "./finance.css"

/**
 * Finance (accounting ERP) shell. Deliberately separate from the admin
 * layout and the public locale chrome: the ERP owns its own theme, language
 * and direction (see ErpProvider), and is staff-only, so it stays out of
 * search indexes.
 *
 * `/finance` is not in src/middleware.ts's matcher and the locale comes from
 * a cookie (src/i18n/request.ts), so there is no locale routing to opt out of.
 */
export const metadata: Metadata = {
  title: "Duck Accounting ERP",
  description: "Duck accounting and operations ERP",
  alternates: { canonical: null },
  robots: { index: false, follow: false },
}

export default function FinanceLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <MockGate>
      <ErpProvider>{children}</ErpProvider>
    </MockGate>
  )
}
