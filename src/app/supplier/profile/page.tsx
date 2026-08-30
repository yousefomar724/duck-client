"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Package, User } from "lucide-react"

import PageHeader from "@/components/shared/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/lib/stores/auth-store"
import { useToast } from "@/lib/stores/toast-store"
import * as suppliersApi from "@/lib/api/suppliers"
import * as supplierStorageApi from "@/lib/api/supplier-storage"
import * as imagesApi from "@/lib/api/images"
import { ImageWithLogoFallback } from "@/components/shared/image-with-logo-fallback"
import { QuantityStepper } from "@/components/dashboard/quantity-stepper"
import { DetailPageSkeleton } from "@/components/shared/loading-skeletons"
import { resolveImageUrl } from "@/lib/image-utils"
import { supplierProfileStrings as s } from "@/lib/dashboard/strings"

const parseResources = (raw: unknown): Record<string, number> => {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, number>
  }
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as Record<string, number>
      return parsed ?? {}
    } catch {
      return {}
    }
  }
  return {}
}

const labels: Record<"kayak" | "water_cycle" | "sup", string> = {
  kayak: "كاياك",
  water_cycle: "دراجة مائية",
  sup: "التجديف وقوفاً",
}

export default function SupplierProfilePage() {
  const { addToast } = useToast()
  const auth = useAuth()
  const supplierId = auth.user?.supplier_id

  const [loading, setLoading] = useState(true)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingStorage, setSavingStorage] = useState(false)
  const [iconUploading, setIconUploading] = useState(false)

  // Profile
  const [nameAr, setNameAr] = useState("")
  const [nameEn, setNameEn] = useState("")
  const [aboutAr, setAboutAr] = useState("")
  const [aboutEn, setAboutEn] = useState("")
  const [iconUrl, setIconUrl] = useState("")
  const iconPreviewUrl = useMemo(
    () => resolveImageUrl(iconUrl) ?? null,
    [iconUrl],
  )

  // Storage
  const [kayak, setKayak] = useState("0")
  const [waterCycle, setWaterCycle] = useState("0")
  const [sup, setSup] = useState("0")
  const [kayakMaint, setKayakMaint] = useState("0")
  const [waterCycleMaint, setWaterCycleMaint] = useState("0")
  const [supMaint, setSupMaint] = useState("0")
  const [turnaround, setTurnaround] = useState("15")

  const load = useCallback(async () => {
    if (!supplierId) return
    setLoading(true)

    const [arRes, enRes] = await Promise.all([
      suppliersApi.getSupplier(supplierId, "ar"),
      suppliersApi.getSupplier(supplierId, "en"),
    ])

    if (arRes.data) {
      setNameAr(arRes.data.name as string)
      setAboutAr(arRes.data.about as string)
      setIconUrl(arRes.data.icon ?? "")
    }
    if (enRes.data) {
      setNameEn(enRes.data.name as string)
      setAboutEn(enRes.data.about as string)
    }

    const { data: storageData } =
      await supplierStorageApi.getStorage(supplierId)
    if (storageData?.resources) {
      const r = parseResources(storageData.resources)
      const m = parseResources(storageData.maintenance)
      setKayak(String(r.kayak ?? 0))
      setWaterCycle(String(r.water_cycle ?? 0))
      setSup(String(r.sup ?? 0))
      setKayakMaint(String(m.kayak ?? 0))
      setWaterCycleMaint(String(m.water_cycle ?? 0))
      setSupMaint(String(m.sup ?? 0))
      setTurnaround(String(storageData.turnaround_minutes ?? 15))
    }

    setLoading(false)
  }, [supplierId])

  useEffect(() => {
    const id = window.setTimeout(() => {
      void load()
    }, 0)
    return () => window.clearTimeout(id)
  }, [load])

  const handleUploadIcon = async (file: File | null) => {
    if (!file || !supplierId) return
    setIconUploading(true)
    const { data, error } = await imagesApi.uploadImage(file)
    setIconUploading(false)

    if (error || !data?.image_url) {
      addToast(error ?? s.iconUploadError, "error")
      return
    }

    setIconUrl(data.image_url)
    addToast(s.iconUploadSuccess, "success")
  }

  const handleSaveProfile = async () => {
    if (!supplierId) return
    setSavingProfile(true)

    const { error } = await suppliersApi.updateSupplier(supplierId, {
      name: { ar: nameAr.trim(), en: nameEn.trim() },
      about: { ar: aboutAr.trim(), en: aboutEn.trim() },
      icon: iconUrl.trim() ? iconUrl : undefined,
    })

    setSavingProfile(false)
    if (error) {
      addToast(error, "error")
      return
    }

    addToast(s.profileSaved, "success")
    await auth.refreshOnboardingStatus()
    window.dispatchEvent(new Event("duck:supplier-profile-updated"))
  }

  const handleSaveStorage = async () => {
    if (!supplierId) return
    const resources = {
      kayak: Math.max(0, parseInt(kayak, 10) || 0),
      water_cycle: Math.max(0, parseInt(waterCycle, 10) || 0),
      sup: Math.max(0, parseInt(sup, 10) || 0),
    }

    if (resources.kayak + resources.water_cycle + resources.sup === 0) {
      addToast(s.storageAtLeastOneError, "error")
      return
    }

    setSavingStorage(true)
    const { error } = await supplierStorageApi.setStorage({
      resources,
      maintenance: {
        kayak: Math.min(resources.kayak, Math.max(0, parseInt(kayakMaint, 10) || 0)),
        water_cycle: Math.min(
          resources.water_cycle,
          Math.max(0, parseInt(waterCycleMaint, 10) || 0),
        ),
        sup: Math.min(resources.sup, Math.max(0, parseInt(supMaint, 10) || 0)),
      },
      turnaround_minutes: Math.max(0, parseInt(turnaround, 10) || 0),
    })
    setSavingStorage(false)
    if (error) {
      addToast(error, "error")
      return
    }

    addToast(s.storageSaved, "success")
    await auth.refreshOnboardingStatus()
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title={s.title} description={s.businessProfileHint} />
        <DetailPageSkeleton />
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-4">
      <PageHeader title={s.title} description={s.businessProfileHint} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-xs">
          <CardHeader className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-full bg-duck-cyan/10 text-duck-cyan flex items-center justify-center border border-duck-cyan/10">
                <User className="size-5" />
              </div>
              <div>
                <div className="font-bold">{s.businessProfileTitle}</div>
                <div className="text-sm text-text-muted">
                  {s.businessProfileHint}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>{s.businessName}</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs text-text-muted">
                    {s.nameAr}
                  </Label>
                  <Input
                    value={nameAr}
                    onChange={(e) => setNameAr(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-text-muted">
                    {s.nameEn}
                  </Label>
                  <Input
                    dir="ltr"
                    value={nameEn}
                    onChange={(e) => setNameEn(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>{s.about}</Label>
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs text-text-muted">
                    {s.aboutAr}
                  </Label>
                  <Textarea
                    value={aboutAr}
                    onChange={(e) => setAboutAr(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-text-muted">
                    {s.aboutEn}
                  </Label>
                  <Textarea
                    dir="ltr"
                    value={aboutEn}
                    onChange={(e) => setAboutEn(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Label>{s.iconOptional}</Label>
              <div className="flex items-center gap-4">
                <div className="relative h-16 w-16 shrink-0 rounded-full border bg-muted overflow-hidden">
                  <ImageWithLogoFallback
                    src={iconPreviewUrl ?? undefined}
                    alt={iconPreviewUrl ? s.iconPreviewAlt : ""}
                    fill
                    className="rounded-full object-cover"
                    fallbackClassName="object-contain p-2 rounded-full"
                  />
                </div>
                <div className="flex-1 space-y-2">
                  <Input
                    type="file"
                    accept="image/*"
                    disabled={iconUploading}
                    onChange={(e) =>
                      void handleUploadIcon(e.target.files?.[0] ?? null)
                    }
                  />
                  <p className="text-xs text-text-muted">
                    {s.iconUploadHint}
                  </p>
                </div>
              </div>
            </div>

            <Button
              type="button"
              className="sticky bottom-3 z-20 h-11! w-full bg-duck-yellow text-duck-navy hover:bg-duck-yellow-hover"
              onClick={() => void handleSaveProfile()}
              disabled={savingProfile}
            >
              {savingProfile ? s.saving : s.saveProfile}
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-xs h-fit">
          <CardHeader className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-full bg-duck-yellow/20 text-duck-yellow flex items-center justify-center border border-duck-yellow/20">
                <Package className="size-5" />
              </div>
              <div>
                <div className="font-bold">{s.storageTitle}</div>
                <div className="text-sm text-text-muted">
                  {s.storageHint}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
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
              <div className="space-y-2">
                <Label htmlFor="kayak-maint">{labels.kayak} — صيانة</Label>
                <QuantityStepper
                  id="kayak-maint"
                  value={kayakMaint}
                  onChange={setKayakMaint}
                  max={Math.max(0, parseInt(kayak, 10) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="water_cycle-maint">{labels.water_cycle} — صيانة</Label>
                <QuantityStepper
                  id="water_cycle-maint"
                  value={waterCycleMaint}
                  onChange={setWaterCycleMaint}
                  max={Math.max(0, parseInt(waterCycle, 10) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sup-maint">{labels.sup} — صيانة</Label>
                <QuantityStepper
                  id="sup-maint"
                  value={supMaint}
                  onChange={setSupMaint}
                  max={Math.max(0, parseInt(sup, 10) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="turnaround">وقت التجهيز (دقائق)</Label>
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
            </div>

            <Button
              type="button"
              className="sticky bottom-3 z-20 h-11! w-full bg-duck-yellow text-duck-navy hover:bg-duck-yellow-hover"
              onClick={() => void handleSaveStorage()}
              disabled={savingStorage}
            >
              {savingStorage ? s.saving : s.saveStorage}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
