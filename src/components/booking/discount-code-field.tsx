"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { validateDiscountCode } from "@/lib/api/discount-codes"
import { formatCurrency } from "@/lib/constants"

export interface AppliedDiscount {
  code: string
  subtotal: number
  discount: number
  total: number
  minDeposit: number
}

const ERROR_KEYS = [
  "NOT_FOUND",
  "DISABLED",
  "NOT_STARTED",
  "EXPIRED",
  "WRONG_SUPPLIER",
  "TRIP_NOT_ELIGIBLE",
  "CURRENCY_MISMATCH",
  "BELOW_MINIMUM",
  "USAGE_LIMIT_REACHED",
  "ALREADY_USED_BY_CUSTOMER",
  "INVALID_CODE",
  "INVALID_PHONE",
  "RATE_LIMITED",
] as const

export function isDiscountErrorCode(code: string | undefined): boolean {
  return Boolean(code && (ERROR_KEYS as readonly string[]).includes(code))
}

export function discountErrorMessage(
  t: (key: string) => string,
  code: string | undefined,
  fallback: string,
) {
  if (code && (ERROR_KEYS as readonly string[]).includes(code)) {
    return t(`discountError_${code}`)
  }
  return fallback
}

export function DiscountCodeField({
  tripId,
  phone,
  quantity,
  localGuests,
  foreignerGuests,
  duration,
  wantsGuide = false,
  currency,
  locale,
  onChange,
}: {
  tripId: string
  phone: string
  quantity: number
  localGuests: number
  foreignerGuests: number
  duration: number
  wantsGuide?: boolean
  currency: string
  locale: string
  onChange: (applied: AppliedDiscount | null) => void
}) {
  const t = useTranslations("book")
  const [input, setInput] = useState("")
  const [applied, setApplied] = useState<AppliedDiscount | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const apply = async (raw: string) => {
    const code = raw.trim()
    if (!code) {
      setApplied(null)
      setError(null)
      onChange(null)
      return
    }
    setLoading(true)
    const result = await validateDiscountCode({
      code,
      trip_id: tripId,
      phone_number: phone,
      quantity,
      local_guests: localGuests,
      foreigner_guests: foreignerGuests,
      duration,
      wants_guide: wantsGuide,
    })
    setLoading(false)
    if (result.error || !result.data) {
      setApplied(null)
      setError(discountErrorMessage(t, result.code, result.error ?? t("discountError_NOT_FOUND")))
      onChange(null)
      return
    }
    const next: AppliedDiscount = {
      code: result.data.code,
      subtotal: result.data.subtotal,
      discount: result.data.discount,
      total: result.data.total,
      minDeposit: result.data.min_deposit,
    }
    setApplied(next)
    setInput(next.code)
    setError(null)
    onChange(next)
  }

  useEffect(() => {
    if (!applied) return
    let cancelled = false
    void validateDiscountCode({
      code: applied.code,
      trip_id: tripId,
      phone_number: phone,
      quantity,
      local_guests: localGuests,
      foreigner_guests: foreignerGuests,
      duration,
      wants_guide: wantsGuide,
    }).then((result) => {
      if (cancelled) return
      if (result.error || !result.data) {
        setApplied(null)
        setError(discountErrorMessage(t, result.code, result.error ?? t("discountError_NOT_FOUND")))
        onChange(null)
        return
      }
      const next: AppliedDiscount = {
        code: result.data.code,
        subtotal: result.data.subtotal,
        discount: result.data.discount,
        total: result.data.total,
        minDeposit: result.data.min_deposit,
      }
      setApplied(next)
      onChange(next)
    })
    return () => {
      cancelled = true
    }
    // Re-check only when the priced inputs change. `applied.code` is the code
    // already accepted; including `applied` would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId, phone, quantity, localGuests, foreignerGuests, duration, wantsGuide])

  return (
    <div className="space-y-2" data-testid="discount-code-field">
      <p className="text-sm font-medium text-text-dark">{t("discountCodeLabel")}</p>
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder={t("discountCodePlaceholder")}
          dir="ltr"
          className="uppercase"
          aria-label={t("discountCodeLabel")}
        />
        <Button
          type="button"
          variant="outline"
          disabled={loading || !input.trim() || !phone.trim()}
          onClick={() => void apply(input)}
        >
          {loading ? t("submitLoading") : t("discountApply")}
        </Button>
      </div>
      {applied ? (
        <div className="flex items-center justify-between text-sm">
          <span>
            {t("discountApplied", { code: applied.code })} ·{" "}
            {formatCurrency(applied.discount, currency, locale)}
          </span>
          <button
            type="button"
            className="text-duck-cyan underline"
            onClick={() => {
              setApplied(null)
              setInput("")
              setError(null)
              onChange(null)
            }}
          >
            {t("discountRemove")}
          </button>
        </div>
      ) : null}
      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
