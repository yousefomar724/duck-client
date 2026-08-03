/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import {
  Suspense,
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useForm, useWatch } from "react-hook-form"
import { z } from "zod/v3"
import { zodResolver } from "@hookform/resolvers/zod"
import { Check, ChevronLeft, Clock, Copy, User } from "lucide-react"
import {
  buildWhatsAppHref,
  SUPPORT_WHATSAPP_NUMBER,
} from "@/lib/support-contact"
import { formatISO, set, startOfDay } from "date-fns"
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
import {
  BookingScheduleField,
  BOOKING_MIN_MINUTES,
  BOOKING_MAX_MINUTES,
} from "@/components/booking/booking-schedule-field"
import {
  formatBookingDayPhrase,
  formatBookingTime,
} from "@/lib/booking/relative-booking-day"
import {
  parseStoredPhoneToLocal,
  localEgyptMobileToE164,
} from "@/lib/booking/phone"
import {
  calculateBookingTotal,
  minimumDeposit,
} from "@/lib/booking/pricing"
import { createBookingFormSchema } from "@/lib/booking/form-schema"
import { getTrips } from "@/lib/api/trips"
import * as bookingsApi from "@/lib/api/bookings"
import {
  type SuccessCache,
  SUCCESS_CACHE_KEY,
} from "@/lib/booking-success-cache"
import type { Booking, ResourceType, Trip } from "@/lib/types"
import { getTripImage, resolveImageUrl } from "@/lib/image-utils"
import { formatCurrency } from "@/lib/constants"
import { useAuth } from "@/lib/stores/auth-store"
import { useToast } from "@/lib/stores/toast-store"
import Footer from "@/components/landing/Footer"
import { useTranslations, useLocale } from "next-intl"
import { TripListingPrices } from "@/components/shared/trip-listing-prices"
import { ImageWithLogoFallback } from "@/components/shared/image-with-logo-fallback"

const PAYMENT_METHOD = process.env.NEXT_PUBLIC_PAYMENT_METHOD ?? "instapay"
const INSTAPAY_LINK = "https://ipn.eg/S/karim.m.cib/instapay/5bCbda"

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
  played_before?: boolean
  hear_about_us: HearAboutUs | ""
  referral_text: string
}

function getLocalizedText(value: any, locale: string, fallback = ""): string {
  return typeof value === "string"
    ? value
    : value?.[locale] || value?.ar || value?.en || fallback
}

function BookPageContent() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const tripParam = searchParams.get("trip")
  const { user } = useAuth()
  const { addToast } = useToast()
  const t = useTranslations("book")
  const tv = useTranslations("validation")
  const locale = useLocale()

  const step = useMemo(() => {
    const raw = searchParams.get("step")
    if (raw) {
      const n = parseInt(raw, 10)
      if (n >= 1 && n <= 3) return n
    }
    return 1
  }, [searchParams])
  const [trips, setTrips] = useState<Trip[]>([])
  const [tripsLoading, setTripsLoading] = useState(true)
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [guestsMode, setGuestsMode] = useState<"preset" | "custom">("preset")
  const [paymentAmount, setPaymentAmount] = useState<number>(0)
  const [manualBookingResult, setManualBookingResult] = useState<{
    booking: Booking
    chosenAmount: number
  } | null>(null)
  const [copiedNumber, setCopiedNumber] = useState(false)

  const handleCopyWhatsApp = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(`+${SUPPORT_WHATSAPP_NUMBER}`)
      setCopiedNumber(true)
      // Revert to the idle label so the button stays usable if they copy again.
      setTimeout(() => setCopiedNumber(false), 2000)
    } catch {
      // Clipboard is unavailable on insecure origins and some in-app
      // browsers; the number stays selectable as plain text either way.
      addToast(t("instapayCopyFailed"), "error")
    }
  }, [addToast, t])

  const navigateToStep = useCallback(
    (nextStep: number, mode: "push" | "replace", tripId?: string) => {
      const p = new URLSearchParams(searchParams.toString())
      p.set("step", String(nextStep))
      const tid = tripId ?? selectedTrip?.id ?? tripParam ?? undefined
      if (tid) p.set("trip", tid)
      const qs = p.toString()
      const url = qs ? `${pathname}?${qs}` : pathname
      if (mode === "replace") router.replace(url)
      else router.push(url)
    },
    [pathname, router, searchParams, selectedTrip?.id, tripParam],
  )

  // --- NEW: useRef to store previous trip id ---
  const prevTripIdRef = useRef<string | null>(null)
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

  const formSchema = useMemo(
    () =>
      createBookingFormSchema(
        {
          nameMin: tv("nameMin"),
          phoneRequired: tv("phoneRequired"),
          phoneMobileEgypt: tv("phoneMobileEgypt"),
          dateRequired: tv("dateRequired"),
          dateInvalid: tv("dateInvalid"),
          dateTimePast: tv("dateTimePast"),
          bookingTimeRange: tv("bookingTimeRange"),
          numberInvalid: tv("numberInvalid"),
          minOneGuest: tv("minOneGuest"),
          minOne: tv("minOne"),
          maxGuestsError: (max) => t("maxGuestsError", { max }),
          guestMixSumError: (total) => t("guestMixSumError", { total }),
        },
        selectedTrip?.max_guests,
      ),
    [selectedTrip, t, tv],
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
        const id = tripParam
        const trip = data.find((t) => t.id === id)
        if (trip) {
          setSelectedTrip(trip)
          const stepInUrl =
            typeof window !== "undefined"
              ? new URLSearchParams(window.location.search).get("step")
              : null
          if (!stepInUrl && !didAutoAdvanceRef.current) {
            didAutoAdvanceRef.current = true
            const p = new URLSearchParams(
              typeof window !== "undefined" ? window.location.search : "",
            )
            p.set("trip", String(trip.id))
            p.set("step", "2")
            const qs = p.toString()
            router.replace(qs ? `${pathname}?${qs}` : pathname)
          }
        }
      }
    }
    fetchTrips()
    return () => {
      cancelled = true
    }
  }, [tripParam, locale, pathname, router])

  const defaultTomorrow = useMemo(() => {
    const t = new Date()
    t.setDate(t.getDate() + 1)
    return set(startOfDay(t), {
      hours: 10,
      minutes: 0,
      seconds: 0,
      milliseconds: 0,
    })
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

  const totalAmount = useMemo(
    () =>
      calculateBookingTotal({
        trip: selectedTrip,
        guestMix: watchedGuestMix,
        guests: Number(watchedGuests) || 0,
        localGuests: Number(watchedLocalGuests) || 0,
        foreignerGuests: Number(watchedForeignerGuests) || 0,
        duration: Number(watchedDuration) || 1,
      }),
    [
      selectedTrip,
      watchedGuestMix,
      watchedGuests,
      watchedLocalGuests,
      watchedForeignerGuests,
      watchedDuration,
    ],
  )

  const handleSubmit = form.handleSubmit(async (values) => {
    if (!selectedTrip) return
    const phoneNumber = localEgyptMobileToE164(values.phone)
    setSubmitLoading(true)
    const booking_date = formatISO(values.booking_date)

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

    const needsReferral =
      values.hear_about_us === "friend" || values.hear_about_us === "other"

    const bookingPayload = {
      trip_id: selectedTrip.id,
      full_name: values.full_name.trim(),
      phone_number: phoneNumber,
      booking_date,
      resource_type: values.resource_type,
      quantity: totalGuests,
      local_guests: localGuests,
      foreigner_guests: foreignerGuests,
      duration: values.duration,
      wants_guide: false,
      played_before: values.played_before,
      hear_about_us: values.hear_about_us || "",
      referral_text: needsReferral ? values.referral_text.trim() : "",
    }

    if (PAYMENT_METHOD === "instapay") {
      const minPayment = minimumDeposit(totalAmount)
      const chosenAmount =
        paymentAmount >= minPayment ? paymentAmount : totalAmount
      const { data, error } =
        await bookingsApi.createManualBooking(bookingPayload)
      setSubmitLoading(false)
      if (error) {
        const isConflict =
          error.toLowerCase().includes("availability") ||
          error.toLowerCase().includes("no availability") ||
          error.includes("409")
        addToast(isConflict ? t("noAvailability") : error, "error")
        return
      }
      if (data?.booking) {
        setManualBookingResult({ booking: data.booking, chosenAmount })
      }
      return
    }

    const { data, error } = await bookingsApi.createBooking(bookingPayload)
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
              {[1, 2, 3].map((s) => {
                const isDone = manualBookingResult ? true : step > s
                const isActive = !manualBookingResult && step === s
                return (
                  <div
                    key={s}
                    className={`flex items-center gap-1 ${
                      isActive
                        ? "text-duck-cyan font-semibold"
                        : isDone
                          ? "text-duck-cyan/90"
                          : "text-text-muted"
                    }`}
                  >
                    <span
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                        isActive
                          ? "bg-duck-cyan text-duck-navy"
                          : isDone
                            ? "bg-duck-cyan/15 text-duck-cyan"
                            : "bg-muted text-text-muted"
                      }`}
                    >
                      {isDone ? <Check className="w-4 h-4" /> : s}
                    </span>
                    {s < 3 && (
                      <span className="w-4 sm:w-6 h-0.5 bg-duck-cyan/20" />
                    )}
                  </div>
                )
              })}
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
                          className={`text-start rounded-2xl overflow-hidden shadow-[0_4px_30px_rgba(0,0,0,0.06)] h-fit bg-white flex flex-col transition-all ${
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
                                      locale,
                                    ),
                                  },
                                )}
                                perHourSuffix={
                                  trip.is_tour ? t("perHour") : undefined
                                }
                                locale={locale}
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
                  onClick={() =>
                    selectedTrip && navigateToStep(2, "push", selectedTrip.id)
                  }
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
                        <FormControl>
                          <BookingScheduleField
                            key={locale}
                            name={field.name}
                            value={field.value}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                            locale={locale}
                          />
                        </FormControl>
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
                      <p className="font-medium">{t("captainIncluded")}</p>
                    </div>
                  ) : null}

                  {/* Played Before */}
                  <FormField
                    control={form.control}
                    name="played_before"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-text-dark font-medium">
                          {t("playedBeforeLabel")}{" "}
                          <span className="text-text-muted font-normal">
                            ({t("optional")})
                          </span>
                        </FormLabel>
                        <Select
                          dir={locale === "ar" ? "rtl" : "ltr"}
                          value={field.value === true ? "yes" : field.value === false ? "no" : ""}
                          onValueChange={(val) =>
                            field.onChange(val === "yes" ? true : val === "no" ? false : undefined)
                          }
                        >
                          <FormControl>
                            <SelectTrigger className="rounded-lg border-black/20 max-w-full!">
                              <SelectValue placeholder={t("selectYesNo")} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="yes">{t("yes")}</SelectItem>
                            <SelectItem value="no">{t("no")}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

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
                            <span className="text-text-muted font-normal">
                              {t("hearAboutUsOptional")}
                            </span>
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
                      onClick={() => navigateToStep(1, "push")}
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
                            navigateToStep(3, "push")
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
                    <span className="font-medium text-text-dark text-end">
                      {watchedBookingDate
                        ? formatBookingDayPhrase(
                            watchedBookingDate,
                            locale,
                            {
                              today: t("relativeDayToday"),
                              tomorrow: t("relativeDayTomorrow"),
                              dayAfterTomorrow: t("relativeDayAfterTomorrow"),
                            },
                          )
                        : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">{t("reviewTime")}</span>
                    <span className="font-medium text-text-dark text-end">
                      {watchedBookingDate
                        ? formatBookingTime(watchedBookingDate, locale)
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
                    const total = localTotal + foreignerTotal
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
                                locale,
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
                                locale,
                              )}
                            </span>
                          </div>
                        ) : null}
                        <div className="flex justify-between border-t pt-3">
                          <span className="text-text-muted">
                            {t("reviewTotal")}
                          </span>
                          <span className="font-bold text-duck-cyan">
                            {formatCurrency(total, selectedTrip.currency, locale)}
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
                  {selectedTrip.guide_mandatory ? (
                    <div className="flex justify-between">
                      <span className="text-text-muted">
                        {t("reviewCaptain")}
                      </span>
                      <span>{t("reviewCaptainIncludedValue")}</span>
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
                {PAYMENT_METHOD === "instapay" && totalAmount > 0 && (
                  <div className="rounded-2xl border border-duck-cyan/30 bg-duck-cyan/5 p-5 space-y-4">
                    <p className="font-semibold text-text-dark">
                      {t("paymentAmountTitle")}
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => setPaymentAmount(totalAmount)}
                        className={`flex-1 min-w-[140px] rounded-xl border-2 p-3 text-sm font-medium transition-colors ${
                          paymentAmount === totalAmount || paymentAmount === 0
                            ? "border-duck-cyan bg-duck-cyan/10 text-duck-navy"
                            : "border-border hover:border-duck-cyan/50"
                        }`}
                      >
                        <span className="block text-base font-bold">
                          {formatCurrency(totalAmount, selectedTrip.currency, locale)}
                        </span>
                        {/* flex-wrap so the badge drops to its own line on
                            narrow cards instead of colliding with the label. */}
                        <span className="flex flex-wrap items-center justify-center gap-1 mt-0.5">
                          {t("paymentAmountFull")}
                          <span className="text-xs bg-duck-cyan text-duck-navy px-1.5 py-0.5 rounded-full font-semibold">
                            {t("paymentAmountRecommended")}
                          </span>
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setPaymentAmount(minimumDeposit(totalAmount))
                        }
                        className={`flex-1 min-w-[140px] rounded-xl border-2 p-3 text-sm font-medium transition-colors ${
                          paymentAmount === minimumDeposit(totalAmount) &&
                          paymentAmount !== totalAmount
                            ? "border-duck-cyan bg-duck-cyan/10 text-duck-navy"
                            : "border-border hover:border-duck-cyan/50"
                        }`}
                      >
                        <span className="block text-base font-bold">
                          {formatCurrency(
                            minimumDeposit(totalAmount),
                            selectedTrip.currency,
                            locale,
                          )}
                        </span>
                        <span className="block mt-0.5">
                          {t("paymentAmountHalf")}
                        </span>
                      </button>
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-sm text-text-muted">
                        {t("paymentAmountCustomLabel")}
                      </p>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          inputMode="numeric"
                          min={minimumDeposit(totalAmount)}
                          max={totalAmount}
                          value={paymentAmount || totalAmount}
                          onChange={(e) => {
                            const v = Number(e.target.value)
                            setPaymentAmount(v)
                          }}
                          className="w-full rounded-lg border border-black/20 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-duck-cyan focus:border-duck-cyan"
                        />
                        <span className="text-sm text-text-muted whitespace-nowrap">
                          {selectedTrip.currency}
                        </span>
                      </div>
                      <p className="text-xs text-text-muted">
                        {t("paymentAmountMin", {
                          min: formatCurrency(
                            minimumDeposit(totalAmount),
                            selectedTrip.currency,
                            locale,
                          ),
                        })}
                      </p>
                    </div>
                    {paymentAmount > 0 && paymentAmount < totalAmount && (
                      <p className="text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                        {t("partialPaymentRemaining", {
                          remaining: formatCurrency(
                            totalAmount - paymentAmount,
                            selectedTrip.currency,
                            locale,
                          ),
                        })}
                      </p>
                    )}
                  </div>
                )}
                <Form {...form}>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Stacks on mobile: the submit label ("Confirm booking &
                        pay via InstaPay") is long, and Button's base styles are
                        whitespace-nowrap + shrink-0, so side-by-side it
                        overflowed the viewport on small screens. */}
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => navigateToStep(2, "push")}
                        disabled={submitLoading}
                        className="rounded-full border-text-dark w-full sm:w-auto"
                      >
                        <ChevronLeft className="w-4 h-4 ms-1 rtl:rotate-180" />
                        {t("previous")}
                      </Button>
                      <Button
                        type="submit"
                        disabled={submitLoading}
                        className="bg-duck-yellow text-duck-navy rounded-full px-6 sm:px-10 py-3 font-medium hover:bg-duck-yellow-hover w-full sm:w-auto h-auto whitespace-normal text-center"
                      >
                        {submitLoading
                          ? t("submitLoading")
                          : PAYMENT_METHOD === "instapay"
                            ? t("submitInstapay")
                            : t("proceedToPayment")}
                      </Button>
                    </div>
                  </form>
                </Form>
              </div>
            )}
            {/* Step 4: InstaPay confirmation */}
            {manualBookingResult && (
              <div className="space-y-6 mt-6">
                {/* Deliberately NOT a green success state: at this point the
                    booking is only reserved. A checkmark here read as "done"
                    and users skipped paying. */}
                <div className="text-center space-y-2">
                  <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
                    <Clock className="w-8 h-8 text-amber-600" />
                  </div>
                  <h2 className="text-text-dark text-2xl font-bold">
                    {t("bookingCreated")}
                  </h2>
                  <p className="text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-sm">
                    {t("bookingNotConfirmedYet")}
                  </p>
                  <p className="text-text-muted text-sm">
                    {t("bookingRef")}:{" "}
                    <span className="font-mono font-semibold text-duck-navy">
                      #{manualBookingResult.booking.ID}
                    </span>
                  </p>
                </div>

                <div className="bg-off-white rounded-2xl p-5 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-text-muted text-sm">
                      {t("amountToSend")}
                    </span>
                    <span className="font-bold text-xl text-duck-cyan">
                      {formatCurrency(
                        manualBookingResult.chosenAmount,
                        manualBookingResult.booking.currency || "EGP",
                        locale,
                      )}
                    </span>
                  </div>
                  {manualBookingResult.chosenAmount <
                    (manualBookingResult.booking.amount ?? 0) && (
                    <p className="text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                      {t("partialPaymentRemaining", {
                        remaining: formatCurrency(
                          (manualBookingResult.booking.amount ?? 0) -
                            manualBookingResult.chosenAmount,
                          manualBookingResult.booking.currency || "EGP",
                          locale,
                        ),
                      })}
                    </p>
                  )}
                </div>

                <div className="rounded-2xl border-2 border-duck-cyan/30 p-5 space-y-4">
                  <p className="font-semibold text-text-dark">
                    {t("instapayStep1", {
                      amount: formatCurrency(
                        manualBookingResult.chosenAmount,
                        manualBookingResult.booking.currency || "EGP",
                        locale,
                      ),
                    })}
                  </p>
                  <a
                    href={INSTAPAY_LINK}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full bg-duck-cyan text-duck-navy rounded-full py-3 px-6 font-semibold hover:bg-duck-cyan/90 transition-colors"
                  >
                    {t("payViaInstapay")}
                  </a>

                  <div className="border-t border-border/60 pt-4 mt-2 space-y-3">
                    <p className="font-semibold text-text-dark">
                      {t("instapayStep2")}
                    </p>
                    <p className="text-text-muted text-sm">
                      {t("instapaySendReceipt")}
                    </p>
                    {/* Copyable so people paying from another device (or in
                        the WhatsApp desktop app) can reach the number without
                        retyping it. */}
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-off-white px-3 py-2">
                      <span
                        className="font-mono font-semibold text-duck-navy"
                        dir="ltr"
                      >
                        +{SUPPORT_WHATSAPP_NUMBER}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyWhatsApp}
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-duck-cyan hover:underline"
                      >
                        {copiedNumber ? (
                          <>
                            <Check className="w-4 h-4" aria-hidden="true" />
                            {t("instapayCopied")}
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" aria-hidden="true" />
                            {t("instapayCopyNumber")}
                          </>
                        )}
                      </button>
                    </div>
                    <a
                      href={buildWhatsAppHref(
                        `Hello, I have paid for my booking (Ref: #${manualBookingResult.booking.ID}). Here is my receipt.`,
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full bg-[#25D366] text-white rounded-full py-3 px-6 font-semibold hover:bg-[#20bd5a] transition-colors"
                    >
                      {t("instapaySendReceiptBtn")}
                    </a>
                  </div>
                </div>

                <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-center">
                  {t("bookingPendingNote")}
                </p>

                <div className="text-center">
                  <a
                    href="/my-bookings"
                    className="text-duck-cyan underline underline-offset-2 text-sm font-medium"
                  >
                    {t("viewMyBookings")}
                  </a>
                </div>
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
