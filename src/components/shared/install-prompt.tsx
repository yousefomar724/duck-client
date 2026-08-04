"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const DISMISSED_KEY = "duck-install-prompt-dismissed"

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

/**
 * Only Chromium browsers fire `beforeinstallprompt`, and only when the PWA
 * install criteria are met and the app isn't already installed — so this
 * naturally stays hidden on iOS Safari and for already-installed users.
 */
export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault()
      if (localStorage.getItem(DISMISSED_KEY) === "1") return
      setDeferredPrompt(event as BeforeInstallPromptEvent)
    }
    window.addEventListener("beforeinstallprompt", handler)
    return () => window.removeEventListener("beforeinstallprompt", handler)
  }, [])

  if (!deferredPrompt) return null

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "1")
    setDeferredPrompt(null)
  }

  const install = async () => {
    await deferredPrompt.prompt()
    await deferredPrompt.userChoice
    setDeferredPrompt(null)
  }

  return (
    <div
      className={cn(
        "fixed inset-x-0 z-50 flex justify-center px-4",
        "bottom-[max(1rem,env(safe-area-inset-bottom,0px))]",
      )}
    >
      <div className="flex w-full max-w-sm items-center gap-3 rounded-2xl border border-duck-navy/10 bg-white p-3 shadow-[0_8px_30px_rgba(18,21,40,0.15)]">
        <Image
          src="/icon-192.png"
          alt=""
          width={40}
          height={40}
          className="h-10 w-10 rounded-lg"
        />
        <div className="flex-1 text-sm">
          <p className="font-bold text-duck-navy">ثبّت التطبيق</p>
          <p className="text-text-muted">وصول أسرع من شاشتك الرئيسية</p>
        </div>
        <Button
          onClick={install}
          size="sm"
          className="bg-duck-yellow text-duck-navy font-bold hover:bg-duck-yellow-hover"
        >
          تثبيت
        </Button>
        <button
          type="button"
          onClick={dismiss}
          aria-label="إغلاق"
          className="text-text-muted hover:text-text-dark"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
