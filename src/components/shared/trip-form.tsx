/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect, useCallback } from "react"
import Image from "next/image"
import {
  Info,
  DollarSign,
  Calendar,
  ImageIcon,
  Users,
  MapPin,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { currencies } from "@/lib/constants"
import * as tripsApi from "@/lib/api/trips"
import * as imagesApi from "@/lib/api/images"
import * as destinationsApi from "@/lib/api/destinations"
import * as tourGuidesApi from "@/lib/api/tour-guides"
import { DateTimePicker } from "@/components/shared/date-time-picker"
import { ErrorDisplay } from "@/components/shared/error-display"
import type { Trip, Destination, Supplier, TourGuide } from "@/lib/types"
import { resolveImageUrl } from "@/lib/image-utils"

/** Go gorm.Model serializes primary key as `ID`; normalize to `id` for the UI. */
function normalizeTourGuides(list: TourGuide[]): TourGuide[] {
  return list
    .map((g) => {
      const raw = g as TourGuide & { ID?: number }
      const id = g.ID ?? raw.ID
      if (id == null) return null
      return { ...g, ID: id }
    })
    .filter((g): g is TourGuide => g != null)
}

interface TripFormProps {
  mode: "create" | "edit"
  initialData?: Trip | null
  onSuccess: () => void
  onCancel: () => void
  showSupplierField?: boolean
  suppliers?: Supplier[]
  useAdminImageUpload?: boolean
}

export default function TripForm({
  mode,
  initialData,
  onSuccess,
  onCancel,
  showSupplierField = false,
  suppliers = [],
  useAdminImageUpload = false,
}: TripFormProps) {
  const getSupplierName = (supplier: Supplier) =>
    typeof supplier.name === "string"
      ? supplier.name
      : supplier.name.ar || supplier.name.en || "Unknown Supplier"

  const [formData, setFormData] = useState({
    name_ar: "",
    name_en: "",
    description_ar: "",
    description_en: "",
    destination_ids: [] as number[],
    price: "",
    foreigner_price: "",
    guide_mandatory: false,
    guide_price: "",
    display_order: "0",
    currency: "EGP",
    refundable: true,
    cancelation_policy_ar: "",
    cancelation_policy_en: "",
    duration: "1",
    max_guests: "",
    supplier_id: "",
    is_tour: true,
    tour_guide_id: "",
  })
  const [fromDate, setFromDate] = useState<Date | undefined>(undefined)
  const [toDate, setToDate] = useState<Date | undefined>(undefined)
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>([])
  const [destinations, setDestinations] = useState<Destination[]>([])
  const [tourGuides, setTourGuides] = useState<TourGuide[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingDestinations, setIsLoadingDestinations] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const populateForm = useCallback((tripData: Trip) => {
    const tripName =
      typeof tripData.name === "string"
        ? { ar: tripData.name, en: "" }
        : tripData.name
    const tripDesc =
      typeof tripData.description === "string"
        ? { ar: tripData.description, en: "" }
        : tripData.description
    const tripPolicy =
      typeof tripData.cancelation_policy === "string"
        ? { ar: tripData.cancelation_policy, en: "" }
        : tripData.cancelation_policy

    const imageUrls: string[] = []
    if (Array.isArray(tripData.images)) {
      imageUrls.push(...(tripData.images as string[]))
    } else if (typeof tripData.images === "string") {
      imageUrls.push(tripData.images)
    } else if (
      tripData.images &&
      typeof tripData.images === "object" &&
      !Array.isArray(tripData.images)
    ) {
      imageUrls.push(
        ...Object.values(tripData.images as Record<string, string>),
      )
    }

    setFormData({
      name_ar: tripName.ar || "",
      name_en: tripName.en || "",
      description_ar: tripDesc.ar || "",
      description_en: tripDesc.en || "",
      destination_ids: tripData.destinations?.map((d) => d.id) || [],
      price: tripData.price.toString(),
      foreigner_price: (tripData.foreigner_price ?? 0).toString(),
      guide_mandatory: tripData.guide_mandatory ?? false,
      guide_price: (tripData.guide_price ?? 0).toString(),
      display_order: (tripData.display_order ?? 0).toString(),
      currency: tripData.currency,
      refundable: tripData.refundable,
      cancelation_policy_ar: tripPolicy?.ar || "",
      cancelation_policy_en: tripPolicy?.en || "",
      duration: (tripData.duration ?? 1).toString(),
      max_guests: tripData.max_guests.toString(),
      supplier_id: tripData.supplier_id?.toString() || "",
      is_tour: tripData.is_tour ?? false,
      tour_guide_id: tripData.tour_guide_id?.toString() || "",
    })
    setFromDate(tripData.from ? new Date(tripData.from) : undefined)
    setToDate(tripData.to ? new Date(tripData.to) : undefined)
    setExistingImageUrls(imageUrls)
  }, [])

  useEffect(() => {
    if (mode === "edit" && initialData) {
      populateForm(initialData)
    }
  }, [mode, initialData, populateForm])

  useEffect(() => {
    const fetchDestinations = async () => {
      const { data, error: fetchError } =
        await destinationsApi.getDestinations("ar")
      if (!fetchError && data) {
        setDestinations(data)
      }
      setIsLoadingDestinations(false)
    }
    const fetchTourGuides = async () => {
      const { data } = await tourGuidesApi.getTourGuides()
      if (data) setTourGuides(normalizeTourGuides(data))
    }
    fetchDestinations()
    fetchTourGuides()
  }, [])

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setImageFiles((prev) => [...prev, ...Array.from(e.target.files!)])
    }
  }

  const removeExistingImage = (index: number) => {
    setExistingImageUrls((prev) => prev.filter((_, i) => i !== index))
  }

  const removeNewImage = (index: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      // Upload images
      const uploadedImageUrls: string[] = []
      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i]
        const { data: imageData, error: uploadErr } = await (useAdminImageUpload
          ? imagesApi.uploadImageForAdmin(file)
          : imagesApi.uploadImage(file))
        if (uploadErr) {
          throw new Error(`خطأ في تحميل الصورة: ${uploadErr}`)
        }
        if (imageData?.image_url) {
          uploadedImageUrls.push(imageData.image_url)
        }
      }

      const apiBase = process.env.NEXT_PUBLIC_API_URL || ""
      const fullUrls = uploadedImageUrls.map((url) =>
        url.startsWith("/") && apiBase
          ? `${apiBase.replace(/\/$/, "")}${url}`
          : url,
      )
      const allImageUrls = [...existingImageUrls, ...fullUrls]

      const payload: any = {
        name: { ar: formData.name_ar, en: formData.name_en },
        description: {
          ar: formData.description_ar,
          en: formData.description_en,
        },
        destination: formData.destination_ids.length > 0,
        location: false,
        is_tour: formData.is_tour,
        price: parseFloat(formData.price),
        foreigner_price: parseFloat(formData.foreigner_price) || 0,
        guide_mandatory: formData.guide_mandatory,
        guide_price: parseFloat(formData.guide_price) || 0,
        display_order: parseInt(formData.display_order, 10) || 0,
        currency: formData.currency,
        refundable: formData.refundable,
        cancelation_policy: {
          ar: formData.cancelation_policy_ar,
          en: formData.cancelation_policy_en,
        },
        from: fromDate?.toISOString(),
        to: toDate?.toISOString() ?? undefined,
        duration: parseInt(formData.duration, 10) || (formData.is_tour ? 0 : 1),
        max_guests: parseInt(formData.max_guests, 10),
        images: allImageUrls,
        destination_ids: formData.destination_ids,
      }

      if (formData.tour_guide_id) {
        payload.tour_guide_id = parseInt(formData.tour_guide_id, 10)
      }

      if (showSupplierField && formData.supplier_id) {
        payload.supplier_id = parseInt(formData.supplier_id, 10)
      }

      if (mode === "create") {
        const { error: createError } = await tripsApi.createTrip(payload)
        if (createError) throw new Error(createError)
      } else if (initialData) {
        const { error: updateError } = await tripsApi.updateTrip(
          initialData.id,
          payload,
        )
        if (updateError) throw new Error(updateError)
      }

      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ غير متوقع")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="p-0!">
      <CardContent className="p-6">
        {error && (
          <ErrorDisplay
            error={error}
            onRetry={() => setError(null)}
            showRetry={false}
          />
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Supplier Assignment (admin only) */}
          {showSupplierField && suppliers.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-duck-navy border-b pb-2 flex items-center gap-2">
                <Users className="w-5 h-5" />
                تعيين المورد
              </h2>
              <div className="space-y-2">
                <Label htmlFor="supplier_id">المورد</Label>
                <Select
                  dir="rtl"
                  value={formData.supplier_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, supplier_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر المورد" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((supplier) => (
                      <SelectItem
                        key={supplier.id}
                        value={supplier.id.toString()}
                      >
                        {getSupplierName(supplier)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Type Toggle */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-duck-navy border-b pb-2 flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              نوع العرض
            </h2>
            <div className="flex items-center gap-3">
              <Checkbox
                id="is_tour"
                checked={formData.is_tour}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_tour: checked === true })
                }
              />
              <Label htmlFor="is_tour" className="cursor-pointer font-normal">
                جولة سياحية (Tour)
              </Label>
            </div>
            <p className="text-xs text-text-muted">
              {formData.is_tour
                ? "الجولة: يتم حساب السعر بناءً على عدد الأشخاص × عدد الساعات"
                : "الرحلة: يتم حساب السعر بناءً على الكمية"}
            </p>
          </div>

          {/* Basic Info Section */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-duck-navy border-b pb-2 flex items-center gap-2">
              <Info className="w-5 h-5" />
              المعلومات الأساسية
            </h2>
            <div className="grid gap-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name_ar">اسم الرحلة (عربي)</Label>
                  <Input
                    id="name_ar"
                    value={formData.name_ar}
                    onChange={(e) =>
                      setFormData({ ...formData, name_ar: e.target.value })
                    }
                    placeholder="مثال: جولة الكاياك على النيل"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name_en">اسم الرحلة (English)</Label>
                  <Input
                    id="name_en"
                    value={formData.name_en}
                    onChange={(e) =>
                      setFormData({ ...formData, name_en: e.target.value })
                    }
                    placeholder="Example: Kayak Tour on the Nile"
                    required
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="description_ar">الوصف (عربي)</Label>
                  <Textarea
                    id="description_ar"
                    value={formData.description_ar}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        description_ar: e.target.value,
                      })
                    }
                    placeholder="وصف تفصيلي للرحلة..."
                    rows={3}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description_en">الوصف (English)</Label>
                  <Textarea
                    id="description_en"
                    value={formData.description_en}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        description_en: e.target.value,
                      })
                    }
                    placeholder="Detailed description of the trip..."
                    rows={3}
                    required
                  />
                </div>
              </div>

              {/* Destinations */}
              <div className="space-y-2">
                <Label>اختر الوجهات (اختياري)</Label>
                {isLoadingDestinations ? (
                  <p className="text-sm text-text-muted">جاري التحميل...</p>
                ) : destinations.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {destinations.map((dest) => (
                      <div key={dest.id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`dest-${dest.id}`}
                          checked={formData.destination_ids.includes(dest.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({
                                ...formData,
                                destination_ids: [
                                  ...formData.destination_ids,
                                  dest.id,
                                ],
                              })
                            } else {
                              setFormData({
                                ...formData,
                                destination_ids:
                                  formData.destination_ids.filter(
                                    (id) => id !== dest.id,
                                  ),
                              })
                            }
                          }}
                          className="w-4 h-4 rounded border-gray-300"
                        />
                        <Label
                          htmlFor={`dest-${dest.id}`}
                          className="mb-0 text-sm cursor-pointer"
                        >
                          {typeof dest.name === "string"
                            ? dest.name
                            : dest.name?.ar || "Destination"}
                        </Label>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-text-muted">لا توجد وجهات متاحة</p>
                )}
              </div>

              {/* Tour Guide */}
              <div className="space-y-2">
                <Label htmlFor="tour_guide_id">المرشد (اختياري)</Label>
                <Select
                  dir="rtl"
                  value={formData.tour_guide_id}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      tour_guide_id: value === "none" ? "" : value,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر المرشد" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">بدون مرشد</SelectItem>
                    {tourGuides.map((guide) => (
                      <SelectItem key={guide.ID} value={String(guide.ID)}>
                        {guide.name} — {guide.price} ج.م
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Pricing Section */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-duck-navy border-b pb-2 flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              الأسعار والإلغاء
            </h2>
            <div className="grid gap-4">
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">السعر للمصريين</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) =>
                      setFormData({ ...formData, price: e.target.value })
                    }
                    placeholder="180"
                    required
                  />
                  {formData.is_tour && (
                    <p className="text-xs text-duck-cyan">
                      السعر لكل ضيف في الساعة
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="foreigner_price">السعر للأجانب</Label>
                  <Input
                    id="foreigner_price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.foreigner_price}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        foreigner_price: e.target.value,
                      })
                    }
                    placeholder="250"
                  />
                  {formData.is_tour && (
                    <p className="text-xs text-duck-cyan">
                      السعر لكل ضيف في الساعة
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">العملة</Label>
                  <Select
                    dir="rtl"
                    value={formData.currency}
                    onValueChange={(value) =>
                      setFormData({ ...formData, currency: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.map((currency) => (
                        <SelectItem key={currency.value} value={currency.value}>
                          {currency.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="refundable"
                  checked={formData.refundable}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, refundable: checked === true })
                  }
                />
                <Label
                  htmlFor="refundable"
                  className="cursor-pointer font-normal"
                >
                  قابل للاسترداد
                </Label>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cancelation_policy_ar">
                    سياسة الإلغاء (عربي)
                  </Label>
                  <Textarea
                    id="cancelation_policy_ar"
                    value={formData.cancelation_policy_ar}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        cancelation_policy_ar: e.target.value,
                      })
                    }
                    placeholder="مثال: يمكن الإلغاء قبل 24 ساعة من موعد الرحلة"
                    rows={3}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cancelation_policy_en">
                    سياسة الإلغاء (English)
                  </Label>
                  <Textarea
                    id="cancelation_policy_en"
                    value={formData.cancelation_policy_en}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        cancelation_policy_en: e.target.value,
                      })
                    }
                    placeholder="Example: Cancellation allowed 24 hours before trip"
                    rows={3}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Guide Section */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-duck-navy border-b pb-2 flex items-center gap-2">
              <Users className="w-5 h-5" />
              المرشد
            </h2>
            <div className="grid gap-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="guide_mandatory"
                  checked={formData.guide_mandatory}
                  onCheckedChange={(checked) =>
                    setFormData({
                      ...formData,
                      guide_mandatory: checked === true,
                    })
                  }
                />
                <Label
                  htmlFor="guide_mandatory"
                  className="cursor-pointer font-normal"
                >
                  المرشد إلزامي لهذه الرحلة
                </Label>
              </div>
              <div className="space-y-2">
                <Label htmlFor="guide_price">سعر المرشد (اختياري)</Label>
                <Input
                  id="guide_price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.guide_price}
                  onChange={(e) =>
                    setFormData({ ...formData, guide_price: e.target.value })
                  }
                  placeholder="0"
                />
                <p className="text-xs text-text-muted">
                  {formData.guide_mandatory
                    ? "يُضاف هذا السعر إلى إجمالي كل حجز."
                    : "يُضاف هذا السعر فقط عند اختيار العميل لمرشد أثناء الحجز."}
                </p>
              </div>
            </div>
          </div>

          {/* Schedule Section */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-duck-navy border-b pb-2 flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              الجدول الزمني
            </h2>
            <div className="grid gap-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>من تاريخ</Label>
                  <DateTimePicker
                    value={fromDate}
                    onChange={setFromDate}
                    placeholder="تاريخ البدء"
                    required
                    id="from"
                  />
                </div>
                <div className="space-y-2">
                  <Label>إلى تاريخ</Label>
                  <DateTimePicker
                    value={toDate}
                    onChange={setToDate}
                    placeholder="تاريخ الانتهاء"
                    id="to"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duration">
                    {formData.is_tour
                      ? "المدة الافتراضية (ساعات)"
                      : "المدة (ساعات)"}
                  </Label>
                  <Input
                    id="duration"
                    type="number"
                    min={formData.is_tour ? 0 : 1}
                    value={formData.duration}
                    onChange={(e) =>
                      setFormData({ ...formData, duration: e.target.value })
                    }
                    placeholder={formData.is_tour ? "0" : "1"}
                  />
                  {formData.is_tour && (
                    <p className="text-xs text-text-muted">
                      العميل يحدد عدد الساعات عند الحجز
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max_guests">عدد الاشخاص الأقصى</Label>
                  <Input
                    id="max_guests"
                    type="number"
                    value={formData.max_guests}
                    onChange={(e) =>
                      setFormData({ ...formData, max_guests: e.target.value })
                    }
                    placeholder="10"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="display_order">ترتيب العرض</Label>
                  <Input
                    id="display_order"
                    type="number"
                    min="0"
                    value={formData.display_order}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        display_order: e.target.value,
                      })
                    }
                    placeholder="0"
                  />
                  <p className="text-xs text-text-muted">
                    الأقل يظهر أولاً في قائمة الرحلات.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Images Section */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-duck-navy border-b pb-2 flex items-center gap-2">
              <ImageIcon className="w-5 h-5" />
              الصور
            </h2>
            <div className="grid gap-4">
              {/* Existing images (edit mode) */}
              {mode === "edit" && existingImageUrls.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">الصور الحالية</p>
                  <div className="grid grid-cols-3 gap-2">
                    {existingImageUrls.map((url, index) => (
                      <div
                        key={`existing-${index}`}
                        className="relative aspect-square rounded border border-gray-300 overflow-hidden bg-gray-100"
                      >
                        <Image
                          width={0}
                          height={0}
                          sizes="100vw"
                          src={resolveImageUrl(url) ?? url}
                          alt=""
                          className="w-full h-full object-cover"
                          unoptimized
                        />
                        <button
                          type="button"
                          onClick={() => removeExistingImage(index)}
                          className="absolute top-1 start-1 rounded bg-red-500 text-white text-xs px-2 py-1"
                        >
                          حذف
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="images">
                  {mode === "edit" ? "اضافة صور جديدة" : "اختر صور الرحلة"}
                </Label>
                <Input
                  id="images"
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageChange}
                  className="cursor-pointer"
                />
                <p className="text-xs text-text-muted">
                  يمكنك اختيار عدة صور. سيتم تحميلها تلقائياً عند حفظ الرحلة.
                </p>
              </div>

              {imageFiles.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">الصور المختارة:</p>
                  <div className="grid grid-cols-3 gap-2">
                    {imageFiles.map((file, index) => (
                      <div
                        key={`new-${index}`}
                        className="relative w-full aspect-square bg-gray-100 rounded border border-gray-300 flex items-center justify-center overflow-hidden"
                      >
                        {file.type.startsWith("image/") && (
                          <img
                            src={URL.createObjectURL(file)}
                            alt={`Preview ${index}`}
                            className="w-full h-full object-cover"
                          />
                        )}
                        <button
                          type="button"
                          onClick={() => removeNewImage(index)}
                          className="absolute top-1 start-1 rounded bg-red-500 text-white text-xs px-2 py-1"
                        >
                          حذف
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-4">
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-duck-yellow hover:bg-duck-yellow-hover text-duck-navy font-bold"
            >
              {isLoading
                ? "جاري الحفظ..."
                : mode === "edit"
                  ? "حفظ التغييرات"
                  : formData.is_tour
                    ? "حفظ الجولة"
                    : "حفظ الرحلة"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
            >
              إلغاء
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
