"use client"

import { useCallback, useEffect, useState } from "react"
import PageHeader from "@/components/shared/page-header"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import * as supplierStorageApi from "@/lib/api/supplier-storage"
import { useAuth } from "@/lib/stores/auth-store"
import { useToast } from "@/lib/stores/toast-store"
import { QuantityStepper } from "@/components/dashboard/quantity-stepper"
import { MobileActionBar } from "@/components/dashboard/mobile-action-bar"
import { DetailPageSkeleton } from "@/components/shared/loading-skeletons"
import { ErrorDisplay } from "@/components/shared/error-display"
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
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
        return
      }
      setError(err)
      return
    }
    const r = parseResources(data?.resources)
    setKayak(String(r.kayak ?? 0))
    setWaterCycle(String(r.water_cycle ?? 0))
    setSup(String(r.sup ?? 0))
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
    setSaving(true)
    const { error: err } = await supplierStorageApi.setStorage({ resources })
    setSaving(false)
    if (err) {
      addToast(err, "error")
      return
    }
    addToast("تم حفظ سعة المعدات", "success")
    await refreshOnboardingStatus()
    await load()
  }

  if (loading) {
    return (
      <div className="space-y-6 max-w-lg">
        <PageHeader
          title="سعة المعدات"
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
          title="سعة المعدات"
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
          title="سعة المعدات"
          description="حدد الحد الأقصى لكل نوع معدات متاح للحجز كل ساعة."
        />
        <ErrorDisplay error={error} onRetry={load} />
      </div>
    )
  }

  return (
    <div className="max-w-lg space-y-8 pb-24 md:pb-0">
      <PageHeader
        title="سعة المعدات"
        description="حدد الحد الأقصى لكل نوع معدات متاح للحجز كل ساعة (كاياك، دراجة مائية، SUP). يُستخدم ذلك لاحتساب التوفر عند الحجز."
      />

      <div className="space-y-4 rounded-xl border bg-white p-6">
        <div className="space-y-2">
          <Label htmlFor="kayak">{labels.kayak}</Label>
          <QuantityStepper id="kayak" value={kayak} onChange={setKayak} />
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
          <Label htmlFor="sup">{labels.sup}</Label>
          <QuantityStepper id="sup" value={sup} onChange={setSup} />
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
