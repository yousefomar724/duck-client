"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { motion, AnimatePresence } from "framer-motion"
import { CheckCircle2, Package, User } from "lucide-react"
import { z } from "zod/v3"

import PageHeader from "@/components/shared/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
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

const stepSchema1 = z
  .object({
    name_ar: z.string(),
    name_en: z.string(),
    about_ar: z.string(),
    about_en: z.string(),
  })
  .superRefine((data, ctx) => {
    const nameOk =
      data.name_ar.trim().length > 0 || data.name_en.trim().length > 0
    if (!nameOk) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Business name is required",
        path: ["name_ar"],
      })
    }
    const aboutOk =
      data.about_ar.trim().length > 0 || data.about_en.trim().length > 0
    if (!aboutOk) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "About is required",
        path: ["about_ar"],
      })
    }
  })

const stepSchema2 = z.object({
  kayak: z.coerce.number().int().min(0),
  water_cycle: z.coerce.number().int().min(0),
  sup: z.coerce.number().int().min(0),
}).superRefine((data, ctx) => {
  if (data.kayak + data.water_cycle + data.sup <= 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "At least one resource must be > 0",
      path: ["kayak"],
    })
  }
})

type Step = 1 | 2

export default function SupplierOnboardingPage() {
  const router = useRouter()
  const t = useTranslations("supplierOnboarding")
  const { addToast } = useToast()
  const auth = useAuth()

  const supplierId = auth.user?.supplier_id
  const onboardingComplete = auth.onboardingComplete
  const onboardingSkipped = auth.onboardingSkipped

  const [step, setStep] = useState<Step>(1)
  const [loading, setLoading] = useState(true)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingStorage, setSavingStorage] = useState(false)

  const [nameAr, setNameAr] = useState("")
  const [nameEn, setNameEn] = useState("")
  const [aboutAr, setAboutAr] = useState("")
  const [aboutEn, setAboutEn] = useState("")
  const [iconUrl, setIconUrl] = useState<string>("")

  const [kayak, setKayak] = useState("0")
  const [waterCycle, setWaterCycle] = useState("0")
  const [sup, setSup] = useState("0")

  const [iconUploading, setIconUploading] = useState(false)

  const resolvedIconUrl = useMemo(() => resolveImageUrl(iconUrl) ?? null, [iconUrl])

  useEffect(() => {
    if (!supplierId) return
    if (onboardingComplete === true) {
      router.replace("/supplier/my-trips")
      return
    }
  }, [supplierId, onboardingComplete, router])

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
    }
    if (enRes.data) {
      setNameEn(enRes.data.name as string)
      setAboutEn(enRes.data.about as string)
    }
    if (arRes.data?.icon) setIconUrl(arRes.data.icon)

    const { data: storageData } = await supplierStorageApi.getStorage(
      supplierId,
    )
    if (storageData?.resources) {
      const r = parseResources(storageData.resources)
      setKayak(String(r.kayak ?? 0))
      setWaterCycle(String(r.water_cycle ?? 0))
      setSup(String(r.sup ?? 0))
    } else {
      setKayak("0")
      setWaterCycle("0")
      setSup("0")
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
    const parsed = stepSchema1.safeParse({
      name_ar: nameAr,
      name_en: nameEn,
      about_ar: aboutAr,
      about_en: aboutEn,
    })
    if (!parsed.success) {
      addToast(t("validationError"), "error")
      return
    }

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
    setStep(2)
  }

  const handleSaveStorage = async () => {
    if (!supplierId) return
    const parsed = stepSchema2.safeParse({
      kayak,
      water_cycle: waterCycle,
      sup,
    })
    if (!parsed.success) {
      addToast(t("validationError"), "error")
      return
    }

    setSavingStorage(true)
    const { error } = await supplierStorageApi.setStorage({
      resources: {
        kayak: Number(parsed.data.kayak),
        water_cycle: Number(parsed.data.water_cycle),
        sup: Number(parsed.data.sup),
      },
    })
    setSavingStorage(false)

    if (error) {
      addToast(error, "error")
      return
    }

    addToast(t("storageSaved"), "success")
    await auth.refreshOnboardingStatus()
    router.replace("/supplier/my-trips")
  }

  const handleSkip = () => {
    auth.markOnboardingSkipped()
    router.replace("/supplier/my-trips")
  }

  if (loading) {
    return (
      <div className="min-h-screen px-4 py-10 max-w-2xl mx-auto">
        <PageHeader title={t("title")} description={t("loading")} />
      </div>
    )
  }

  return (
    <div className="min-h-screen px-4 py-10 max-w-2xl mx-auto">
      <div className="space-y-6">
        <PageHeader
          title={t("title")}
          description={onboardingSkipped ? t("skippedDescription") : t("description")}
        />

        <Card className="shadow-xs">
          <CardHeader className="space-y-3">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full border ${
                  step === 1 ? "border-duck-cyan" : "border-muted"
                }`}
              >
                {step > 1 ? <CheckCircle2 className="w-5 h-5 text-duck-cyan" /> : <User className="w-5 h-5" />}
              </div>
              <div className="flex-1">
                <div className="font-bold">{t("step1Title")}</div>
                <div className="text-sm text-text-muted">{t("step1Subtitle")}</div>
              </div>
            </div>

            <Separator />

            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full border ${
                  step === 2 ? "border-duck-cyan" : "border-muted"
                }`}
              >
                {step > 2 ? <CheckCircle2 className="w-5 h-5 text-duck-cyan" /> : <Package className="w-5 h-5" />}
              </div>
              <div className="flex-1">
                <div className="font-bold">{t("step2Title")}</div>
                <div className="text-sm text-text-muted">{t("step2Subtitle")}</div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25 }}
                className="space-y-6"
              >
                {step === 1 && (
                  <>
                    <div className="space-y-2">
                      <Label>{t("businessName")}</Label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-xs text-text-muted">{t("nameAr")}</Label>
                          <Input
                            value={nameAr}
                            onChange={(e) => setNameAr(e.target.value)}
                            placeholder={t("nameArPlaceholder")}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs text-text-muted">{t("nameEn")}</Label>
                          <Input
                            dir="ltr"
                            value={nameEn}
                            onChange={(e) => setNameEn(e.target.value)}
                            placeholder={t("nameEnPlaceholder")}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>{t("about")}</Label>
                      <div className="grid grid-cols-1 gap-4">
                        <div className="space-y-2">
                          <Label className="text-xs text-text-muted">{t("aboutAr")}</Label>
                          <Textarea
                            value={aboutAr}
                            onChange={(e) => setAboutAr(e.target.value)}
                            placeholder={t("aboutArPlaceholder")}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs text-text-muted">{t("aboutEn")}</Label>
                          <Textarea
                            dir="ltr"
                            value={aboutEn}
                            onChange={(e) => setAboutEn(e.target.value)}
                            placeholder={t("aboutEnPlaceholder")}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label>{t("iconOptional")}</Label>
                      <div className="flex items-center gap-4">
                        {resolvedIconUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={resolvedIconUrl}
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
                            onChange={(e) => void handleUploadIcon(e.target.files?.[0] ?? null)}
                            disabled={iconUploading}
                          />
                          <p className="text-xs text-text-muted">{t("iconUploadHint")}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1"
                        onClick={handleSkip}
                      >
                        {t("skipForNow")}
                      </Button>
                      <Button
                        type="button"
                        className="flex-1 bg-duck-yellow text-duck-navy hover:bg-duck-yellow-hover"
                        onClick={() => void handleSaveProfile()}
                        disabled={savingProfile}
                      >
                        {savingProfile ? t("saving") : t("saveAndNext")}
                      </Button>
                    </div>
                  </>
                )}

                {step === 2 && (
                  <>
                    <div className="space-y-2">
                      <Label>{t("equipmentCapacity")}</Label>
                      <p className="text-sm text-text-muted">{t("equipmentCapacityHint")}</p>

                      <div className="space-y-4 rounded-xl border bg-white p-6">
                        <div className="space-y-2">
                          <Label htmlFor="kayak">{t("kayak")}</Label>
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
                          <Label htmlFor="water_cycle">{t("water_cycle")}</Label>
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
                          <Label htmlFor="sup">{t("sup")}</Label>
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
                    </div>

                    <div className="flex gap-3">
                      <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(1)}>
                        {t("back")}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1"
                        onClick={handleSkip}
                        disabled={savingStorage}
                      >
                        {t("skipForNow")}
                      </Button>
                      <Button
                        type="button"
                        className="flex-1 bg-duck-yellow text-duck-navy hover:bg-duck-yellow-hover"
                        onClick={() => void handleSaveStorage()}
                        disabled={savingStorage}
                      >
                        {savingStorage ? t("saving") : t("finish")}
                      </Button>
                    </div>
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

