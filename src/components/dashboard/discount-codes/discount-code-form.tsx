"use client"

import { useState } from "react"
import { format } from "date-fns"
import { arSA } from "date-fns/locale"
import { CheckCircle2, ChevronDown, Gift, Percent, Wallet, Wand2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DateTimePicker } from "@/components/shared/date-time-picker"
import { discountStrings as s } from "@/lib/dashboard/discount-strings"
import {
  expiryInDays,
  generateDiscountCode,
  isValidDraftCode,
  previewDiscount,
  type DiscountKind,
} from "@/lib/booking/discount-form"
import { currencies, formatCurrency } from "@/lib/constants"
import { resolveLocalizedField } from "@/lib/dashboard/localize"
import type { Supplier, Trip } from "@/lib/types"
import { cn } from "@/lib/utils"

export interface DiscountFormDraft {
  code: string
  description: string
  kind: DiscountKind
  value: string
  currency: string
  maxDiscount: string
  minBooking: string
  /** Picker values: their local fields are Cairo wall time. */
  starts?: Date
  expires?: Date
  limit: string
  once: boolean
  tripIds: string[]
  /** "platform" or a supplier id. Admin only. */
  supplierId: string
}

export const EMPTY_DRAFT: DiscountFormDraft = {
  code: "",
  description: "",
  kind: "percentage",
  value: "10",
  currency: "EGP",
  maxDiscount: "",
  minBooking: "",
  starts: undefined,
  expires: undefined,
  limit: "",
  once: false,
  tripIds: [],
  supplierId: "platform",
}

const KINDS: { kind: DiscountKind; title: string; hint: string; Icon: typeof Percent }[] = [
  { kind: "percentage", title: s.percentage, hint: s.kindPercentageHint, Icon: Percent },
  { kind: "fixed", title: s.fixed, hint: s.kindFixedHint, Icon: Wallet },
  { kind: "free", title: s.kindFree, hint: s.kindFreeHint, Icon: Gift },
]

const fill = (text: string, values: Record<string, string | number>) =>
  text.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ""))

const numberOrNull = (raw: string) => (raw.trim() === "" ? null : Number(raw))

const formatPicked = (date: Date) => format(date, "d MMM yyyy، HH:mm", { locale: arSA })

function Hint({ children }: { children: React.ReactNode }) {
  return <p className="text-xs leading-relaxed text-text-muted">{children}</p>
}

export function DiscountCodeForm({
  role,
  draft,
  onChange,
  trips,
  suppliers,
  locked,
}: {
  role: "admin" | "supplier"
  draft: DiscountFormDraft
  onChange: (next: DiscountFormDraft) => void
  trips: Trip[]
  suppliers: Supplier[]
  /** The code has been used, so its pricing fields cannot change. */
  locked: boolean
}) {
  const set = <K extends keyof DiscountFormDraft>(key: K, value: DiscountFormDraft[K]) =>
    onChange({ ...draft, [key]: value })

  const hasConditions = Boolean(
    draft.starts || draft.minBooking || draft.limit || draft.once || draft.tripIds.length,
  )
  const [conditionsOpen, setConditionsOpen] = useState(hasConditions)
  const [exampleInput, setExampleInput] = useState("")

  const visibleTrips =
    role === "admin" && draft.supplierId !== "platform"
      ? trips.filter((trip) => trip.supplier_id === draft.supplierId)
      : trips
  const exampleTrip =
    trips.find((trip) => draft.tripIds.includes(trip.id)) ?? visibleTrips[0]
  const exampleSubtotal =
    exampleInput.trim() !== "" ? Math.max(0, Number(exampleInput) || 0) : exampleTrip?.price || 1000
  const currency =
    draft.kind === "fixed" ? draft.currency || "EGP" : exampleTrip?.currency || "EGP"
  const money = (amount: number) => formatCurrency(amount, currency)

  const value = Number(draft.value) || 0
  const maxDiscount = numberOrNull(draft.maxDiscount)
  const minBooking = numberOrNull(draft.minBooking)
  const preview = previewDiscount({
    kind: draft.kind,
    value,
    maxDiscount,
    minBooking,
    subtotal: exampleSubtotal,
  })
  const shownCode = draft.code.trim().toUpperCase() || "SUMMER25"
  const codeInvalid = draft.code.trim() !== "" && !isValidDraftCode(draft.code)

  const pickKind = (kind: DiscountKind) => {
    if (kind === draft.kind) return
    // Leaving "free" keeps its stored 100 out of the percentage box.
    const nextValue = draft.kind === "free" || draft.value === "" ? "10" : draft.value
    onChange({ ...draft, kind, value: kind === "free" ? "100" : nextValue })
  }

  const summary: string[] = []
  if (draft.kind === "free") summary.push(s.summaryFree)
  else if (draft.kind === "fixed") summary.push(fill(s.summaryOff, { value: money(value) }))
  else {
    const off = fill(s.summaryOff, { value: `${value}%` })
    summary.push(maxDiscount ? `${off} ${fill(s.summaryUpTo, { amount: money(maxDiscount) })}` : off)
  }
  if (draft.tripIds.length > 0) summary.push(fill(s.summaryTrips, { n: draft.tripIds.length }))
  else if (role === "supplier") summary.push(s.summaryAllMyTrips)
  else summary.push(draft.supplierId === "platform" ? s.summaryAllPlatformTrips : s.summaryAllSupplierTrips)
  if (draft.starts) summary.push(fill(s.summaryStarts, { date: formatPicked(draft.starts) }))
  summary.push(draft.expires ? fill(s.summaryUntil, { date: formatPicked(draft.expires) }) : s.summaryNoExpiry)
  if (minBooking) summary.push(fill(s.summaryMin, { amount: money(minBooking) }))
  if (draft.limit) summary.push(fill(s.summaryLimit, { n: draft.limit }))
  if (draft.once) summary.push(s.summaryOnce)

  const whoPays =
    role === "supplier"
      ? s.paysSupplier
      : draft.supplierId === "platform"
        ? s.paysDuckPlatform
        : s.paysDuckSupplier

  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_260px]">
      <div className="grid content-start gap-5">
        <fieldset className="grid gap-2" disabled={locked}>
          <legend className="mb-2 text-sm font-medium">{s.kindQuestion}</legend>
          <div role="radiogroup" aria-label={s.kindQuestion} className="grid grid-cols-3 gap-2">
            {KINDS.map(({ kind, title, hint, Icon }) => {
              const selected = draft.kind === kind
              return (
                <button
                  key={kind}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => pickKind(kind)}
                  className={cn(
                    "flex flex-col items-start gap-1 rounded-xl border p-3 text-right transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                    selected
                      ? "border-duck-navy bg-duck-yellow/20 ring-1 ring-duck-navy"
                      : "hover:bg-muted",
                  )}
                >
                  <Icon className="size-4" aria-hidden />
                  <span className="text-sm font-semibold">{title}</span>
                  <span className="text-[11px] leading-snug text-text-muted">{hint}</span>
                </button>
              )
            })}
          </div>
        </fieldset>

        {draft.kind !== "free" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1">
              <Label htmlFor="discount-value">
                {draft.kind === "percentage" ? s.percentLabel : s.amountLabel}
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="discount-value"
                  type="number"
                  inputMode="decimal"
                  min={1}
                  max={draft.kind === "percentage" ? 100 : undefined}
                  value={draft.value}
                  disabled={locked}
                  onChange={(event) => set("value", event.target.value)}
                />
                {draft.kind === "percentage" ? (
                  <span className="text-sm font-semibold text-text-muted">%</span>
                ) : (
                  <Select value={draft.currency} onValueChange={(next) => set("currency", next)} disabled={locked}>
                    <SelectTrigger className="w-24" aria-label={s.currency}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
            {draft.kind === "percentage" ? (
              <div className="grid gap-1">
                <Label htmlFor="discount-cap">{s.maxDiscount}</Label>
                <Input
                  id="discount-cap"
                  type="number"
                  inputMode="decimal"
                  min={1}
                  placeholder={s.unlimited}
                  value={draft.maxDiscount}
                  onChange={(event) => set("maxDiscount", event.target.value)}
                />
                <Hint>{s.maxDiscountHint}</Hint>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="grid gap-1">
          <Label htmlFor="discount-code">{s.code}</Label>
          <div className="flex gap-2">
            <Input
              id="discount-code"
              value={draft.code}
              disabled={locked}
              dir="ltr"
              placeholder={s.codePlaceholder}
              className="font-mono uppercase"
              aria-invalid={codeInvalid}
              onChange={(event) => set("code", event.target.value)}
            />
            <Button
              type="button"
              variant="outline"
              disabled={locked}
              onClick={() => set("code", generateDiscountCode())}
            >
              <Wand2 className="size-4" aria-hidden />
              {s.generate}
            </Button>
          </div>
          {codeInvalid ? (
            <p className="text-xs text-red-600">{s.codeInvalid}</p>
          ) : (
            <Hint>{s.codeHint}</Hint>
          )}
        </div>

        <div className="grid gap-1">
          <Label>{s.expiresLabel}</Label>
          <DateTimePicker value={draft.expires} onChange={(next) => set("expires", next)} required />
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs text-text-muted">{s.quickExpiry}</span>
            {[
              { days: 7, label: s.inWeek },
              { days: 30, label: s.inMonth },
              { days: 90, label: s.inThreeMonths },
            ].map(({ days, label }) => (
              <Button
                key={days}
                type="button"
                variant="outline"
                size="sm"
                className="h-7 rounded-full px-3 text-xs"
                onClick={() => set("expires", expiryInDays(days))}
              >
                {label}
              </Button>
            ))}
          </div>
          <Hint>{s.expiresHint}</Hint>
        </div>

        {role === "admin" ? (
          <div className="grid gap-1">
            <Label>{s.codeFor}</Label>
            <Select
              value={draft.supplierId}
              onValueChange={(next) => onChange({ ...draft, supplierId: next, tripIds: [] })}
              disabled={locked}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="platform">{s.platform}</SelectItem>
                {suppliers.map((supplier) => (
                  <SelectItem key={supplier.id} value={supplier.id}>
                    {resolveLocalizedField(supplier.name)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        <div className="rounded-lg bg-muted/60 p-3 text-sm">
          <span className="font-medium">{s.whoPays}</span> {whoPays}
        </div>

        <Collapsible open={conditionsOpen} onOpenChange={setConditionsOpen} className="rounded-xl border">
          <CollapsibleTrigger className="flex w-full items-center justify-between p-3 text-sm font-medium">
            <span>{s.conditions}</span>
            <ChevronDown
              className={cn("size-4 transition-transform", conditionsOpen && "rotate-180")}
              aria-hidden
            />
          </CollapsibleTrigger>
          <CollapsibleContent className="grid gap-4 border-t p-3">
            <Hint>{s.conditionsHint}</Hint>
            <div className="grid gap-1">
              <Label>{s.starts}</Label>
              <DateTimePicker value={draft.starts} onChange={(next) => set("starts", next)} />
              <Hint>{s.startsHint}</Hint>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid content-start gap-1">
                <Label htmlFor="discount-min">{s.minBooking}</Label>
                <Input
                  id="discount-min"
                  type="number"
                  inputMode="decimal"
                  min={1}
                  value={draft.minBooking}
                  onChange={(event) => set("minBooking", event.target.value)}
                />
                <Hint>{s.minBookingHint}</Hint>
              </div>
              <div className="grid content-start gap-1">
                <Label htmlFor="discount-limit">{s.usageLimit}</Label>
                <Input
                  id="discount-limit"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  placeholder={s.unlimited}
                  value={draft.limit}
                  onChange={(event) => set("limit", event.target.value)}
                />
                <Hint>{s.usageLimitHint}</Hint>
              </div>
            </div>
            <div className="grid gap-1">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={draft.once} onCheckedChange={(checked) => set("once", checked === true)} />
                {s.once}
              </label>
              <Hint>{s.onceHint}</Hint>
            </div>
            <div className="grid gap-1">
              <Label>{s.trips}</Label>
              <Hint>{s.tripsHint}</Hint>
              <div className="max-h-36 space-y-1 overflow-y-auto rounded-md border p-2">
                {visibleTrips.length === 0 ? (
                  <p className="text-xs text-text-muted">{s.noTrips}</p>
                ) : (
                  visibleTrips.map((trip) => (
                    <label key={trip.id} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        disabled={locked}
                        checked={draft.tripIds.includes(trip.id)}
                        onCheckedChange={(checked) =>
                          set(
                            "tripIds",
                            checked === true
                              ? [...draft.tripIds, trip.id]
                              : draft.tripIds.filter((id) => id !== trip.id),
                          )
                        }
                      />
                      {resolveLocalizedField(trip.name)}
                    </label>
                  ))
                )}
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        <div className="grid gap-1">
          <Label htmlFor="discount-note">{s.descriptionLabel}</Label>
          <Input
            id="discount-note"
            value={draft.description}
            onChange={(event) => set("description", event.target.value)}
          />
          <Hint>{s.noteHint}</Hint>
        </div>
      </div>

      <aside className="grid content-start gap-4 md:sticky md:top-0 md:self-start" aria-label={s.previewTitle}>
        <div className="rounded-xl border bg-duck-cyan/5 p-3">
          <p className="mb-2 text-sm font-semibold">{s.summaryTitle}</p>
          <ul className="space-y-1 text-xs" data-testid="discount-summary">
            {summary.map((line) => (
              <li key={line} className="flex gap-1.5">
                <span aria-hidden>•</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border p-3" data-testid="discount-preview">
          <p className="mb-2 text-sm font-semibold">{s.previewTitle}</p>
          <div className="mb-3 grid gap-1">
            <Label htmlFor="discount-example" className="text-xs text-text-muted">
              {s.previewAmount}
            </Label>
            <Input
              id="discount-example"
              type="number"
              inputMode="decimal"
              min={0}
              className="h-8"
              placeholder={String(exampleSubtotal)}
              value={exampleInput}
              onChange={(event) => setExampleInput(event.target.value)}
            />
          </div>

          <div className="space-y-2 rounded-lg bg-white p-3 shadow-sm">
            <p className="text-xs font-medium">{s.checkoutLabel}</p>
            <div className="flex gap-1.5">
              <span
                className="flex h-8 flex-1 items-center rounded-md border px-2 font-mono text-xs uppercase"
                dir="ltr"
              >
                {shownCode}
              </span>
              <span className="flex h-8 items-center rounded-md border px-2 text-xs">{s.checkoutApply}</span>
            </div>

            {preview.belowMinimum ? (
              <p className="text-xs text-red-600">{s.checkoutBelowMinimum}</p>
            ) : (
              <>
                <p className="flex items-center gap-1 text-xs text-green-700">
                  <CheckCircle2 className="size-3.5" aria-hidden />
                  {fill(s.checkoutApplied, { code: shownCode })}
                </p>
                <dl className="space-y-1 border-t pt-2 text-xs">
                  <div className="flex justify-between">
                    <dt>{s.previewBefore}</dt>
                    <dd>{money(exampleSubtotal)}</dd>
                  </div>
                  <div className="flex justify-between text-green-700">
                    <dt>
                      {s.discount} ({shownCode})
                    </dt>
                    <dd dir="ltr">−{money(preview.discount)}</dd>
                  </div>
                  <div className="flex justify-between border-t pt-1 text-sm font-semibold">
                    <dt>{s.previewTotal}</dt>
                    <dd data-testid="discount-preview-total">{money(preview.total)}</dd>
                  </div>
                </dl>
                {preview.capped ? <Hint>{s.previewCapped}</Hint> : null}
                {preview.total === 0 ? (
                  <div className="rounded-md bg-duck-yellow/20 p-2 text-xs">
                    <p className="font-medium">{s.checkoutFreeTitle}</p>
                    <p className="text-text-muted">{s.checkoutFreeNote}</p>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>
      </aside>
    </div>
  )
}
