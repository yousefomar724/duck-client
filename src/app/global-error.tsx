"use client"

import { RouteError } from "@/components/shared/route-error"

export default function GlobalError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <html lang="ar" dir="rtl"><body style={{ margin: 0 }}><RouteError {...props} /></body></html>
}
