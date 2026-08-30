"use client"

import Link from "next/link"
import PageHeader from "@/components/shared/page-header"
import { opsStrings } from "./ops-strings"

export function OpsMore({
  role,
  basePath,
}: {
  role: "admin" | "supplier"
  basePath: string
}) {
  const adminLinks = [
    { href: `${basePath}/trips`, title: opsStrings.activities },
    { href: `${basePath}/destinations`, title: "الوجهات" },
    { href: `${basePath}/suppliers`, title: "الموردين" },
    { href: `${basePath}/payouts`, title: "المدفوعات" },
    { href: `${basePath}/feedback`, title: "الآراء" },
    { href: `${basePath}/tour-guides`, title: "المرشدين" },
    { href: `${basePath}/reports`, title: opsStrings.reports },
    { href: `${basePath}/customers`, title: opsStrings.customers },
  ]
  const supplierLinks = [
    { href: `${basePath}/my-trips`, title: opsStrings.activities },
    { href: `${basePath}/storage`, title: opsStrings.equipment },
    { href: `${basePath}/profile`, title: "الملف الشخصي" },
    { href: `${basePath}/reports`, title: opsStrings.reports },
    { href: `${basePath}/customers`, title: opsStrings.customers },
  ]
  const links = role === "admin" ? adminLinks : supplierLinks

  return (
    <div className="space-y-6">
      <PageHeader title={opsStrings.more} />
      <ul className="divide-y rounded-xl border bg-white">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="flex min-h-14 items-center px-4 text-sm font-medium">
              {link.title}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
