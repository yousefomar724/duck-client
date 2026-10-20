"use client"

import { useEffect, useMemo, useState } from "react"
import PageHeader from "@/components/shared/page-header"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { discountStrings } from "@/lib/dashboard/discount-strings"
import {
  cairoPickerToInstant,
  discountDraftError,
  discountKindOf,
  discountRuleFor,
  instantToCairoPicker,
  isValidDraftCode,
} from "@/lib/booking/discount-form"
import {
  DiscountCodeForm,
  EMPTY_DRAFT,
  type DiscountFormDraft,
} from "./discount-code-form"
import { toSiteYmd } from "@/lib/time"
import { formatCurrency } from "@/lib/constants"
import { resolveLocalizedField } from "@/lib/dashboard/localize"
import * as discountApi from "@/lib/api/discount-codes"
import type { DiscountCodeRecord } from "@/lib/api/discount-codes"
import * as tripsApi from "@/lib/api/trips"
import * as suppliersApi from "@/lib/api/suppliers"
import type { Supplier, Trip } from "@/lib/types"
import { useToast } from "@/lib/stores/toast-store"

const STATUS_LABEL: Record<DiscountCodeRecord["display_status"], string> = {
  active: "نشط",
  scheduled: "مجدول",
  expired: "منتهي",
  exhausted: "مستنفد",
  disabled: "متوقف",
}

export function DiscountCodesManager({ role }: { role: "admin" | "supplier" }) {
  const { addToast } = useToast()
  const [codes, setCodes] = useState<DiscountCodeRecord[]>([])
  const [trips, setTrips] = useState<Trip[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<DiscountCodeRecord | null>(null)
  const [redemptionsFor, setRedemptionsFor] = useState<DiscountCodeRecord | null>(null)
  const [redemptions, setRedemptions] = useState<Awaited<ReturnType<typeof discountApi.listDiscountRedemptions>>["data"]>(null)
  const [statusFilter, setStatusFilter] = useState("all")
  const [supplierFilter, setSupplierFilter] = useState("all")

  const [draft, setDraft] = useState<DiscountFormDraft>(EMPTY_DRAFT)
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const locked = (editing?.used_count ?? 0) > 0

  const load = async () => {
    setLoading(true)
    const { data, error } = await discountApi.listDiscountCodes({
      status: statusFilter === "all" ? undefined : statusFilter,
      supplierId: role === "admin" && supplierFilter !== "all" ? supplierFilter : undefined,
    })
    setLoading(false)
    if (error || !data) {
      addToast(error ?? "فشل التحميل", "error")
      return
    }
    setCodes(data)
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, supplierFilter, role])

  useEffect(() => {
    const tripLoad = role === "admin" ? tripsApi.getTrips() : tripsApi.getMyTrips()
    void tripLoad.then(({ data }) => {
      if (data) setTrips(data)
    })
    if (role === "admin") {
      void suppliersApi.getSuppliers("ar").then(({ data }) => {
        if (data) setSuppliers(data)
      })
    }
  }, [role])

  const tripName = useMemo(() => {
    const map = new Map(trips.map((trip) => [trip.id, resolveLocalizedField(trip.name)]))
    return (id: string) => map.get(id) ?? id
  }, [trips])

  const resetForm = (record?: DiscountCodeRecord) => {
    setEditing(record ?? null)
    setDraft(
      record
        ? {
            code: record.code,
            description: record.description ?? "",
            kind: discountKindOf(record.type, record.value),
            value: String(record.value),
            currency: record.currency || "EGP",
            maxDiscount: record.max_discount ? String(record.max_discount) : "",
            minBooking: record.min_booking_amount ? String(record.min_booking_amount) : "",
            starts: instantToCairoPicker(record.starts_at),
            expires: instantToCairoPicker(record.expires_at),
            limit: record.usage_limit_total ? String(record.usage_limit_total) : "",
            once: record.once_per_customer,
            tripIds: record.trip_ids,
            supplierId: record.supplier_id ?? "platform",
          }
        : EMPTY_DRAFT,
    )
    setFormError(null)
  }

  const submit = async () => {
    if (!isValidDraftCode(draft.code)) {
      setFormError(discountStrings.codeInvalid)
      return
    }
    const rule = discountRuleFor(
      draft.kind,
      Number(draft.value),
      draft.maxDiscount ? Number(draft.maxDiscount) : null,
    )
    const expiresAt = cairoPickerToInstant(draft.expires)
    const startsAt = cairoPickerToInstant(draft.starts)
    const draftError = discountDraftError({
      type: rule.type,
      value: rule.value,
      currency: draft.currency,
      expiresAt,
      startsAt,
      currentExpiresAt: editing?.expires_at ?? null,
    })
    if (draftError === "percentRange") {
      setFormError(rule.type === "fixed" ? discountStrings.amountPositive : discountStrings.percentRange)
      return
    }
    if (draftError === "currencyRequired") {
      setFormError(discountStrings.currencyRequired)
      return
    }
    if (draftError === "pastExpiry") {
      setFormError(discountStrings.pastExpiry)
      return
    }
    const body = {
      code: draft.code.trim(),
      description: draft.description,
      type: rule.type,
      value: rule.value,
      currency: rule.type === "fixed" ? draft.currency : undefined,
      max_discount: rule.max_discount ?? null,
      min_booking_amount: draft.minBooking ? Number(draft.minBooking) : null,
      starts_at: startsAt?.toISOString() ?? null,
      expires_at: expiresAt?.toISOString() ?? "",
      usage_limit_total: draft.limit ? Number(draft.limit) : null,
      once_per_customer: draft.once,
      trip_ids: draft.tripIds,
      supplier_id:
        role === "admin" ? (draft.supplierId === "platform" ? null : draft.supplierId) : undefined,
    }
    setSaving(true)
    const result = editing
      ? await discountApi.updateDiscountCode(editing.id, body)
      : await discountApi.createDiscountCode(body)
    setSaving(false)
    if (result.error) {
      setFormError(result.error)
      return
    }
    setOpen(false)
    await load()
  }

  const remove = async (record: DiscountCodeRecord) => {
    const { error } = await discountApi.deleteDiscountCode(record.id)
    if (error) {
      addToast(error, "error")
      return
    }
    await load()
  }

  const openRedemptions = async (record: DiscountCodeRecord) => {
    setRedemptionsFor(record)
    const { data } = await discountApi.listDiscountRedemptions(record.id)
    setRedemptions(data)
  }

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        title={discountStrings.title}
        description={role === "admin" ? discountStrings.adminDescription : discountStrings.description}
      >
        <Button
          type="button"
          className="bg-duck-yellow text-duck-navy hover:bg-duck-yellow-hover"
          onClick={() => {
            resetForm()
            setOpen(true)
          }}
        >
          {discountStrings.create}
        </Button>
      </PageHeader>

      <div className="flex flex-wrap gap-2">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder={discountStrings.status} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{discountStrings.status}</SelectItem>
            {Object.entries(STATUS_LABEL).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {role === "admin" ? (
          <Select value={supplierFilter} onValueChange={setSupplierFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder={discountStrings.supplier} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{discountStrings.supplier}</SelectItem>
              <SelectItem value="platform">{discountStrings.platform}</SelectItem>
              {suppliers.map((supplier) => (
                <SelectItem key={supplier.id} value={supplier.id}>
                  {resolveLocalizedField(supplier.name)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
      </div>

      {loading ? (
        <p className="text-sm text-text-muted">جاري التحميل...</p>
      ) : codes.length === 0 ? (
        <p className="rounded-xl border bg-white p-6 text-sm text-text-muted">{discountStrings.empty}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-white">
          <table className="w-full text-sm">
            <thead className="text-text-muted">
              <tr className="border-b text-right">
                <th className="p-3 font-medium">{discountStrings.code}</th>
                <th className="p-3 font-medium">{discountStrings.value}</th>
                <th className="p-3 font-medium">{discountStrings.trips}</th>
                <th className="p-3 font-medium">{discountStrings.expires}</th>
                <th className="p-3 font-medium">{discountStrings.uses}</th>
                <th className="p-3 font-medium">{discountStrings.status}</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {codes.map((record) => (
                <tr key={record.id} className="border-b last:border-0">
                  <td className="p-3">
                    <span className="font-mono font-semibold" dir="ltr">
                      {record.code}
                    </span>
                    {record.funded_by === "platform" ? (
                      <span className="mr-2 rounded-full bg-duck-cyan/15 px-2 py-0.5 text-xs">
                        {discountStrings.byDuck}
                      </span>
                    ) : null}
                  </td>
                  <td className="p-3">
                    {discountKindOf(record.type, record.value) === "free"
                      ? discountStrings.kindFree
                      : record.type === "percentage"
                        ? `${record.value}%`
                        : formatCurrency(record.value, record.currency || "EGP")}
                  </td>
                  <td className="p-3">
                    {record.trip_ids.length === 0
                      ? discountStrings.allTrips
                      : record.trip_ids.map((id) => tripName(id)).join("، ")}
                  </td>
                  <td className="p-3" dir="ltr">
                    {toSiteYmd(new Date(record.expires_at))}
                  </td>
                  <td className="p-3">
                    {record.used_count}
                    {record.usage_limit_total != null ? ` / ${record.usage_limit_total}` : ""}
                    {record.pending_uses > 0 ? (
                      <div className="text-xs text-text-muted">
                        {record.pending_uses} {discountStrings.pendingUses}
                      </div>
                    ) : null}
                  </td>
                  <td className="p-3">{STATUS_LABEL[record.display_status]}</td>
                  <td className="p-3">
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => void openRedemptions(record)}>
                        {discountStrings.redemptions}
                      </Button>
                      {record.read_only ? (
                        <span className="self-center text-xs text-text-muted">{discountStrings.readOnly}</span>
                      ) : (
                        <>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              resetForm(record)
                              setOpen(true)
                            }}
                          >
                            تعديل
                          </Button>
                          <Button type="button" variant="outline" size="sm" onClick={() => void remove(record)}>
                            {record.used_count > 0 ? discountStrings.disable : discountStrings.delete}
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl" className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl!">
          <DialogHeader>
            <DialogTitle>{editing ? discountStrings.edit : discountStrings.create}</DialogTitle>
          </DialogHeader>
          {locked ? <p className="text-xs text-amber-700">{discountStrings.locked}</p> : null}
          {formError ? (
            <p className="text-sm text-red-600" role="alert">
              {formError}
            </p>
          ) : null}
          {/* Keyed so the conditions section opens for each code that has some. */}
          <DiscountCodeForm
            key={editing?.id ?? "new"}
            role={role}
            draft={draft}
            onChange={setDraft}
            trips={trips}
            suppliers={suppliers}
            locked={locked}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {discountStrings.cancel}
            </Button>
            <Button type="button" disabled={saving} onClick={() => void submit()}>
              {discountStrings.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={Boolean(redemptionsFor)} onOpenChange={(next) => !next && setRedemptionsFor(null)}>
        <SheetContent side="left" className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {discountStrings.redemptions}
              {redemptionsFor ? ` · ${redemptionsFor.code}` : ""}
            </SheetTitle>
          </SheetHeader>
          <ul className="space-y-3 p-4 text-sm">
            {(redemptions ?? []).map((row) => (
              <li key={row.id} className="rounded-lg border p-3">
                <p className="font-medium">{row.booking?.full_name ?? "—"}</p>
                <p dir="ltr">{row.booking?.phone_number}</p>
                <p>
                  {row.booking?.status}
                  {row.pending ? ` · ${discountStrings.pendingUses}` : ""}
                </p>
              </li>
            ))}
          </ul>
        </SheetContent>
      </Sheet>
    </div>
  )
}
