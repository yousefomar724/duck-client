"use client"

import { useEffect } from "react"
import { useAuth } from "@/lib/stores/auth-store"

export function AuthHydrator() {
  const initialize = useAuth((s) => s.initialize)

  useEffect(() => {
    void initialize()
  }, [initialize])

  return null
}

