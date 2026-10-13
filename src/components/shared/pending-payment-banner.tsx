"use client"

import { useEffect, useMemo, useState, useSyncExternalStore } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Clock, X } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import {
  PENDING_INSTAPAY_KEY,
  readPendingInstapay,
} from "@/lib/booking-success-cache"
import { formatCurrency } from "@/lib/constants"
import { settlePendingInstapay } from "@/lib/pending-instapay-status"
import { cn } from "@/lib/utils"

/** Per visit, so a closed tab (the case this banner exists for) shows it again. */
const HIDDEN_KEY = "duck.pendingInstapayBannerHidden"

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange)
  return () => window.removeEventListener("storage", onChange)
}

function getSnapshot(): string | null {
  try {
    return localStorage.getItem(PENDING_INSTAPAY_KEY)
  } catch {
    return null
  }
}

function readHiddenId(): string | null {
  try {
    return sessionStorage.getItem(HIDDEN_KEY)
  } catch {
    return null
  }
}

/**
 * Brings a guest back to an unpaid InstaPay booking from anywhere on the site.
 * The /book page already shows the full payment screen, so it is skipped there.
 */
export function PendingPaymentBanner() {
  const t = useTranslations("pendingPayment")
  const locale = useLocale()
  const pathname = usePathname()
  // Re-read on every render (including navigations), so a booking made or
  // cleared on /book in this tab shows up without a storage event.
  const raw = useSyncExternalStore(subscribe, getSnapshot, () => null)
  const pending = useMemo(() => (raw ? readPendingInstapay() : null), [raw])
  const [dismissedId, setDismissedId] = useState<string | null>(null)
  const [settledId, setSettledId] = useState<string | null>(null)
  const onBookPage = pathname === "/book"

  // The saved booking only lives in this browser, so ask the server whether
  // the supplier has confirmed it; /book runs the same check itself.
  useEffect(() => {
    if (!pending || onBookPage) return
    let cancelled = false
    void settlePendingInstapay(pending).then((settled) => {
      if (settled && !cancelled) setSettledId(pending.booking.ID)
    })
    return () => {
      cancelled = true
    }
  }, [pending, onBookPage])

  if (!pending || onBookPage || pending.receiptSent) return null
  if (
    settledId === pending.booking.ID ||
    dismissedId === pending.booking.ID ||
    readHiddenId() === pending.booking.ID
  ) {
    return null
  }

  const dismiss = () => {
    try {
      sessionStorage.setItem(HIDDEN_KEY, pending.booking.ID)
    } catch {
      /* storage disabled */
    }
    setDismissedId(pending.booking.ID)
  }

  return (
    <div
      role="status"
      className={cn(
        "fixed inset-x-0 z-50 flex justify-center ps-4 pe-20 sm:pe-4",
        "bottom-[max(1rem,env(safe-area-inset-bottom,0px))]",
      )}
    >
      <div className="flex w-full max-w-md items-start gap-3 rounded-2xl border border-amber-200 bg-white p-3 shadow-[0_8px_30px_rgba(18,21,40,0.15)]">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100">
          <Clock className="h-5 w-5 text-amber-600" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1 space-y-2 text-sm">
          <div>
            <p className="font-bold text-duck-navy">{t("title")}</p>
            <p className="text-text-muted">
              {t("description", {
                ref: pending.booking.ID,
                amount: formatCurrency(
                  pending.chosenAmount,
                  pending.booking.currency || "EGP",
                  locale,
                ),
              })}
            </p>
          </div>
          <Link
            href={`/book?trip=${encodeURIComponent(pending.booking.trip_id)}`}
            className="inline-flex min-h-9 items-center rounded-full bg-duck-yellow px-4 font-bold text-duck-navy hover:bg-duck-yellow-hover"
          >
            {t("cta")}
          </Link>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label={t("dismiss")}
          className="text-text-muted hover:text-text-dark"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
