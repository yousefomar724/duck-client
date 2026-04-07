"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useTranslations } from "next-intl"
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
import { resolveImageUrl } from "@/lib/image-utils"

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
  const t = useTranslations("supplierProfile")
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
      setKayak(String(r.kayak ?? 0))
      setWaterCycle(String(r.water_cycle ?? 0))
      setSup(String(r.sup ?? 0))
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
      addToast(error ?? t("iconUploadError"), "error")
      return
    }

    setIconUrl(data.image_url)
    addToast(t("iconUploadSuccess"), "success")
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

    addToast(t("profileSaved"), "success")
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
      addToast(t("storageAtLeastOneError"), "error")
      return
    }

    setSavingStorage(true)
    const { error } = await supplierStorageApi.setStorage({ resources })
    setSavingStorage(false)
    if (error) {
      addToast(error, "error")
      return
    }

    addToast(t("storageSaved"), "success")
    await auth.refreshOnboardingStatus()
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title={t("title")} description={t("loading")} />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <PageHeader title={t("title")} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-xs">
          <CardHeader className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-full bg-duck-cyan/10 text-duck-cyan flex items-center justify-center border border-duck-cyan/10">
                <User className="size-5" />
              </div>
              <div>
                <div className="font-bold">{t("businessProfileTitle")}</div>
                <div className="text-sm text-text-muted">
                  {t("businessProfileHint")}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>{t("businessName")}</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs text-text-muted">
                    {t("nameAr")}
                  </Label>
                  <Input
                    value={nameAr}
                    onChange={(e) => setNameAr(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-text-muted">
                    {t("nameEn")}
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
              <Label>{t("about")}</Label>
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs text-text-muted">
                    {t("aboutAr")}
                  </Label>
                  <Textarea
                    value={aboutAr}
                    onChange={(e) => setAboutAr(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-text-muted">
                    {t("aboutEn")}
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
              <Label>{t("iconOptional")}</Label>
              <div className="flex items-center gap-4">
                {iconPreviewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={iconPreviewUrl}
                    alt={t("iconPreviewAlt")}
                    className="h-16 w-16 rounded-full object-cover border"
                  />
                ) : (
                  <div className="h-16 w-16 rounded-full border bg-muted" />
                )}
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
                    {t("iconUploadHint")}
                  </p>
                </div>
              </div>
            </div>

            <Button
              type="button"
              className="w-full bg-duck-yellow text-duck-navy hover:bg-duck-yellow-hover"
              onClick={() => void handleSaveProfile()}
              disabled={savingProfile}
            >
              {savingProfile ? t("saving") : t("saveProfile")}
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
                <div className="font-bold">{t("storageTitle")}</div>
                <div className="text-sm text-text-muted">
                  {t("storageHint")}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4 rounded-xl border bg-white p-6">
              <div className="space-y-2">
                <Label htmlFor="kayak">{labels.kayak}</Label>
                <Input
                  id="kayak"
                  type="number"
                  min={0}
                  dir="ltr"
                  value={kayak}
                  onChange={(e) => setKayak(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="water_cycle">{labels.water_cycle}</Label>
                <Input
                  id="water_cycle"
                  type="number"
                  min={0}
                  dir="ltr"
                  value={waterCycle}
                  onChange={(e) => setWaterCycle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sup">{labels.sup}</Label>
                <Input
                  id="sup"
                  type="number"
                  min={0}
                  dir="ltr"
                  value={sup}
                  onChange={(e) => setSup(e.target.value)}
                />
              </div>
            </div>

            <Button
              type="button"
              className="w-full bg-duck-yellow text-duck-navy hover:bg-duck-yellow-hover"
              onClick={() => void handleSaveStorage()}
              disabled={savingStorage}
            >
              {savingStorage ? t("saving") : t("saveStorage")}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
