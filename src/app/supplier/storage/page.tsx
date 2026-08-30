"use client"

import { useCallback, useEffect, useState } from "react"
import PageHeader from "@/components/shared/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import * as supplierStorageApi from "@/lib/api/supplier-storage"
import { useAuth } from "@/lib/stores/auth-store"
import { useToast } from "@/lib/stores/toast-store"
import { QuantityStepper } from "@/components/dashboard/quantity-stepper"
import { MobileActionBar } from "@/components/dashboard/mobile-action-bar"
import { DetailPageSkeleton } from "@/components/shared/loading-skeletons"
import { ErrorDisplay } from "@/components/shared/error-display"
import { EquipmentView } from "@/components/dashboard/ops/equipment-view"
import { opsStrings } from "@/components/dashboard/ops/ops-strings"
import type { ResourceType } from "@/lib/types"

const labels: Record<ResourceType, string> = {
  kayak: "كاياك",
  water_cycle: "دراجة مائية",
  sup: "التجديف وقوفاً",
}

function parseResources(raw: unknown): Record<string, number> {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, number>
  }
  if (typeof raw === "string") {
    try {
      const p = JSON.parse(raw) as Record<string, number>
      return typeof p === "object" && p ? p : {}
    } catch {
      return {}
    }
  }
  return {}
}

export default function SupplierStoragePage() {
  const { user, refreshOnboardingStatus } = useAuth()
  const { addToast } = useToast()
  const supplierId = user?.supplier_id

  const [kayak, setKayak] = useState("0")
  const [waterCycle, setWaterCycle] = useState("0")
  const [sup, setSup] = useState("0")
  const [kayakMaint, setKayakMaint] = useState("0")
  const [waterCycleMaint, setWaterCycleMaint] = useState("0")
  const [supMaint, setSupMaint] = useState("0")
  const [turnaround, setTurnaround] = useState("15")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refreshToken, setRefreshToken] = useState(0)

  const load = useCallback(async () => {
    if (supplierId == null) {
      setLoading(false)
      setError("لا يوجد رقم مزود مرتبط بحسابك")
      return
    }
    setLoading(true)
    setError(null)
    const { data, error: err } = await supplierStorageApi.getStorage(supplierId)
    setLoading(false)
    if (err) {
      if (err.includes("404") || err.toLowerCase().includes("not found")) {
        setKayak("0")
        setWaterCycle("0")
        setSup("0")
        setKayakMaint("0")
        setWaterCycleMaint("0")
        setSupMaint("0")
        setTurnaround("15")
        return
      }
      setError(err)
      return
    }
    const r = parseResources(data?.resources)
    const m = parseResources(data?.maintenance)
    setKayak(String(r.kayak ?? 0))
    setWaterCycle(String(r.water_cycle ?? 0))
    setSup(String(r.sup ?? 0))
    setKayakMaint(String(m.kayak ?? 0))
    setWaterCycleMaint(String(m.water_cycle ?? 0))
    setSupMaint(String(m.sup ?? 0))
    setTurnaround(String(data?.turnaround_minutes ?? 15))
  }, [supplierId])

  useEffect(() => {
    const t = setTimeout(() => {
      void load()
    }, 0)
    return () => clearTimeout(t)
  }, [load])

  const handleSave = async () => {
    if (supplierId == null) return
    const resources = {
      kayak: Math.max(0, parseInt(kayak, 10) || 0),
      water_cycle: Math.max(0, parseInt(waterCycle, 10) || 0),
      sup: Math.max(0, parseInt(sup, 10) || 0),
    }
    if (resources.kayak + resources.water_cycle + resources.sup === 0) {
      addToast("أدخل سعة واحدة على الأقل لنوع المعدات", "error")
      return
    }
    const maintenance = {
      kayak: Math.min(resources.kayak, Math.max(0, parseInt(kayakMaint, 10) || 0)),
      water_cycle: Math.min(
        resources.water_cycle,
        Math.max(0, parseInt(waterCycleMaint, 10) || 0),
      ),
      sup: Math.min(resources.sup, Math.max(0, parseInt(supMaint, 10) || 0)),
    }
    setSaving(true)
    const { error: err } = await supplierStorageApi.setStorage({
      resources,
      maintenance,
      turnaround_minutes: Math.max(0, parseInt(turnaround, 10) || 0),
    })
    setSaving(false)
    if (err) {
      addToast(err, "error")
      return
    }
    addToast("تم حفظ سعة المعدات", "success")
    await refreshOnboardingStatus()
    await load()
    setRefreshToken((n) => n + 1)
  }

  if (loading) {
    return (
      <div className="space-y-6 max-w-lg">
        <PageHeader
          title={opsStrings.equipment}
          description="حدد الحد الأقصى لكل نوع معدات متاح للحجز كل ساعة."
        />
        <DetailPageSkeleton />
      </div>
    )
  }

  if (error && supplierId == null) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={opsStrings.equipment}
          description="حدد الحد الأقصى لكل نوع معدات متاح للحجز كل ساعة."
        />
        <ErrorDisplay error={error} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={opsStrings.equipment}
          description="حدد الحد الأقصى لكل نوع معدات متاح للحجز كل ساعة."
        />
        <ErrorDisplay error={error} onRetry={load} />
      </div>
    )
  }

  const kayakN = Math.max(0, parseInt(kayak, 10) || 0)
  const waterN = Math.max(0, parseInt(waterCycle, 10) || 0)
  const supN = Math.max(0, parseInt(sup, 10) || 0)

  return (
    <div className="max-w-lg space-y-8 pb-24 md:pb-0">
      <PageHeader
        title={opsStrings.equipment}
        description="حدد الحد الأقصى لكل نوع معدات متاح للحجز كل ساعة (كاياك، دراجة مائية، SUP). يُستخدم ذلك لاحتساب التوفر عند الحجز."
      />

      <EquipmentView refreshToken={refreshToken} />

      <div className="space-y-4 rounded-xl border bg-white p-6">
        <div className="space-y-2">
          <Label htmlFor="kayak">{labels.kayak}</Label>
          <QuantityStepper id="kayak" value={kayak} onChange={setKayak} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="kayak-maint">
            {labels.kayak} — {opsStrings.maintenance}
          </Label>
          <QuantityStepper
            id="kayak-maint"
            value={kayakMaint}
            onChange={setKayakMaint}
            max={kayakN}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="water_cycle">{labels.water_cycle}</Label>
          <QuantityStepper
            id="water_cycle"
            value={waterCycle}
            onChange={setWaterCycle}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="water_cycle-maint">
            {labels.water_cycle} — {opsStrings.maintenance}
          </Label>
          <QuantityStepper
            id="water_cycle-maint"
            value={waterCycleMaint}
            onChange={setWaterCycleMaint}
            max={waterN}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sup">{labels.sup}</Label>
          <QuantityStepper id="sup" value={sup} onChange={setSup} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sup-maint">
            {labels.sup} — {opsStrings.maintenance}
          </Label>
          <QuantityStepper
            id="sup-maint"
            value={supMaint}
            onChange={setSupMaint}
            max={supN}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="turnaround">{opsStrings.turnaround}</Label>
          <Input
            id="turnaround"
            type="number"
            min={0}
            step={5}
            dir="ltr"
            className="h-11!"
            value={turnaround}
            onChange={(e) => setTurnaround(e.target.value)}
          />
        </div>

        <Button
          type="button"
          className="hidden! h-11! bg-duck-yellow text-duck-navy hover:bg-duck-yellow-hover md:inline-flex!"
          onClick={() => void handleSave()}
          disabled={saving}
        >
          {saving ? "جاري الحفظ..." : "حفظ"}
        </Button>
      </div>
      <MobileActionBar>
        <Button
          type="button"
          className="h-11! w-full bg-duck-yellow text-duck-navy hover:bg-duck-yellow-hover"
          onClick={() => void handleSave()}
          disabled={saving}
        >
          {saving ? "جاري الحفظ..." : "حفظ"}
        </Button>
      </MobileActionBar>
    </div>
  )
}
