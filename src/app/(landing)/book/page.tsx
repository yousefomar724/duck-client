/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { Suspense, useState, useEffect, useMemo, useRef } from "react"
import { useSearchParams } from "next/navigation"
import { useForm, useWatch } from "react-hook-form"
import { z } from "zod/v3"
import { zodResolver } from "@hookform/resolvers/zod"
import { Check, ChevronLeft, ChevronDownIcon, User } from "lucide-react"
import { format, formatISO, startOfDay } from "date-fns"
import { arSA, enUS } from "date-fns/locale"
import {
  arSA as arSADayPicker,
  enUS as enUSDayPicker,
} from "react-day-picker/locale"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { getTrips } from "@/lib/api/trips"
import * as bookingsApi from "@/lib/api/bookings"
import {
  type SuccessCache,
  SUCCESS_CACHE_KEY,
} from "@/lib/booking-success-cache"
import type { ResourceType, Trip } from "@/lib/types"
import { getTripImage, resolveImageUrl } from "@/lib/image-utils"
import { formatCurrency } from "@/lib/constants"
import { useAuth } from "@/lib/stores/auth-store"
import { useToast } from "@/lib/stores/toast-store"
import Footer from "@/components/landing/Footer"
import { useTranslations, useLocale } from "next-intl"
import { TripListingPrices } from "@/components/shared/trip-listing-prices"
import { ImageWithLogoFallback } from "@/components/shared/image-with-logo-fallback"

/** Local Egyptian mobile: 0 + (10|11|12|15) + 8 digits */
const EGYPT_MOBILE_LOCAL_REGEX = /^0(10|11|12|15)\d{8}$/

function parseStoredPhoneToLocal(p: string): string | null {
  const d = p.replace(/\D/g, "")
  if (d.startsWith("20") && d.length === 12) {
    const rest = d.slice(2)
    if (/^1[0125]\d{8}$/.test(rest)) return `0${rest}`
  }
  if (EGYPT_MOBILE_LOCAL_REGEX.test(d)) return d
  if (d.length === 10 && /^1[0125]/.test(d)) return `0${d}`
  return null
}

function localEgyptMobileToE164(localDigits: string): string {
  const d = localDigits.replace(/\D/g, "")
  return `+20${d.slice(1)}`
}

const RESOURCE_TYPES = [
  "kayak",
  "water_cycle",
  "sup",
] as const satisfies readonly ResourceType[]

type GuestMix = "local" | "foreigner" | "mixed"
type HearAboutUs =
  | "instagram"
  | "facebook"
  | "tiktok"
  | "google"
  | "friend"
  | "other"

const HEAR_ABOUT_OPTIONS: readonly HearAboutUs[] = [
  "instagram",
  "facebook",
  "tiktok",
  "google",
  "friend",
  "other",
] as const

type ContactFormValues = {
  full_name: string
  phone: string
  booking_date: Date
  resource_type: ResourceType
  guests: number
  guest_mix: GuestMix
  local_guests: number
  foreigner_guests: number
  duration: number
  wants_guide: boolean
  hear_about_us: HearAboutUs | ""
  referral_text: string
}

function getLocalizedText(value: any, locale: string, fallback = ""): string {
  return typeof value === "string"
    ? value
    : value?.[locale] || value?.ar || value?.en || fallback
}

function BookPageContent() {
  const searchParams = useSearchParams()
  const tripParam = searchParams.get("trip")
  const { user } = useAuth()
  const { addToast } = useToast()
  const t = useTranslations("book")
  const tv = useTranslations("validation")
  const locale = useLocale()

  const [step, setStep] = useState(1)
  const [trips, setTrips] = useState<Trip[]>([])
  const [tripsLoading, setTripsLoading] = useState(true)
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [bookingDateOpen, setBookingDateOpen] = useState(false)
  const [guestsMode, setGuestsMode] = useState<"preset" | "custom">("preset")

  // --- NEW: useRef to store previous trip id ---
  const prevTripIdRef = useRef<number | null>(null)
  /** Skip step 1 once when loading /book?trip=... so user lands on the form; reset on new mount. */
  const didAutoAdvanceRef = useRef(false)

  const resourceLabels: Record<ResourceType, string> = {
    kayak: t("resourceKayak"),
    water_cycle: t("resourceWaterCycle"),
    sup: t("resourceSup"),
  }
  const durationLabels: Record<number, string> = {
    1: t("duration1h"),
    2: t("duration2h"),
    3: t("duration3h"),
    4: t("duration4h"),
    5: t("duration5h"),
    6: t("duration6h"),
  }

  const contactSchema = useMemo(
    () =>
      z.object({
        full_name: z.string().min(2, tv("nameMin")),
        phone: z
          .string()
          .min(1, tv("phoneRequired"))
          .regex(EGYPT_MOBILE_LOCAL_REGEX, tv("phoneMobileEgypt")),
        booking_date: z.date({
          required_error: tv("dateRequired"),
          invalid_type_error: tv("dateInvalid"),
        }),
        resource_type: z.enum(RESOURCE_TYPES),
        guests: z.coerce
          .number({ invalid_type_error: tv("numberInvalid") })
          .int()
          .min(1, tv("minOneGuest")),
        guest_mix: z.enum(["local", "foreigner", "mixed"]),
        local_guests: z.coerce
          .number({ invalid_type_error: tv("numberInvalid") })
          .int()
          .min(0),
        foreigner_guests: z.coerce
          .number({ invalid_type_error: tv("numberInvalid") })
          .int()
          .min(0),
        duration: z.coerce
          .number({ invalid_type_error: tv("numberInvalid") })
          .int()
          .min(1, tv("minOne")),
        wants_guide: z.boolean(),
        hear_about_us: z.enum([
          "",
          "instagram",
          "facebook",
          "tiktok",
          "google",
          "friend",
          "other",
        ]),
        referral_text: z.string(),
      }),
    [tv],
  )

  const formSchema = useMemo(
    () =>
      contactSchema.superRefine((data, ctx) => {
        if (selectedTrip && data.guests > selectedTrip.max_guests) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: t("maxGuestsError", { max: selectedTrip.max_guests }),
            path: ["guests"],
          })
        }
        if (data.guest_mix === "mixed") {
          const sum = data.local_guests + data.foreigner_guests
          if (sum !== data.guests) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: t("guestMixSumError", { total: data.guests }),
              path: ["local_guests"],
            })
          }
          if (data.local_guests < 1 && data.foreigner_guests < 1) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: tv("minOneGuest"),
              path: ["local_guests"],
            })
          }
        }
        if (
          (data.hear_about_us === "friend" || data.hear_about_us === "other") &&
          data.referral_text.trim().length === 0
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: tv("referralRequired"),
            path: ["referral_text"],
          })
        }
      }),
    [selectedTrip, contactSchema, t, tv],
  )

  // Fetch trips
  useEffect(() => {
    let cancelled = false
    async function fetchTrips() {
      setTripsLoading(true)
      const { data, error } = await getTrips(locale)
      if (cancelled) return
      setTripsLoading(false)
      if (error || !data) return
      setTrips(data)
      if (tripParam && data.length > 0) {
        const id = parseInt(tripParam, 10)
        const trip = data.find((t) => t.id === id)
        if (trip) {
          setSelectedTrip(trip)
          if (!didAutoAdvanceRef.current) {
            didAutoAdvanceRef.current = true
            setStep(2)
          }
        }
      }
    }
    fetchTrips()
    return () => {
      cancelled = true
    }
  }, [tripParam, locale])

  const defaultTomorrow = useMemo(() => {
    const t = new Date()
    t.setDate(t.getDate() + 1)
    return startOfDay(t)
  }, [])

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      full_name: "",
      phone: "",
      booking_date: defaultTomorrow,
      resource_type: "kayak",
      guests: 1,
      guest_mix: "local",
      local_guests: 1,
      foreigner_guests: 0,
      duration: 1,
      wants_guide: false,
      hear_about_us: "",
      referral_text: "",
    },
  })

  useEffect(() => {
    if (!selectedTrip) return
    // Guide is only opt-in when the trip has an optional paid guide (non-mandatory, price > 0)
    // OR for legacy tours without a guide_price. In all other cases we reset to false.
    const hasOptionalGuide =
      !selectedTrip.guide_mandatory &&
      ((selectedTrip.guide_price ?? 0) > 0 ||
        (selectedTrip.is_tour === true &&
          (selectedTrip.guide_price ?? 0) === 0))
    if (!hasOptionalGuide) {
      form.setValue("wants_guide", false)
    }
  }, [
    selectedTrip?.guide_mandatory,
    selectedTrip?.guide_price,
    selectedTrip?.is_tour,
    selectedTrip,
    form,
  ])

  // --- FIX: Avoid calling setState synchronously in effect ---
  // Move logic for guestsMode ("preset"/"custom") determination and guest form value capping
  // out of effect and derive it from selectedTrip via state and useMemo, updating state only when necessary

  // Determine what guestsMode should be for new selectedTrip
  useEffect(() => {
    if (!selectedTrip) return

    // Guests mode logic: only update if changed to avoid cascade renders
    const maxG = selectedTrip.max_guests
    // Only update if necessary, to avoid unnecessary renders
    setGuestsMode((prevMode) => {
      if (maxG <= 5) {
        // Only switch to "preset" if not already
        return prevMode !== "preset" ? "preset" : prevMode
      } else {
        // Do not force mode for >5 guests, the component logic handles switching to "custom" as needed
        return prevMode
      }
    })

    // Cap guests value if it exceeds max_guests
    const currentGuests = form.getValues("guests")
    if (currentGuests > maxG) form.setValue("guests", maxG)

    // Update previous trip id
    prevTripIdRef.current = selectedTrip.id
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTrip?.id, form])

  const watchedBookingDate = useWatch({
    control: form.control,
    name: "booking_date",
  })
  const watchedResourceType = useWatch({
    control: form.control,
    name: "resource_type",
  })
  const watchedGuests = useWatch({ control: form.control, name: "guests" })
  const watchedGuestMix = useWatch({
    control: form.control,
    name: "guest_mix",
  })
  const watchedLocalGuests = useWatch({
    control: form.control,
    name: "local_guests",
  })
  const watchedForeignerGuests = useWatch({
    control: form.control,
    name: "foreigner_guests",
  })
  const watchedDuration = useWatch({ control: form.control, name: "duration" })
  const watchedFullName = useWatch({ control: form.control, name: "full_name" })
  const watchedPhone = useWatch({ control: form.control, name: "phone" })
  const watchedWantsGuide = useWatch({
    control: form.control,
    name: "wants_guide",
  })
  const watchedHearAboutUs = useWatch({
    control: form.control,
    name: "hear_about_us",
  })
  const watchedReferralText = useWatch({
    control: form.control,
    name: "referral_text",
  })

  // When guest_mix changes, keep local/foreigner in sync with total.
  useEffect(() => {
    if (watchedGuestMix === "local") {
      form.setValue("local_guests", Number(watchedGuests) || 0)
      form.setValue("foreigner_guests", 0)
    } else if (watchedGuestMix === "foreigner") {
      form.setValue("foreigner_guests", Number(watchedGuests) || 0)
      form.setValue("local_guests", 0)
    }
  }, [watchedGuestMix, watchedGuests, form])

  const handleUseMyData = () => {
    if (!user) return
    const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ")
    form.setValue("full_name", fullName)
    if (user.phone_number) {
      const local = parseStoredPhoneToLocal(user.phone_number)
      if (local) form.setValue("phone", local)
    }
  }

  const handleSubmit = form.handleSubmit(async (values) => {
    if (!selectedTrip) return
    const phoneNumber = localEgyptMobileToE164(values.phone)
    setSubmitLoading(true)
    const booking_date = formatISO(startOfDay(values.booking_date))

    let localGuests = 0
    let foreignerGuests = 0
    if (values.guest_mix === "local") {
      localGuests = values.guests
    } else if (values.guest_mix === "foreigner") {
      foreignerGuests = values.guests
    } else {
      localGuests = values.local_guests
      foreignerGuests = values.foreigner_guests
    }
    const totalGuests = localGuests + foreignerGuests

    const hasOptionalGuide =
      !selectedTrip.guide_mandatory &&
      ((selectedTrip.guide_price ?? 0) > 0 ||
        (selectedTrip.is_tour === true &&
          (selectedTrip.guide_price ?? 0) === 0))
    const needsReferral =
      values.hear_about_us === "friend" || values.hear_about_us === "other"

    const { data, error } = await bookingsApi.createBooking({
      trip_id: selectedTrip.id,
      full_name: values.full_name.trim(),
      phone_number: phoneNumber,
      booking_date,
      resource_type: values.resource_type,
      quantity: totalGuests,
      local_guests: localGuests,
      foreigner_guests: foreignerGuests,
      duration: values.duration,
      wants_guide: hasOptionalGuide ? values.wants_guide : false,
      hear_about_us: values.hear_about_us || "",
      referral_text: needsReferral ? values.referral_text.trim() : "",
    })
    setSubmitLoading(false)
    if (error) {
      const isConflict =
        error.toLowerCase().includes("availability") ||
        error.toLowerCase().includes("no availability") ||
        error.includes("409")
      addToast(isConflict ? t("noAvailability") : error, "error")
      return
    }
    if (data?.payment_url) {
      const b = data.booking
      const orderRef = b?.order_ref
      if (orderRef && b) {
        const policy = selectedTrip.cancelation_policy
        const cache: SuccessCache = {
          order_ref: orderRef,
          trip: {
            id: selectedTrip.id,
            name: selectedTrip.name,
            currency: selectedTrip.currency,
            refundable: selectedTrip.refundable,
            cancelation_policy:
              typeof policy === "object" && policy !== null
                ? (policy as { ar: string; en: string })
                : undefined,
            destinations: (selectedTrip.destinations ?? []).map((d) => ({
              id: d.id,
              name: d.name,
              lat: d.lat,
              lng: d.lng,
              image: d.image,
              operating_hours: d.operating_hours,
            })),
          },
          summary: {
            full_name: values.full_name.trim(),
            booking_date,
            quantity: b.quantity ?? totalGuests,
            local_guests: localGuests,
            foreigner_guests: foreignerGuests,
            amount: b.amount ?? 0,
          },
        }
        try {
          sessionStorage.setItem(SUCCESS_CACHE_KEY, JSON.stringify(cache))
        } catch {
          /* storage full or disabled */
        }
      }
      // Navigate to payment gateway (full page redirect)
      window.location.assign(data.payment_url)
    }
  })

  return (
    <>
      {/* Content */}
      <section className="bg-duck-cyan/80 pt-24 md:pt-32 pb-20 px-4 md:px-10">
        <div className="max-w-3xl mx-auto">
          <div
            className="bg-white rounded-3xl shadow-lg p-8 md:p-10"
            dir={locale === "ar" ? "rtl" : "ltr"}
          >
            {/* Step indicator */}
            <div
              className="flex justify-center gap-2 sm:gap-3 mb-8 pb-8 border-b border-border/60"
              dir="ltr"
            >
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={`flex items-center gap-1 ${
                    step === s
                      ? "text-duck-cyan font-semibold"
                      : step > s
                        ? "text-duck-cyan/90"
                        : "text-text-muted"
                  }`}
                >
                  <span
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                      step === s
                        ? "bg-duck-cyan text-duck-navy"
                        : step > s
                          ? "bg-duck-cyan/15 text-duck-cyan"
                          : "bg-muted text-text-muted"
                    }`}
                  >
                    {step > s ? <Check className="w-4 h-4" /> : s}
                  </span>
                  {s < 3 && (
                    <span className="w-4 sm:w-6 h-0.5 bg-duck-cyan/20" />
                  )}
                </div>
              ))}
            </div>

            {/* Step 1: Trip selection */}
            {step === 1 && (
              <div className="space-y-8">
                <h2 className="text-text-dark text-2xl font-bold">
                  {t("step1Title")}
                </h2>
                <p className="rounded-xl border border-amber-200/80 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                  {t("priceEgyptiansOnlyNote")}
                </p>
                {tripsLoading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="h-64 rounded-2xl bg-gray-100 animate-pulse"
                      />
                    ))}
                  </div>
                ) : trips.length === 0 ? (
                  <p className="text-text-body text-center py-12">
                    {t("noTrips")}
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-2 max-h-[500px] overflow-y-auto scrollbar-duck">
                    {trips.map((trip) => {
                      const name = getLocalizedText(
                        trip.name,
                        locale,
                        t("defaultTripName"),
                      )
                      const description = getLocalizedText(
                        trip.description,
                        locale,
                        "",
                      )
                      const rawImage = getTripImage(trip.images)
                      const imageSrc = resolveImageUrl(rawImage)
                      const isSelected = selectedTrip?.id === trip.id
                      return (
                        <button
                          key={trip.id}
                          type="button"
                          onClick={() => setSelectedTrip(trip)}
                          className={`text-right rounded-2xl overflow-hidden shadow-[0_4px_30px_rgba(0,0,0,0.06)] h-fit bg-white flex flex-col transition-all ${
                            isSelected
                              ? "ring-2 ring-duck-cyan ring-offset-2"
                              : "hover:shadow-lg"
                          }`}
                        >
                          <div className="relative h-40 w-full overflow-hidden">
                            <ImageWithLogoFallback
                              src={imageSrc}
                              alt={name}
                              fill
                              sizes="(max-width: 640px) 100vw, 400px"
                              className="object-cover"
                              fallbackClassName="object-contain bg-gray-100 p-6"
                            />
                            {isSelected && (
                              <div className="absolute top-3 end-3 w-8 h-8 rounded-full bg-duck-cyan flex items-center justify-center">
                                <Check className="w-4 h-4 text-duck-navy" />
                              </div>
                            )}
                            <span
                              className={`absolute top-3 start-3 text-xs font-medium px-2 py-0.5 rounded-full ${
                                trip.is_tour
                                  ? "bg-purple-100 text-purple-700"
                                  : "bg-blue-100 text-blue-700"
                              }`}
                            >
                              {trip.is_tour ? t("tour") : t("trip")}
                            </span>
                          </div>
                          <div className="p-4">
                            <h3 className="text-text-dark font-bold text-lg mb-1">
                              {name}
                            </h3>
                            {description ? (
                              <p className="text-text-body text-sm leading-relaxed line-clamp-3 mb-2">
                                {description}
                              </p>
                            ) : null}
                            <div className="text-duck-cyan">
                              <TripListingPrices
                                trip={trip}
                                egyptiansOfferLabel={t(
                                  "egyptiansSpecialOffer",
                                  {
                                    price: formatCurrency(
                                      trip.price,
                                      trip.currency,
                                    ),
                                  },
                                )}
                                perHourSuffix={
                                  trip.is_tour ? t("perHour") : undefined
                                }
                              />
                            </div>
                            <p className="text-text-muted text-sm mt-1">
                              {trip.duration ?? 1}{" "}
                              {(trip.duration ?? 1) === 1
                                ? t("hour")
                                : t("hours")}
                            </p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
                <Button
                  type="button"
                  disabled={!selectedTrip}
                  onClick={() => setStep(2)}
                  className="bg-duck-yellow text-duck-navy rounded-full px-10 py-3 font-medium hover:bg-duck-yellow-hover w-full sm:w-auto"
                >
                  {t("next")}
                </Button>
              </div>
            )}

            {/* Step 2: Contact info */}
            {step === 2 && (
              <Form {...form}>
                <form className="space-y-8">
                  <h2 className="text-text-dark text-2xl font-bold">
                    {t("step2Title")}
                  </h2>
                  {user && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleUseMyData}
                      className="rounded-full gap-2 border-duck-cyan text-duck-cyan hover:bg-duck-cyan/10"
                    >
                      <User className="w-4 h-4" />
                      {t("useMyData")}
                    </Button>
                  )}
                  <FormField
                    control={form.control}
                    name="full_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-text-dark font-medium">
                          {t("fullName")}{" "}
                          <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder={t("fullNamePlaceholder")}
                            className="rounded-lg border-black/20 focus-visible:ring-duck-cyan focus-visible:border-duck-cyan"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-text-dark font-medium">
                          {t("phone")} <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="tel"
                            inputMode="numeric"
                            autoComplete="tel"
                            placeholder={t("phonePlaceholder")}
                            dir="ltr"
                            maxLength={11}
                            className="rounded-lg border-black/20 focus-visible:ring-duck-cyan focus-visible:border-duck-cyan"
                            {...field}
                            onChange={(e) => {
                              const v = e.target.value
                                .replace(/\D/g, "")
                                .slice(0, 11)
                              field.onChange(v)
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="booking_date"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel className="text-text-dark font-medium">
                          {t("bookingDate")}{" "}
                          <span className="text-red-500">*</span>
                        </FormLabel>
                        <Popover
                          open={bookingDateOpen}
                          onOpenChange={setBookingDateOpen}
                        >
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                type="button"
                                variant="outline"
                                className="w-full justify-between font-normal text-right"
                              >
                                {field.value ? (
                                  format(field.value, "PPP", {
                                    locale: locale === "ar" ? arSA : enUS,
                                  })
                                ) : (
                                  <span className="text-muted-foreground">
                                    {t("selectDate")}
                                  </span>
                                )}
                                <ChevronDownIcon className="ms-2 size-4 shrink-0 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent
                            className="w-auto overflow-hidden p-0"
                            align="start"
                            dir={locale === "ar" ? "rtl" : "ltr"}
                          >
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={(d) => {
                                field.onChange(d)
                                setBookingDateOpen(false)
                              }}
                              disabled={(date) =>
                                startOfDay(date) < startOfDay(new Date())
                              }
                              defaultMonth={field.value}
                              locale={
                                locale === "ar" ? arSADayPicker : enUSDayPicker
                              }
                              dir={locale === "ar" ? "rtl" : "ltr"}
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="resource_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-text-dark font-medium">
                          {t("resourceType")}{" "}
                          <span className="text-red-500">*</span>
                        </FormLabel>
                        <Select
                          dir={locale === "ar" ? "rtl" : "ltr"}
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="rounded-lg border-black/20 max-w-full!">
                              <SelectValue placeholder={t("selectType")} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {RESOURCE_TYPES.map((rt) => (
                              <SelectItem key={rt} value={rt}>
                                {resourceLabels[rt]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="guests"
                    render={({ field }) => {
                      const maxG = selectedTrip?.max_guests ?? 5
                      const presetMax = Math.min(5, maxG)
                      const guestOptions = Array.from(
                        { length: presetMax },
                        (_, i) => i + 1,
                      )
                      const showMoreOption = maxG > 5

                      return (
                        <FormItem>
                          <FormLabel className="text-text-dark font-medium">
                            {t("guests")}{" "}
                            <span className="text-red-500">*</span>
                          </FormLabel>
                          {guestsMode === "preset" ? (
                            <Select
                              dir={locale === "ar" ? "rtl" : "ltr"}
                              value={String(field.value)}
                              onValueChange={(val) => {
                                if (val === "more") {
                                  setGuestsMode("custom")
                                  field.onChange(6)
                                } else {
                                  field.onChange(Number(val))
                                }
                              }}
                            >
                              <FormControl>
                                <SelectTrigger className="rounded-lg border-black/20 max-w-full!">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {guestOptions.map((n) => (
                                  <SelectItem
                                    key={n}
                                    value={String(n)}
                                    className="py-3"
                                  >
                                    {n}
                                  </SelectItem>
                                ))}
                                {showMoreOption && (
                                  <SelectItem
                                    value="more"
                                    className="py-3 text-duck-cyan font-medium"
                                  >
                                    {t("guestsMore")}
                                  </SelectItem>
                                )}
                              </SelectContent>
                            </Select>
                          ) : (
                            <div className="flex items-center gap-3">
                              <FormControl>
                                <Input
                                  type="number"
                                  inputMode="numeric"
                                  min={6}
                                  max={maxG}
                                  placeholder={t("guestsCustomPlaceholder")}
                                  className="rounded-lg border-black/20 flex-1"
                                  value={field.value}
                                  onChange={(e) => {
                                    const v = e.target.value
                                    field.onChange(v === "" ? "" : Number(v))
                                  }}
                                />
                              </FormControl>
                              <button
                                type="button"
                                onClick={() => {
                                  setGuestsMode("preset")
                                  field.onChange(
                                    Math.min(field.value, presetMax),
                                  )
                                }}
                                className="text-sm text-duck-cyan whitespace-nowrap hover:underline"
                              >
                                {t("guestsBackToSelect")}
                              </button>
                            </div>
                          )}
                          <FormMessage />
                          {selectedTrip ? (
                            <p className="text-xs text-text-muted">
                              {t("maxGuests", { max: selectedTrip.max_guests })}
                            </p>
                          ) : null}
                        </FormItem>
                      )
                    }}
                  />

                  {/* Guest mix: locals / foreigners split */}
                  <FormField
                    control={form.control}
                    name="guest_mix"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-text-dark font-medium">
                          {t("guestsMixLabel")}{" "}
                          <span className="text-red-500">*</span>
                        </FormLabel>
                        <Select
                          dir={locale === "ar" ? "rtl" : "ltr"}
                          value={field.value}
                          onValueChange={(val) =>
                            field.onChange(val as GuestMix)
                          }
                        >
                          <FormControl>
                            <SelectTrigger className="rounded-lg border-black/20 max-w-full!">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="local">
                              {t("guestsMixLocal")}
                            </SelectItem>
                            <SelectItem value="foreigner">
                              {t("guestsMixForeigner")}
                            </SelectItem>
                            <SelectItem value="mixed">
                              {t("guestsMixMixed")}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {watchedGuestMix === "mixed" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="local_guests"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-text-dark font-medium">
                              {t("localGuestsLabel")}
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                inputMode="numeric"
                                min={0}
                                className="rounded-lg border-black/20"
                                value={field.value}
                                onChange={(e) => {
                                  const v = e.target.value
                                  field.onChange(v === "" ? 0 : Number(v))
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="foreigner_guests"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-text-dark font-medium">
                              {t("foreignerGuestsLabel")}
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                inputMode="numeric"
                                min={0}
                                className="rounded-lg border-black/20"
                                value={field.value}
                                onChange={(e) => {
                                  const v = e.target.value
                                  field.onChange(v === "" ? 0 : Number(v))
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <p className="text-xs text-text-muted sm:col-span-2">
                        {t("guestMixSumHint", {
                          total: Number(watchedGuests) || 0,
                          sum:
                            (Number(watchedLocalGuests) || 0) +
                            (Number(watchedForeignerGuests) || 0),
                        })}
                      </p>
                    </div>
                  )}

                  {selectedTrip?.is_tour && (
                    <FormField
                      control={form.control}
                      name="duration"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-text-dark font-medium">
                            {t("duration")}{" "}
                            <span className="text-red-500">*</span>
                          </FormLabel>
                          <Select
                            dir={locale === "ar" ? "rtl" : "ltr"}
                            value={String(field.value)}
                            onValueChange={(val) => field.onChange(Number(val))}
                          >
                            <FormControl>
                              <SelectTrigger className="rounded-lg border-black/20 max-w-full!">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {[1, 2, 3, 4, 5, 6].map((h) => (
                                <SelectItem
                                  key={h}
                                  value={String(h)}
                                  className="py-3"
                                >
                                  {durationLabels[h]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {selectedTrip?.guide_mandatory ? (
                    <div className="rounded-xl border border-duck-cyan/20 bg-duck-cyan/5 p-4 text-sm text-text-dark">
                      <p className="font-medium">
                        {t("guideMandatoryBanner", {
                          price: formatCurrency(
                            selectedTrip.guide_price ?? 0,
                            selectedTrip.currency,
                          ),
                        })}
                      </p>
                      <p className="text-text-muted mt-1">
                        {t("guideRecommendation")}
                      </p>
                    </div>
                  ) : (selectedTrip?.guide_price ?? 0) > 0 ||
                    selectedTrip?.is_tour ? (
                    <FormField
                      control={form.control}
                      name="wants_guide"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start gap-3 space-y-0 rounded-xl border border-duck-cyan/20 bg-duck-cyan/5 p-4">
                          <FormControl>
                            <Checkbox
                              id="wants_guide"
                              checked={field.value}
                              onCheckedChange={(c) =>
                                field.onChange(c === true)
                              }
                              className="mt-0.5"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel
                              htmlFor="wants_guide"
                              className="cursor-pointer font-medium text-text-dark"
                            >
                              {t("wantsGuide")}
                              {selectedTrip &&
                              (selectedTrip.guide_price ?? 0) > 0 ? (
                                <span className="text-duck-cyan ms-2">
                                  {t("guideOptionalFee", {
                                    price: formatCurrency(
                                      selectedTrip.guide_price ?? 0,
                                      selectedTrip.currency,
                                    ),
                                  })}
                                </span>
                              ) : null}
                            </FormLabel>
                            <p className="text-sm font-normal text-text-muted">
                              {t("guideRecommendation")}
                            </p>
                          </div>
                        </FormItem>
                      )}
                    />
                  ) : null}

                  {/* How did you hear about us */}
                  <FormField
                    control={form.control}
                    name="hear_about_us"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-text-dark font-medium">
                          {t("hearAboutUs")}{" "}
                          <span className="text-text-muted font-normal">
                            {t("hearAboutUsOptional")}
                          </span>
                        </FormLabel>
                        <Select
                          dir={locale === "ar" ? "rtl" : "ltr"}
                          value={field.value || undefined}
                          onValueChange={(val) =>
                            field.onChange(val as HearAboutUs)
                          }
                        >
                          <FormControl>
                            <SelectTrigger className="rounded-lg border-black/20 max-w-full!">
                              <SelectValue
                                placeholder={t("hearAboutUsPlaceholder")}
                              />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {HEAR_ABOUT_OPTIONS.map((opt) => (
                              <SelectItem key={opt} value={opt}>
                                {t(`hearAbout_${opt}`)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {(watchedHearAboutUs === "friend" ||
                    watchedHearAboutUs === "other") && (
                    <FormField
                      control={form.control}
                      name="referral_text"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-text-dark font-medium">
                            {t("referralText")}{" "}
                            <span className="text-red-500">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder={t("referralTextPlaceholder")}
                              className="rounded-lg border-black/20 focus-visible:ring-duck-cyan focus-visible:border-duck-cyan"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <div className="flex gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setStep(1)}
                      className="rounded-full border-text-dark"
                    >
                      <ChevronLeft className="w-4 h-4 ms-1 rtl:rotate-180" />
                      {t("previous")}
                    </Button>
                    <Button
                      type="button"
                      onClick={() => {
                        form.trigger().then((ok) => {
                          if (ok) {
                            setStep(3)
                          } else {
                            addToast(t("validationFailed"), "error")
                            const firstErrorKey = Object.keys(
                              form.formState.errors,
                            )[0]
                            if (firstErrorKey) {
                              const el =
                                document.querySelector(
                                  `[name="${firstErrorKey}"]`,
                                ) ?? document.getElementById(firstErrorKey)
                              el?.scrollIntoView({
                                behavior: "smooth",
                                block: "center",
                              })
                            }
                          }
                        })
                      }}
                      className="bg-duck-yellow text-duck-navy rounded-full px-10 py-3 font-medium hover:bg-duck-yellow-hover"
                    >
                      {t("next")}
                    </Button>
                  </div>
                </form>
              </Form>
            )}

            {/* Step 3: Review & pay */}
            {step === 3 && selectedTrip && (
              <div className="space-y-8">
                <h2 className="text-text-dark text-2xl font-bold">
                  {t("step3Title")}
                </h2>
                <div className="bg-off-white rounded-2xl p-6 space-y-4">
                  <div className="flex justify-between items-start">
                    <span className="text-text-muted">{t("reviewTrip")}</span>
                    <span className="font-medium text-text-dark text-end">
                      {getLocalizedText(
                        selectedTrip.name,
                        locale,
                        t("defaultTripName"),
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">
                      {t("reviewDuration")}
                    </span>
                    <span>
                      {selectedTrip.is_tour
                        ? `${Number(watchedDuration) || 1} ${(Number(watchedDuration) || 1) === 1 ? t("hour") : t("hours")}`
                        : `${selectedTrip.duration ?? 1} ${(selectedTrip.duration ?? 1) === 1 ? t("hour") : t("hours")}`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">{t("reviewDate")}</span>
                    <span>
                      {watchedBookingDate
                        ? format(watchedBookingDate, "PPP", {
                            locale: locale === "ar" ? arSA : enUS,
                          })
                        : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">
                      {t("reviewResourceType")}
                    </span>
                    <span>
                      {
                        resourceLabels[
                          (watchedResourceType || "kayak") as ResourceType
                        ]
                      }
                    </span>
                  </div>
                  {(() => {
                    const localCount =
                      watchedGuestMix === "local"
                        ? Number(watchedGuests) || 0
                        : watchedGuestMix === "mixed"
                          ? Number(watchedLocalGuests) || 0
                          : 0
                    const foreignerCount =
                      watchedGuestMix === "foreigner"
                        ? Number(watchedGuests) || 0
                        : watchedGuestMix === "mixed"
                          ? Number(watchedForeignerGuests) || 0
                          : 0
                    const duration = selectedTrip.is_tour
                      ? Number(watchedDuration) || 1
                      : 1
                    const localTotal =
                      selectedTrip.price * localCount * duration
                    const foreignerTotal =
                      (selectedTrip.foreigner_price ?? 0) *
                      foreignerCount *
                      duration
                    const hasOptionalGuideCheck =
                      !selectedTrip.guide_mandatory &&
                      ((selectedTrip.guide_price ?? 0) > 0 ||
                        (selectedTrip.is_tour === true &&
                          (selectedTrip.guide_price ?? 0) === 0))
                    const addsGuideFee =
                      selectedTrip.guide_mandatory ||
                      (hasOptionalGuideCheck && watchedWantsGuide)
                    const guideFee = addsGuideFee
                      ? (selectedTrip.guide_price ?? 0)
                      : 0
                    const total = localTotal + foreignerTotal + guideFee
                    return (
                      <>
                        {localCount > 0 ? (
                          <div className="flex justify-between">
                            <span className="text-text-muted">
                              {t("reviewLocalGuests", { count: localCount })}
                            </span>
                            <span>
                              {formatCurrency(
                                localTotal,
                                selectedTrip.currency,
                              )}
                            </span>
                          </div>
                        ) : null}
                        {foreignerCount > 0 ? (
                          <div className="flex justify-between">
                            <span className="text-text-muted">
                              {t("reviewForeignerGuests", {
                                count: foreignerCount,
                              })}
                            </span>
                            <span>
                              {formatCurrency(
                                foreignerTotal,
                                selectedTrip.currency,
                              )}
                            </span>
                          </div>
                        ) : null}
                        {guideFee > 0 ? (
                          <div className="flex justify-between">
                            <span className="text-text-muted">
                              {t("reviewGuideFee")}
                            </span>
                            <span>
                              {formatCurrency(guideFee, selectedTrip.currency)}
                            </span>
                          </div>
                        ) : null}
                        <div className="flex justify-between border-t pt-3">
                          <span className="text-text-muted">
                            {t("reviewTotal")}
                          </span>
                          <span className="font-bold text-duck-cyan">
                            {formatCurrency(total, selectedTrip.currency)}
                          </span>
                        </div>
                      </>
                    )
                  })()}
                  <div className="flex justify-between">
                    <span className="text-text-muted">{t("reviewName")}</span>
                    <span>{watchedFullName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">{t("reviewPhone")}</span>
                    <span dir="ltr">
                      {watchedPhone
                        ? localEgyptMobileToE164(watchedPhone)
                        : "—"}
                    </span>
                  </div>
                  {selectedTrip.guide_mandatory ||
                  (!selectedTrip.guide_mandatory &&
                    ((selectedTrip.guide_price ?? 0) > 0 ||
                      selectedTrip.is_tour)) ? (
                    <div className="flex justify-between">
                      <span className="text-text-muted">
                        {t("reviewWantsGuide")}
                      </span>
                      <span>
                        {selectedTrip.guide_mandatory || watchedWantsGuide
                          ? t("reviewWantsGuideYes")
                          : t("reviewWantsGuideNo")}
                      </span>
                    </div>
                  ) : null}
                  {watchedHearAboutUs ? (
                    <div className="flex justify-between">
                      <span className="text-text-muted">
                        {t("reviewHearAboutUs")}
                      </span>
                      <span>{t(`hearAbout_${watchedHearAboutUs}`)}</span>
                    </div>
                  ) : null}
                  {(watchedHearAboutUs === "friend" ||
                    watchedHearAboutUs === "other") &&
                  watchedReferralText ? (
                    <div className="flex justify-between">
                      <span className="text-text-muted">
                        {t("reviewReferral")}
                      </span>
                      <span className="text-end">{watchedReferralText}</span>
                    </div>
                  ) : null}
                </div>
                <Form {...form}>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="flex gap-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setStep(2)}
                        disabled={submitLoading}
                        className="rounded-full border-text-dark"
                      >
                        <ChevronLeft className="w-4 h-4 ms-1" />
                        {t("previous")}
                      </Button>
                      <Button
                        type="submit"
                        disabled={submitLoading}
                        className="bg-duck-yellow text-duck-navy rounded-full px-10 py-3 font-medium hover:bg-duck-yellow-hover"
                      >
                        {submitLoading
                          ? t("submitLoading")
                          : t("proceedToPayment")}
                      </Button>
                    </div>
                  </form>
                </Form>
              </div>
            )}
          </div>
        </div>
      </section>

      <Footer />
    </>
  )
}

function BookPageFallback() {
  const t = useTranslations("book")

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse text-text-muted">{t("loading")}</div>
    </div>
  )
}

export default function BookPage() {
  return (
    <Suspense fallback={<BookPageFallback />}>
      <BookPageContent />
    </Suspense>
  )
}
