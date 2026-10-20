"use client"

import { useEffect, useMemo, useState } from "react"
import PageHeader from "@/components/shared/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
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
import { DateTimePicker } from "@/components/shared/date-time-picker"
import { discountStrings } from "@/lib/dashboard/discount-strings"
import {
  cairoPickerToInstant,
  discountDraftError,
  instantToCairoPicker,
} from "@/lib/booking/discount-form"
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

  const [code, setCode] = useState("")
  const [description, setDescription] = useState("")
  const [type, setType] = useState<"percentage" | "fixed">("percentage")
  const [value, setValue] = useState("10")
  const [currency, setCurrency] = useState("EGP")
  const [maxDiscount, setMaxDiscount] = useState("")
  const [minBooking, setMinBooking] = useState("")
  const [starts, setStarts] = useState<Date | undefined>()
  const [expires, setExpires] = useState<Date | undefined>()
  const [limit, setLimit] = useState("")
  const [once, setOnce] = useState(false)
  const [tripIds, setTripIds] = useState<string[]>([])
  const [supplierId, setSupplierId] = useState("platform")
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
    setCode(record?.code ?? "")
    setDescription(record?.description ?? "")
    setType(record?.type ?? "percentage")
    setValue(record ? String(record.value) : "10")
    setCurrency(record?.currency || "EGP")
    setMaxDiscount(record?.max_discount ? String(record.max_discount) : "")
    setMinBooking(record?.min_booking_amount ? String(record.min_booking_amount) : "")
    setStarts(instantToCairoPicker(record?.starts_at))
    setExpires(instantToCairoPicker(record?.expires_at))
    setLimit(record?.usage_limit_total ? String(record.usage_limit_total) : "")
    setOnce(record?.once_per_customer ?? false)
    setTripIds(record?.trip_ids ?? [])
    setSupplierId(record?.supplier_id ?? "platform")
    setFormError(null)
  }

  const submit = async () => {
    const numericValue = Number(value)
    const expiresAt = cairoPickerToInstant(expires)
    const startsAt = cairoPickerToInstant(starts)
    const draftError = discountDraftError({
      type,
      value: numericValue,
      currency,
      expiresAt,
      startsAt,
      currentExpiresAt: editing?.expires_at ?? null,
    })
    if (draftError === "percentRange") {
      setFormError(discountStrings.percentRange)
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
      code,
      description,
      type,
      value: numericValue,
      currency: type === "fixed" ? currency : undefined,
      max_discount: type === "percentage" && maxDiscount ? Number(maxDiscount) : null,
      min_booking_amount: minBooking ? Number(minBooking) : null,
      starts_at: startsAt?.toISOString() ?? null,
      expires_at: expiresAt?.toISOString() ?? "",
      usage_limit_total: limit ? Number(limit) : null,
      once_per_customer: once,
      trip_ids: tripIds,
      supplier_id: role === "admin" ? (supplierId === "platform" ? null : supplierId) : undefined,
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

  const visibleTrips =
    role === "admin" && supplierId !== "platform"
      ? trips.filter((trip) => trip.supplier_id === supplierId)
      : trips

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
                    {record.type === "percentage"
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
        <DialogContent dir="rtl" className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "تعديل الكود" : discountStrings.create}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            {locked ? <p className="text-xs text-amber-700">{discountStrings.locked}</p> : null}
            {formError ? (
              <p className="text-sm text-red-600" role="alert">
                {formError}
              </p>
            ) : null}
            <div className="grid gap-1">
              <Label htmlFor="discount-code">{discountStrings.code}</Label>
              <Input
                id="discount-code"
                value={code}
                disabled={locked}
                dir="ltr"
                className="uppercase"
                onChange={(event) => setCode(event.target.value)}
              />
            </div>
            <div className="grid gap-1">
              <Label>{discountStrings.type}</Label>
              <Select value={type} onValueChange={(next) => setType(next as "percentage" | "fixed")} disabled={locked}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">{discountStrings.percentage}</SelectItem>
                  <SelectItem value="fixed">{discountStrings.fixed}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1">
              <Label htmlFor="discount-value">{discountStrings.value}</Label>
              <Input
                id="discount-value"
                type="number"
                min={1}
                max={type === "percentage" ? 100 : undefined}
                value={value}
                disabled={locked}
                onChange={(event) => setValue(event.target.value)}
              />
              {type === "percentage" ? (
                <p className="text-xs text-text-muted">{discountStrings.freeHint}</p>
              ) : null}
            </div>
            {type === "fixed" ? (
              <div className="grid gap-1">
                <Label htmlFor="discount-currency">{discountStrings.currency}</Label>
                <Input
                  id="discount-currency"
                  value={currency}
                  disabled={locked}
                  onChange={(event) => setCurrency(event.target.value)}
                />
              </div>
            ) : (
              <div className="grid gap-1">
                <Label htmlFor="discount-cap">{discountStrings.maxDiscount}</Label>
                <Input
                  id="discount-cap"
                  type="number"
                  value={maxDiscount}
                  onChange={(event) => setMaxDiscount(event.target.value)}
                />
              </div>
            )}
            <div className="grid gap-1">
              <Label htmlFor="discount-min">{discountStrings.minBooking}</Label>
              <Input id="discount-min" type="number" value={minBooking} onChange={(event) => setMinBooking(event.target.value)} />
            </div>
            <div className="grid gap-1">
              <Label>{discountStrings.starts}</Label>
              <DateTimePicker value={starts} onChange={setStarts} />
            </div>
            <div className="grid gap-1">
              <Label>{discountStrings.expires}</Label>
              <DateTimePicker value={expires} onChange={setExpires} required />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="discount-limit">{discountStrings.usageLimit}</Label>
              <Input
                id="discount-limit"
                type="number"
                placeholder={discountStrings.unlimited}
                value={limit}
                onChange={(event) => setLimit(event.target.value)}
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={once} onCheckedChange={(checked) => setOnce(checked === true)} />
              {discountStrings.once}
            </label>
            {role === "admin" ? (
              <div className="grid gap-1">
                <Label>{discountStrings.supplier}</Label>
                <Select value={supplierId} onValueChange={setSupplierId} disabled={locked}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="platform">{discountStrings.platform}</SelectItem>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {resolveLocalizedField(supplier.name)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            <div className="grid gap-1">
              <Label>{discountStrings.trips}</Label>
              <p className="text-xs text-text-muted">{discountStrings.allTrips}</p>
              <div className="max-h-32 space-y-1 overflow-y-auto rounded-md border p-2">
                {visibleTrips.map((trip) => (
                  <label key={trip.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      disabled={locked}
                      checked={tripIds.includes(trip.id)}
                      onCheckedChange={(checked) => {
                        setTripIds((current) =>
                          checked === true
                            ? [...current, trip.id]
                            : current.filter((id) => id !== trip.id),
                        )
                      }}
                    />
                    {resolveLocalizedField(trip.name)}
                  </label>
                ))}
              </div>
            </div>
            <div className="grid gap-1">
              <Label htmlFor="discount-note">{discountStrings.descriptionLabel}</Label>
              <Input id="discount-note" value={description} onChange={(event) => setDescription(event.target.value)} />
            </div>
          </div>
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
