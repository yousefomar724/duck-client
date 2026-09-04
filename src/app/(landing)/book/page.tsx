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
import { zodResolver } from "@hookform/resolvers/zod"
import { Check, ChevronLeft, Clock, Copy, User } from "lucide-react"
import {
  buildWhatsAppHref,
  INSTAPAY_LINK,
  SUPPORT_WHATSAPP_NUMBER,
} from "@/lib/support-contact"
import { FeedbackPromptCard } from "@/components/feedback/feedback-prompt-card"
import { formatISO } from "date-fns"
import { localYmd, siteWallClock, siteWallTimeToUtc } from "@/lib/time"
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
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { BookingScheduleField } from "@/components/booking/booking-schedule-field"
import {
  formatBookingDayPhrase,
  formatBookingTime,
} from "@/lib/booking/relative-booking-day"
import {
  parseStoredPhoneToLocal,
  localEgyptMobileToE164,
  phoneToE164,
} from "@/lib/booking/phone"
import {
  calculateBookingBreakdown,
  calculateBookingTotal,
  minimumDeposit,
} from "@/lib/booking/pricing"
import { createBookingFormSchema, type BookingFormValues } from "@/lib/booking/form-schema"
import { getTrips } from "@/lib/api/trips"
import * as bookingsApi from "@/lib/api/bookings"
import {
  type SuccessCache,
  SUCCESS_CACHE_KEY,
  readPendingInstapay,
  writePendingInstapay,
  clearPendingInstapay,
} from "@/lib/booking-success-cache"
import type { Booking, ResourceType, Trip } from "@/lib/types"
import { getTripImage, resolveImageUrl } from "@/lib/image-utils"
import { formatCurrency } from "@/lib/constants"
import { tripDurationText } from "@/lib/trips/duration"
import { useAuth } from "@/lib/stores/auth-store"
import { useToast } from "@/lib/stores/toast-store"
import Footer from "@/components/landing/Footer"
import { useTranslations, useLocale } from "next-intl"
import { TripListingPrices } from "@/components/shared/trip-listing-prices"
import { ImageWithLogoFallback } from "@/components/shared/image-with-logo-fallback"

const PAYMENT_METHOD = process.env.NEXT_PUBLIC_PAYMENT_METHOD ?? "instapay"

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

function getLocalizedText(value: any, locale: string, fallback = ""): string {
  return typeof value === "string"
    ? value
    : value?.[locale] || value?.ar || value?.en || fallback
}

function tripDurationLabel(
  trip: Trip,
  locale: string,
  hour: string,
  hours: string,
): string {
  const text = tripDurationText(trip, locale)
  if (text) return text
  const d = trip.duration ?? 1
  return `${d} ${d === 1 ? hour : hours}`
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
  const restoredPendingRef = useRef(false)

  useEffect(() => {
    if (restoredPendingRef.current) return
    restoredPendingRef.current = true
    const pending = readPendingInstapay()
    if (!pending) return
    const urlTrip = searchParams.get("trip")
    const pendingTripId =
      typeof pending.booking.trip_id === "string"
        ? pending.booking.trip_id
        : undefined
    if (urlTrip && pendingTripId && urlTrip !== pendingTripId) {
      clearPendingInstapay()
      return
    }
    setManualBookingResult(pending)
  }, [searchParams])

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

  const startNewBooking = useCallback(() => {
    clearPendingInstapay()
    setManualBookingResult(null)
    navigateToStep(1, "push")
  }, [navigateToStep])

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
          kidsMinOne: t("kidsMinOne"),
          adultsMinOne: tv("adultsMinOne"),
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
          if (!stepInUrl && !didAutoAdvanceRef.current && !readPendingInstapay()) {
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

  // 10:00 Cairo tomorrow — the bookable window is Cairo opening hours, so
  // seeding from the device clock would start a visitor abroad outside it.
  const defaultTomorrow = useMemo(() => {
    const cairoNow = siteWallClock(new Date())
    cairoNow.setDate(cairoNow.getDate() + 1)
    return siteWallTimeToUtc(localYmd(cairoNow), 10, 0)
  }, [])

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      full_name: "",
      phone: "",
      booking_date: defaultTomorrow,
      resource_type: "kayak",
      guests: 1,
      has_kids_1_6: false,
      kids_1_6: 0,
      has_kids_7_12: false,
      kids_7_12: 0,
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
        return prevMode !== "preset" ? "preset" : prevMode
      } else {
        return prevMode
      }
    })

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
  const watchedHasKids16 = useWatch({
    control: form.control,
    name: "has_kids_1_6",
  })
  const watchedKids16 = useWatch({ control: form.control, name: "kids_1_6" })
  const watchedHasKids712 = useWatch({
    control: form.control,
    name: "has_kids_7_12",
  })
  const watchedKids712 = useWatch({ control: form.control, name: "kids_7_12" })
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

  const kids1to6 = watchedHasKids16 ? Number(watchedKids16) || 0 : 0
  const kids7to12 = watchedHasKids712 ? Number(watchedKids712) || 0 : 0
  const totalGuests = Number(watchedGuests) || 0
  const adultsCount = totalGuests - kids1to6 - kids7to12

  useEffect(() => {
    if (!selectedTrip) return
    const maxG = selectedTrip.max_guests
    const guests = Number(form.getValues("guests")) || 0
    if (guests <= maxG) return
    form.setValue("guests", maxG)
  }, [selectedTrip, totalGuests, form])

  // When guest_mix changes, keep local/foreigner in sync with total.
  useEffect(() => {
    if (watchedGuestMix === "local") {
      form.setValue("local_guests", totalGuests)
      form.setValue("foreigner_guests", 0)
    } else if (watchedGuestMix === "foreigner") {
      form.setValue("foreigner_guests", totalGuests)
      form.setValue("local_guests", 0)
    }
  }, [watchedGuestMix, totalGuests, form])

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

  const sanitizePhoneInput = (raw: string) => {
    if (raw.startsWith('+')) {
      const digits = raw.slice(1).replace(/\D/g, '').slice(0, 15)
      return '+' + digits
    }
    return raw.replace(/\D/g, '').slice(0, 15)
  }

  const handleSubmit = form.handleSubmit(async (values) => {
    if (!selectedTrip) return
    const phoneNumber = phoneToE164(values.phone) ?? values.phone
    setSubmitLoading(true)
    const booking_date = formatISO(values.booking_date)

    let localGuests = 0
    let foreignerGuests = 0
    if (values.guest_mix === "local") {
      localGuests = totalGuests
    } else if (values.guest_mix === "foreigner") {
      foreignerGuests = totalGuests
    } else {
      localGuests = values.local_guests
      foreignerGuests = values.foreigner_guests
    }

    const needsReferral =
      values.hear_about_us === "friend" || values.hear_about_us === "other"

    const minPayment = minimumDeposit(totalAmount)
    const chosenAmount =
      paymentAmount >= minPayment ? paymentAmount : totalAmount

    const bookingPayload = {
      trip_id: selectedTrip.id,
      full_name: values.full_name.trim(),
      phone_number: phoneNumber,
      booking_date,
      resource_type: values.resource_type,
      quantity: values.guests,
      local_guests: localGuests,
      foreigner_guests: foreignerGuests,
      adults: values.guests - kids1to6 - kids7to12,
      kids_1_6: kids1to6,
      kids_7_12: kids7to12,
      duration: values.duration,
      wants_guide: false,
      played_before: values.played_before,
      hear_about_us: values.hear_about_us || "",
      referral_text: needsReferral ? values.referral_text.trim() : "",
      ...(PAYMENT_METHOD === "instapay"
        ? { declared_amount: chosenAmount }
        : {}),
    }

    if (PAYMENT_METHOD === "instapay") {
      const result = await bookingsApi.createManualBooking(bookingPayload)
      setSubmitLoading(false)
      if (result.error) {
        const isConflict =
          result.code === "NO_AVAILABILITY" ||
          result.error.toLowerCase().includes("availability") ||
          result.error.toLowerCase().includes("no availability") ||
          result.error.includes("409")
        addToast(isConflict ? t("noAvailability") : result.error, "error")
        return
      }
      if (result.data?.booking) {
        const bookingResult = { booking: result.data.booking, chosenAmount }
        setManualBookingResult(bookingResult)
        writePendingInstapay(bookingResult)
        window.scrollTo({ top: 0, behavior: "smooth" })
      }
      return
    }

    const result = await bookingsApi.createBooking(bookingPayload)
    setSubmitLoading(false)
    if (result.error) {
      const isConflict =
        result.code === "NO_AVAILABILITY" ||
        result.error.toLowerCase().includes("availability") ||
        result.error.toLowerCase().includes("no availability") ||
        result.error.includes("409")
      addToast(isConflict ? t("noAvailability") : result.error, "error")
      return
    }
    if (result.data?.payment_url) {
      const b = result.data.booking
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
            adults: adultsCount,
            kids_1_6: kids1to6,
            kids_7_12: kids7to12,
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
      window.location.assign(result.data.payment_url)
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
[...]
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
                                  className="rounded-lg border-black/20 focus-visible:ring-duck-cyan focus-visible:border-duck-cyan"
                                  {...field}
                                  onChange={(e) => {
                                    field.onChange(sanitizePhoneInput(e.target.value))
                                  }}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
[...]
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
