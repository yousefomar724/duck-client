"use client"

import { useSearchParams } from "next/navigation"

export function useOpsScope(role: "admin" | "supplier") {
  const searchParams = useSearchParams()
  const supplierId = role === "admin" ? searchParams.get("supplier_id") : null
  return { supplierId }
}
