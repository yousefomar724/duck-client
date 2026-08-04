"use client"

import { useEffect } from "react"

/**
 * A service worker in dev breaks HMR (it can serve stale bundles from an
 * earlier build), so registration is production-only.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return

    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.error("Service worker registration failed:", err)
    })
  }, [])

  return null
}
