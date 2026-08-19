"use client"

import { useEffect, useCallback, useState } from "react"
import { useForm, useFieldArray, type Resolver } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  Info,
  DollarSign,
  Calendar,
  ImageIcon,
  Users,
  MapPin,
  HelpCircle,
  Plus,
  Trash2,
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
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form"
import { currencies } from "@/lib/constants"
import * as tripsApi from "@/lib/api/trips"
import * as imagesApi from "@/lib/api/images"
import * as destinationsApi from "@/lib/api/destinations"
import * as tourGuidesApi from "@/lib/api/tour-guides"
import type { ApiResponse } from "@/lib/api/client"
import { DateTimePicker } from "@/components/shared/date-time-picker"
import { ErrorDisplay } from "@/components/shared/error-display"
import { useToast } from "@/lib/stores/toast-store"
import { focusFirstError } from "@/lib/trips/focus-first-error"
import {
  createTripFormSchema,
  type TripFormInput,
  type TripFormValues,
} from "@/lib/trips/form-schema"
import type {
  Trip,
  Destination,
  Supplier,
  TourGuide,
  CreateTripRequest,
} from "@/lib/types"
import { resolveImageUrl } from "@/lib/image-utils"
import {
  ImageWithLogoFallback,
  ImgWithLogoFallback,
} from "@/components/shared/image-with-logo-fallback"

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

/** Arabic labels for the error summary — keep in sync with the schema's field names. */
const FIELD_LABELS: Record<string, string> = {
  name_ar: "اسم الرحلة (عربي)",
  name_en: "اسم الرحلة (English)",
  description_ar: "الوصف (عربي)",
  description_en: "الوصف (English)",
  price: "السعر للمصريين",
  foreigner_price: "السعر للأجانب",
  guide_price: "سعر المرشد",
  display_order: "ترتيب العرض",
  currency: "العملة",
  cancelation_policy_ar: "سياسة الإلغاء (عربي)",
  cancelation_policy_en: "سياسة الإلغاء (English)",
  map_url: "رابط الموقع على الخريطة",
  duration: "المدة",
  max_guests: "عدد الاشخاص الأقصى",
  supplier_id: "المورد",
  tour_guide_id: "المرشد",
  from: "من تاريخ",
  to: "إلى تاريخ",
  destination_ids: "الوجهات",
}

const EMPTY_FORM_VALUES: TripFormInput = {
  name_ar: "",
  name_en: "",
  description_ar: "",
  description_en: "",
  destination_ids: [],
  price: "",
  foreigner_price: "",
  guide_mandatory: false,
  guide_price: "",
  display_order: "0",
  currency: "EGP",
  refundable: true,
  cancelation_policy_ar: "",
  cancelation_policy_en: "",
  itinerary_ar: "",
  itinerary_en: "",
  availability_ar: "",
  availability_en: "",
  meeting_point_ar: "",
  meeting_point_en: "",
  map_url: "",
  hide_default_faqs: false,
  faqs: [],
  duration: "1",
  max_guests: "",
  supplier_id: "",
  is_tour: true,
  tour_guide_id: "",
  from: undefined,
  to: undefined,
}

/** Normalizes a possibly-unresolved `{ar, en}` localized field (or legacy plain string) to a safe pair. */
function asLocalizedPair(value: unknown): { ar: string; en: string } {
  if (typeof value === "string") return { ar: value, en: "" }
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const v = value as { ar?: string; en?: string }
    return { ar: v.ar || "", en: v.en || "" }
  }
  return { ar: "", en: "" }
}

/** Maps an existing `Trip` (API shape) onto the form's flat, string-based input shape. */
function mapTripToFormValues(tripData: Trip): TripFormInput {
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
  const tripItinerary = asLocalizedPair(tripData.itinerary)
  const tripAvailability = asLocalizedPair(tripData.availability)
  const tripMeetingPoint = asLocalizedPair(tripData.meeting_point)
  const tripFaqs = Array.isArray(tripData.faqs)
    ? tripData.faqs.map((f) => {
        const q = asLocalizedPair(f.q)
        const a = asLocalizedPair(f.a)
        return { q_ar: q.ar, q_en: q.en, a_ar: a.ar, a_en: a.en }
      })
    : []

  return {
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
    itinerary_ar: tripItinerary.ar,
    itinerary_en: tripItinerary.en,
    availability_ar: tripAvailability.ar,
    availability_en: tripAvailability.en,
    meeting_point_ar: tripMeetingPoint.ar,
    meeting_point_en: tripMeetingPoint.en,
    map_url: tripData.map_url || "",
    hide_default_faqs: tripData.hide_default_faqs ?? false,
    faqs: tripFaqs,
    duration: (tripData.duration ?? 1).toString(),
    max_guests: tripData.max_guests.toString(),
    supplier_id: tripData.supplier_id?.toString() || "",
    is_tour: tripData.is_tour ?? false,
    tour_guide_id: tripData.tour_guide_id?.toString() || "",
    from: tripData.from ? new Date(tripData.from) : undefined,
    to: tripData.to ? new Date(tripData.to) : undefined,
  }
}

/** Extracts existing image URLs from the various shapes the API has returned over time. */
function extractImageUrls(tripData: Trip): string[] {
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
    imageUrls.push(...Object.values(tripData.images as Record<string, string>))
  }
  return imageUrls
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
  const { addToast } = useToast()

  const getSupplierName = (supplier: Supplier) =>
    typeof supplier.name === "string"
      ? supplier.name
      : supplier.name.ar || supplier.name.en || "Unknown Supplier"

  const form = useForm<TripFormInput, unknown, TripFormValues>({
    // The schema types numeric fields as their coerced (number) output; the
    // inputs here write strings so an emptied field can show a placeholder
    // instead of "0". zodResolver only models a schema's single input/output
    // pair, so bridge that gap with a cast — zod still coerces the raw string
    // values at parse time regardless of what TypeScript believes here.
    resolver: zodResolver(
      createTripFormSchema({ mode, requireSupplier: showSupplierField }),
    ) as unknown as Resolver<TripFormInput, unknown, TripFormValues>,
    defaultValues:
      mode === "edit" && initialData
        ? mapTripToFormValues(initialData)
        : EMPTY_FORM_VALUES,
    mode: "onBlur",
    reValidateMode: "onChange",
  })

  const {
    fields: faqFields,
    append: appendFaq,
    remove: removeFaq,
  } = useFieldArray({ control: form.control, name: "faqs" })

  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>(
    mode === "edit" && initialData ? extractImageUrls(initialData) : [],
  )
  const [destinations, setDestinations] = useState<Destination[]>([])
  const [tourGuides, setTourGuides] = useState<TourGuide[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingDestinations, setIsLoadingDestinations] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (mode === "edit" && initialData) {
      form.reset(mapTripToFormValues(initialData))
      setExistingImageUrls(extractImageUrls(initialData))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, initialData])

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

  const onInvalid = useCallback(
    (errors: Record<string, unknown>) => {
      addToast("يرجى تصحيح الحقول المميزة بالأحمر", "error")
      focusFirstError(Object.keys(errors))
    },
    [addToast],
  )

  const onValid = async (values: TripFormValues) => {
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
          throw new Error(`خطأ في تحميل الصورة رقم ${i + 1}: ${uploadErr}`)
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

      // Guaranteed defined: the schema's superRefine rejects a missing `from`
      // before react-hook-form ever calls onValid.
      const from = values.from as Date

      const payload: CreateTripRequest = {
        name: { ar: values.name_ar, en: values.name_en },
        description: { ar: values.description_ar, en: values.description_en },
        destination: values.destination_ids.length > 0,
        location: false,
        is_tour: values.is_tour,
        price: values.price,
        foreigner_price: values.foreigner_price,
        guide_mandatory: values.guide_mandatory,
        guide_price: values.guide_price,
        display_order: values.display_order,
        currency: values.currency,
        refundable: values.refundable,
        cancelation_policy: {
          ar: values.cancelation_policy_ar,
          en: values.cancelation_policy_en,
        },
        itinerary: { ar: values.itinerary_ar, en: values.itinerary_en },
        availability: { ar: values.availability_ar, en: values.availability_en },
        meeting_point: { ar: values.meeting_point_ar, en: values.meeting_point_en },
        map_url: values.map_url,
        hide_default_faqs: values.hide_default_faqs,
        faqs: values.faqs.map((f) => ({
          q: { ar: f.q_ar, en: f.q_en },
          a: { ar: f.a_ar, en: f.a_en },
        })),
        from: from.toISOString(),
        to: values.to ? values.to.toISOString() : undefined,
        duration: values.duration,
        max_guests: values.max_guests,
        images: allImageUrls,
        destination_ids: values.destination_ids,
      }

      if (values.tour_guide_id) {
        payload.tour_guide_id = values.tour_guide_id
      }

      if (showSupplierField && values.supplier_id) {
        payload.supplier_id = values.supplier_id
      }

      const result: ApiResponse<unknown> =
        mode === "create"
          ? await tripsApi.createTrip(payload)
          : initialData
            ? await tripsApi.updateTrip(initialData.id, payload)
            : { data: null, error: "لا يمكن تحديث رحلة غير موجودة" }

      if (result.error) {
        if (result.fields) {
          Object.entries(result.fields).forEach(([key, message]) => {
            form.setError(key as keyof TripFormInput, {
              type: "server",
              message,
            })
          })
          focusFirstError(Object.keys(result.fields))
        }
        throw new Error(result.error)
      }

      onSuccess()
    } catch (err) {
      const message = err instanceof Error ? err.message : "حدث خطأ غير متوقع"
      setError(message)
      addToast(message, "error")
      requestAnimationFrame(() => {
        document
          .getElementById("trip-form-error-banner")
          ?.scrollIntoView({ behavior: "smooth", block: "center" })
      })
    } finally {
      setIsLoading(false)
    }
  }

  const fieldErrors = form.formState.errors

  return (
    <Card className="p-0!">
      <CardContent className="p-6">
        {error && (
          <div id="trip-form-error-banner">
            <ErrorDisplay
              error={error}
              onRetry={() => setError(null)}
              showRetry={false}
            />
          </div>
        )}

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onValid, onInvalid)}
            className="space-y-8"
            noValidate
          >
            {/* Supplier Assignment (admin only) */}
            {showSupplierField && suppliers.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-duck-navy border-b pb-2 flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  تعيين المورد
                </h2>
                <FormField
                  control={form.control}
                  name="supplier_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>المورد</FormLabel>
                      <Select
                        dir="rtl"
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger name={field.name}>
                            <SelectValue placeholder="اختر المورد" />
                          </SelectTrigger>
                        </FormControl>
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
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Type Toggle */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-duck-navy border-b pb-2 flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                نوع العرض
              </h2>
              <FormField
                control={form.control}
                name="is_tour"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center gap-3">
                      <FormControl>
                        <Checkbox
                          id="is_tour"
                          name={field.name}
                          checked={field.value}
                          onCheckedChange={(checked) =>
                            field.onChange(checked === true)
                          }
                        />
                      </FormControl>
                      <Label
                        htmlFor="is_tour"
                        className="cursor-pointer font-normal"
                      >
                        جولة سياحية (Tour)
                      </Label>
                    </div>
                  </FormItem>
                )}
              />
              <p className="text-xs text-text-muted">
                {form.watch("is_tour")
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
                  <FormField
                    control={form.control}
                    name="name_ar"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>اسم الرحلة (عربي)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="مثال: جولة الكاياك على النيل"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="name_en"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>اسم الرحلة (English)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Example: Kayak Tour on the Nile"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="description_ar"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>الوصف (عربي)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="وصف تفصيلي للرحلة..."
                            rows={3}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description_en"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>الوصف (English)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Detailed description of the trip..."
                            rows={3}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Destinations */}
                <FormField
                  control={form.control}
                  name="destination_ids"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>اختر الوجهات (اختياري)</FormLabel>
                      {isLoadingDestinations ? (
                        <p className="text-sm text-text-muted">
                          جاري التحميل...
                        </p>
                      ) : destinations.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {destinations.map((dest) => (
                            <div
                              key={dest.id}
                              className="flex items-center gap-2"
                            >
                              <input
                                type="checkbox"
                                id={`dest-${dest.id}`}
                                checked={field.value.includes(dest.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    field.onChange([...field.value, dest.id])
                                  } else {
                                    field.onChange(
                                      field.value.filter(
                                        (id) => id !== dest.id,
                                      ),
                                    )
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
                        <p className="text-sm text-text-muted">
                          لا توجد وجهات متاحة
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Tour Guide */}
                <FormField
                  control={form.control}
                  name="tour_guide_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>المرشد (اختياري)</FormLabel>
                      <Select
                        dir="rtl"
                        value={field.value || "none"}
                        onValueChange={(value) =>
                          field.onChange(value === "none" ? "" : value)
                        }
                      >
                        <FormControl>
                          <SelectTrigger name={field.name}>
                            <SelectValue placeholder="اختر المرشد" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">بدون مرشد</SelectItem>
                          {tourGuides.map((guide) => (
                            <SelectItem key={guide.ID} value={String(guide.ID)}>
                              {guide.name} — {guide.price} ج.م
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>السعر للمصريين</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="180"
                            {...field}
                          />
                        </FormControl>
                        {form.watch("is_tour") && (
                          <p className="text-xs text-duck-cyan">
                            السعر لكل ضيف في الساعة
                          </p>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="foreigner_price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>السعر للأجانب</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="250"
                            {...field}
                          />
                        </FormControl>
                        {form.watch("is_tour") && (
                          <p className="text-xs text-duck-cyan">
                            السعر لكل ضيف في الساعة
                          </p>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="currency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>العملة</FormLabel>
                        <Select
                          dir="rtl"
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger name={field.name}>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {currencies.map((currency) => (
                              <SelectItem
                                key={currency.value}
                                value={currency.value}
                              >
                                {currency.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="refundable"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center gap-2">
                        <FormControl>
                          <Checkbox
                            id="refundable"
                            name={field.name}
                            checked={field.value}
                            onCheckedChange={(checked) =>
                              field.onChange(checked === true)
                            }
                          />
                        </FormControl>
                        <Label
                          htmlFor="refundable"
                          className="cursor-pointer font-normal"
                        >
                          قابل للاسترداد
                        </Label>
                      </div>
                    </FormItem>
                  )}
                />

                <div className="grid md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="cancelation_policy_ar"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>سياسة الإلغاء (عربي)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="مثال: يمكن الإلغاء قبل 24 ساعة من موعد الرحلة"
                            rows={3}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="cancelation_policy_en"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>سياسة الإلغاء (English)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Example: Cancellation allowed 24 hours before trip"
                            rows={3}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>

            {/* Trip Page Content */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-duck-navy border-b pb-2 flex items-center gap-2">
                <Info className="w-5 h-5" />
                محتوى صفحة الرحلة
              </h2>
              <div className="grid gap-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="itinerary_ar"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>خط سير الرحلة (عربي)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder={"مثال:\n* التجمع عند الميناء\n* التجديف حتى الجزيرة"}
                            rows={4}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="itinerary_en"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>خط سير الرحلة (English)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder={"Example:\n* Meet at the harbor\n* Kayak to the island"}
                            rows={4}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="availability_ar"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>المواعيد المتاحة (عربي)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder={"مثال:\n* يوميًا من 8 صباحًا حتى 5 مساءً\n* عدا أيام الجمعة"}
                            rows={4}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="availability_en"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>المواعيد المتاحة (English)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder={"Example:\n* Daily from 8am to 5pm\n* Except Fridays"}
                            rows={4}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="meeting_point_ar"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>مكان اللقاء (عربي)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="مثال: جزيرة أسوان، بجوار مرسى القوارب"
                            rows={3}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="meeting_point_en"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>مكان اللقاء (English)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Example: Aswan Island, next to the boat dock"
                            rows={3}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="map_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>رابط الموقع على الخريطة (اختياري)</FormLabel>
                      <FormControl>
                        <Input
                          type="url"
                          placeholder="https://maps.google.com/..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* FAQ Section */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-duck-navy border-b pb-2 flex items-center gap-2">
                <HelpCircle className="w-5 h-5" />
                الأسئلة الشائعة
              </h2>
              <div className="grid gap-4">
                <FormField
                  control={form.control}
                  name="hide_default_faqs"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center gap-2">
                        <FormControl>
                          <Checkbox
                            id="hide_default_faqs"
                            name={field.name}
                            checked={field.value}
                            onCheckedChange={(checked) =>
                              field.onChange(checked === true)
                            }
                          />
                        </FormControl>
                        <Label
                          htmlFor="hide_default_faqs"
                          className="cursor-pointer font-normal"
                        >
                          إخفاء الأسئلة الافتراضية (السعر، المدة، عدد الأشخاص...)
                        </Label>
                      </div>
                    </FormItem>
                  )}
                />

                {faqFields.map((faqField, index) => (
                  <div
                    key={faqField.id}
                    className="rounded-lg border p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-text-muted">
                        سؤال {index + 1}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFaq(index)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name={`faqs.${index}.q_ar`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>السؤال (عربي)</FormLabel>
                            <FormControl>
                              <Input placeholder="مثال: هل الرحلة مناسبة للأطفال؟" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`faqs.${index}.q_en`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>السؤال (English)</FormLabel>
                            <FormControl>
                              <Input placeholder="Example: Is the trip suitable for kids?" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name={`faqs.${index}.a_ar`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>الإجابة (عربي)</FormLabel>
                            <FormControl>
                              <Textarea rows={2} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`faqs.${index}.a_en`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>الإجابة (English)</FormLabel>
                            <FormControl>
                              <Textarea rows={2} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    appendFaq({ q_ar: "", q_en: "", a_ar: "", a_en: "" })
                  }
                  className="w-fit"
                >
                  <Plus className="w-4 h-4 me-1" />
                  إضافة سؤال
                </Button>
              </div>
            </div>

            {/* Guide Section */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-duck-navy border-b pb-2 flex items-center gap-2">
                <Users className="w-5 h-5" />
                المرشد
              </h2>
              <div className="grid gap-4">
                <FormField
                  control={form.control}
                  name="guide_mandatory"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center gap-2">
                        <FormControl>
                          <Checkbox
                            id="guide_mandatory"
                            name={field.name}
                            checked={field.value}
                            onCheckedChange={(checked) =>
                              field.onChange(checked === true)
                            }
                          />
                        </FormControl>
                        <Label
                          htmlFor="guide_mandatory"
                          className="cursor-pointer font-normal"
                        >
                          المرشد إلزامي لهذه الرحلة
                        </Label>
                      </div>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="guide_price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>سعر المرشد (اختياري)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0"
                          {...field}
                        />
                      </FormControl>
                      <p className="text-xs text-text-muted">
                        {form.watch("guide_mandatory")
                          ? "يُضاف هذا السعر إلى إجمالي كل حجز."
                          : "يُضاف هذا السعر فقط عند اختيار العميل لمرشد أثناء الحجز."}
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
                  <FormField
                    control={form.control}
                    name="from"
                    render={({ field, fieldState }) => (
                      <FormItem>
                        <FormLabel>من تاريخ</FormLabel>
                        <FormControl>
                          <DateTimePicker
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="تاريخ البدء"
                            required
                            id="from"
                            aria-invalid={!!fieldState.error}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="to"
                    render={({ field, fieldState }) => (
                      <FormItem>
                        <FormLabel>إلى تاريخ</FormLabel>
                        <FormControl>
                          <DateTimePicker
                            value={field.value ?? undefined}
                            onChange={field.onChange}
                            placeholder="تاريخ الانتهاء"
                            id="to"
                            aria-invalid={!!fieldState.error}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="duration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {form.watch("is_tour")
                            ? "المدة الافتراضية (ساعات)"
                            : "المدة (ساعات)"}
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={form.watch("is_tour") ? 0 : 1}
                            placeholder={form.watch("is_tour") ? "0" : "1"}
                            {...field}
                          />
                        </FormControl>
                        {form.watch("is_tour") && (
                          <p className="text-xs text-text-muted">
                            العميل يحدد عدد الساعات عند الحجز
                          </p>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="max_guests"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>عدد الاشخاص الأقصى</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="10" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="display_order"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ترتيب العرض</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            placeholder="0"
                            {...field}
                          />
                        </FormControl>
                        <p className="text-xs text-text-muted">
                          الأقل يظهر أولاً في قائمة الرحلات.
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
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
                          <ImageWithLogoFallback
                            fill
                            sizes="(max-width: 768px) 33vw, 200px"
                            src={resolveImageUrl(url) ?? url}
                            alt={`صورة الرحلة ${index + 1}`}
                            className="object-cover"
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
                            <ImgWithLogoFallback
                              src={URL.createObjectURL(file)}
                              alt={`معاينة ${index + 1}`}
                              className="absolute inset-0 w-full h-full object-cover"
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

            {/* Validation error summary — appears where the user's eyes already are */}
            {Object.keys(fieldErrors).length > 0 && (
              <div
                role="alert"
                aria-live="polite"
                className="border border-red-200 bg-red-50 rounded-lg p-4"
              >
                <p className="font-semibold text-red-900 mb-2">
                  يوجد أخطاء في الحقول التالية:
                </p>
                <ul className="space-y-1">
                  {Object.entries(fieldErrors).map(([key, err]) => (
                    <li key={key}>
                      <button
                        type="button"
                        onClick={() => focusFirstError([key])}
                        className="text-red-700 text-sm underline hover:text-red-900 text-start"
                      >
                        {FIELD_LABELS[key] ?? key}
                        {err?.message ? `: ${String(err.message)}` : ""}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Submit Buttons */}
            <div className="sticky bottom-0 z-20 -mx-4 flex gap-3 border-t bg-background/95 px-4 py-3 sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0">
              <Button
                type="submit"
                disabled={isLoading}
                className="h-11! flex-1 bg-duck-yellow font-bold text-duck-navy hover:bg-duck-yellow-hover sm:flex-none"
              >
                {isLoading
                  ? "جاري الحفظ..."
                  : mode === "edit"
                    ? "حفظ التغييرات"
                    : form.watch("is_tour")
                      ? "حفظ الجولة"
                      : "حفظ الرحلة"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-11!"
                onClick={onCancel}
                disabled={isLoading}
              >
                إلغاء
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
