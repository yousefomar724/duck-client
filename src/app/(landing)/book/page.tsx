/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { Suspense, useState, useEffect, useMemo } from "react"
import { useSearchParams } from "next/navigation"
import Image from "next/image"
import { useForm, useWatch } from "react-hook-form"
import { z } from "zod/v3"
import { zodResolver } from "@hookform/resolvers/zod"
import { Check, ChevronLeft, ChevronDownIcon, User } from "lucide-react"
import { format, formatISO, startOfDay } from "date-fns"
import { arSA, enUS } from "date-fns/locale"
import { arSA as arSADayPicker, enUS as enUSDayPicker } from "react-day-picker/locale"
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
import { getTrips } from "@/lib/api/trips"
import * as bookingsApi from "@/lib/api/bookings"
import type { ResourceType, Trip } from "@/lib/types"
import { getTripImage, resolveImageUrl } from "@/lib/image-utils"
import { formatCurrency } from "@/lib/constants"
import { useAuth } from "@/lib/auth/auth-context"
import { useToast } from "@/lib/toast/toast-context"
import Footer from "@/components/landing/Footer"
import { useTranslations, useLocale } from "next-intl"

const PHONE_PREFIXES = ["010", "011", "012", "015"] as const

const RESOURCE_TYPES = ["kayak", "water_cycle", "sup"] as const satisfies readonly ResourceType[]

type ContactFormValues = {
  full_name: string
  phone_prefix: (typeof PHONE_PREFIXES)[number]
  phone_suffix: string
  booking_date: Date
  resource_type: ResourceType
  quantity: number
  guests: number
}

function getLocalizedText(value: any, locale: string, fallback = ""): string {
  return typeof value === "string" ? value : value?.[locale] || value?.ar || value?.en || fallback
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

  const resourceLabels: Record<ResourceType, string> = {
    kayak: t("resourceKayak"),
    water_cycle: t("resourceWaterCycle"),
    sup: t("resourceSup"),
  }

  const contactSchema = useMemo(() => z.object({
    full_name: z.string().min(2, tv("nameMin")),
    phone_prefix: z.enum(PHONE_PREFIXES),
    phone_suffix: z
      .string()
      .length(8, tv("phoneLength"))
      .regex(/^\d{8}$/, tv("phoneDigits")),
    booking_date: z.date({
      required_error: tv("dateRequired"),
      invalid_type_error: tv("dateInvalid"),
    }),
    resource_type: z.enum(RESOURCE_TYPES),
    quantity: z.coerce
      .number({ invalid_type_error: tv("numberInvalid") })
      .int()
      .min(1, tv("minOne")),
    guests: z.coerce
      .number({ invalid_type_error: tv("numberInvalid") })
      .int()
      .min(1, tv("minOneGuest")),
  }), [tv])

  const formSchema = useMemo(
    () =>
      contactSchema.superRefine((data, ctx) => {
        if (
          selectedTrip &&
          data.guests > selectedTrip.max_guests
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: t("maxGuestsError", { max: selectedTrip.max_guests }),
            path: ["guests"],
          })
        }
      }),
    [selectedTrip, contactSchema, t],
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
        if (trip) setSelectedTrip(trip)
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
      phone_prefix: "010",
      phone_suffix: "",
      booking_date: defaultTomorrow,
      resource_type: "kayak",
      quantity: 1,
      guests: 1,
    },
  })

  const watchedBookingDate = useWatch({
    control: form.control,
    name: "booking_date",
  })
  const watchedResourceType = useWatch({
    control: form.control,
    name: "resource_type",
  })
  const watchedQuantity = useWatch({ control: form.control, name: "quantity" })
  const watchedGuests = useWatch({ control: form.control, name: "guests" })
  const watchedFullName = useWatch({ control: form.control, name: "full_name" })
  const watchedPhonePrefix = useWatch({
    control: form.control,
    name: "phone_prefix",
  })
  const watchedPhoneSuffix = useWatch({
    control: form.control,
    name: "phone_suffix",
  })

  const handleUseMyData = () => {
    if (!user) return
    const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ")
    form.setValue("full_name", fullName)
    if (user.phone_number) {
      const p = user.phone_number.replace(/\s/g, "")
      const match = p.match(/(10|11|12|15)(\d{8})$/)
      if (match) {
        const prefix = `0${match[1]}` as (typeof PHONE_PREFIXES)[number]
        if (PHONE_PREFIXES.includes(prefix)) {
          form.setValue("phone_prefix", prefix)
          form.setValue("phone_suffix", match[2])
        }
      }
    }
  }

  const handleSubmit = form.handleSubmit(async (values) => {
    if (!selectedTrip) return
    const prefixDigits = values.phone_prefix.startsWith("0")
      ? values.phone_prefix.slice(1)
      : values.phone_prefix
    const phoneNumber = `+20${prefixDigits}${values.phone_suffix}`
    setSubmitLoading(true)
    const booking_date = formatISO(startOfDay(values.booking_date))
    const { data, error } = await bookingsApi.createBooking({
      trip_id: selectedTrip.id,
      full_name: values.full_name.trim(),
      phone_number: phoneNumber,
      booking_date,
      guests: values.guests,
      resource_type: values.resource_type,
      quantity: values.quantity,
    })
    setSubmitLoading(false)
    if (error) {
      const isConflict =
        error.toLowerCase().includes("availability") ||
        error.toLowerCase().includes("no availability") ||
        error.includes("409")
      addToast(
        isConflict
          ? t("noAvailability")
          : error,
        "error",
      )
      return
    }
    if (data?.payment_url) {
      // Navigate to payment gateway (full page redirect)
      window.location.assign(data.payment_url)
    }
  })

  const placeholderImage = "/offer.webp"

  return (
    <>
      {/* Hero */}
      <section className="bg-duck-navy pt-28 md:pt-44 pb-20 px-4 md:px-10 text-center">
        <div className="max-w-2xl mx-auto">
          <span className="text-duck-cyan text-base block mb-4">
            {t("heroSubtitle")}
          </span>
          <h1 className="text-white text-4xl md:text-6xl font-bold mb-5">
            {t("heroTitle")}
          </h1>
          <p className="text-white/70 text-base md:text-lg leading-relaxed">
            {t("heroDescription")}
          </p>

          {/* Step indicator */}
          <div className="flex justify-center gap-3 mt-8" dir="ltr">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`flex items-center gap-1 ${
                  step === s
                    ? "text-duck-cyan font-semibold"
                    : step > s
                      ? "text-duck-cyan/80"
                      : "text-white/50"
                }`}
              >
                <span
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                    step === s
                      ? "bg-duck-cyan text-duck-navy"
                      : step > s
                        ? "bg-duck-cyan/30 text-white"
                        : "bg-white/20 text-white"
                  }`}
                >
                  {step > s ? <Check className="w-4 h-4" /> : s}
                </span>
                {s < 3 && <span className="w-6 h-0.5 bg-white/30" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="bg-off-white py-20 px-4 md:px-10">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-3xl shadow-lg p-8 md:p-10" dir={locale === "ar" ? "rtl" : "ltr"}>
            {/* Step 1: Trip selection */}
            {step === 1 && (
              <div className="space-y-8">
                <h2 className="text-text-dark text-2xl font-bold">
                  {t("step1Title")}
                </h2>
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
                      const name = getLocalizedText(trip.name, locale, t("defaultTripName"))
                      const rawImage = getTripImage(trip.images)
                      const imageUrl =
                        resolveImageUrl(rawImage) ?? placeholderImage
                      const isSelected = selectedTrip?.id === trip.id
                      const isExternal = imageUrl.startsWith("http")
                      return (
                        <button
                          key={trip.id}
                          type="button"
                          onClick={() => setSelectedTrip(trip)}
                          className={`text-right rounded-2xl overflow-hidden shadow-[0_4px_30px_rgba(0,0,0,0.06)] bg-white flex flex-col transition-all ${
                            isSelected
                              ? "ring-2 ring-duck-cyan ring-offset-2"
                              : "hover:shadow-lg"
                          }`}
                        >
                          <div className="relative h-40 w-full overflow-hidden">
                            {isExternal ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={imageUrl}
                                alt={name}
                                className="absolute inset-0 w-full h-full object-cover"
                              />
                            ) : (
                              <Image
                                src={imageUrl}
                                alt={name}
                                fill
                                className="object-cover"
                              />
                            )}
                            {isSelected && (
                              <div className="absolute top-3 end-3 w-8 h-8 rounded-full bg-duck-cyan flex items-center justify-center">
                                <Check className="w-4 h-4 text-duck-navy" />
                              </div>
                            )}
                          </div>
                          <div className="p-4">
                            <h3 className="text-text-dark font-bold text-lg mb-1">
                              {name}
                            </h3>
                            <p className="text-duck-cyan font-semibold">
                              {formatCurrency(trip.price, trip.currency)}
                            </p>
                            <p className="text-text-muted text-sm mt-1">
                              {trip.duration ?? 1}{" "}
                              {(trip.duration ?? 1) === 1 ? t("day") : t("days")}
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
                          {t("fullName")} <span className="text-red-500">*</span>
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
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="phone_prefix"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-text-dark font-medium">
                            {t("phone")} <span className="text-red-500">*</span>
                          </FormLabel>
                          <FormControl>
                            <div dir="ltr" className="flex flex-wrap gap-3">
                              {PHONE_PREFIXES.map((prefix) => (
                                <button
                                  key={prefix}
                                  type="button"
                                  onClick={() => field.onChange(prefix)}
                                  className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                                    field.value === prefix
                                      ? "bg-duck-cyan text-white border-duck-cyan"
                                      : "border-gray-300 hover:border-duck-cyan"
                                  }`}
                                >
                                  {prefix}
                                </button>
                              ))}
                            </div>
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="phone_suffix"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-text-muted text-sm">
                            {t("phoneSuffix")}
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="12345678"
                              dir="ltr"
                              maxLength={8}
                              className="rounded-lg border-black/20 focus-visible:ring-duck-cyan focus-visible:border-duck-cyan w-40"
                              {...field}
                              onChange={(e) => {
                                const v = e.target.value.replace(/\D/g, "")
                                field.onChange(v)
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="booking_date"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel className="text-text-dark font-medium">
                          {t("bookingDate")} <span className="text-red-500">*</span>
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
                                  format(field.value, "PPP", { locale: locale === "ar" ? arSA : enUS })
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
                              locale={locale === "ar" ? arSADayPicker : enUSDayPicker}
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
                          {t("resourceType")} <span className="text-red-500">*</span>
                        </FormLabel>
                        <Select
                          dir={locale === "ar" ? "rtl" : "ltr"}
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="rounded-lg border-black/20">
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="quantity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-text-dark font-medium">
                            {t("quantity")} <span className="text-red-500">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={1}
                              className="rounded-lg border-black/20"
                              {...field}
                              onChange={(e) =>
                                field.onChange(
                                  e.target.value === ""
                                    ? ""
                                    : Number(e.target.value),
                                )
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="guests"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-text-dark font-medium">
                            {t("guests")} <span className="text-red-500">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={1}
                              max={selectedTrip?.max_guests ?? undefined}
                              className="rounded-lg border-black/20"
                              {...field}
                              onChange={(e) =>
                                field.onChange(
                                  e.target.value === ""
                                    ? ""
                                    : Number(e.target.value),
                                )
                              }
                            />
                          </FormControl>
                          <FormMessage />
                          {selectedTrip ? (
                            <p className="text-xs text-text-muted">
                              {t("maxGuests", { max: selectedTrip.max_guests })}
                            </p>
                          ) : null}
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setStep(1)}
                      className="rounded-full border-text-dark"
                    >
                      <ChevronLeft className="w-4 h-4 ms-1" />
                      {t("previous")}
                    </Button>
                    <Button
                      type="button"
                      onClick={() => {
                        form.trigger().then((ok) => ok && setStep(3))
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
                    <span className="font-medium text-text-dark text-left">
                      {getLocalizedText(selectedTrip.name, locale, t("defaultTripName"))}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">{t("reviewDuration")}</span>
                    <span>
                      {selectedTrip.duration ?? 1}{" "}
                      {(selectedTrip.duration ?? 1) === 1 ? t("day") : t("days")}
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
                    <span className="text-text-muted">{t("reviewResourceType")}</span>
                    <span>
                      {resourceLabels[
                        (watchedResourceType || "kayak") as ResourceType
                      ]}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">{t("reviewQuantityGuests")}</span>
                    <span>
                      {t("reviewQuantityGuestsValue", { quantity: watchedQuantity, guests: watchedGuests })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">{t("reviewTotal")}</span>
                    <span className="font-bold text-duck-cyan">
                      {formatCurrency(
                        selectedTrip.price * (Number(watchedQuantity) || 1),
                        selectedTrip.currency,
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">{t("reviewName")}</span>
                    <span>{watchedFullName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">{t("reviewPhone")}</span>
                    <span dir="ltr">
                      +20
                      {(watchedPhonePrefix || "010").replace(/^0/, "")}
                      {watchedPhoneSuffix}
                    </span>
                  </div>
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
                        {submitLoading ? t("submitLoading") : t("proceedToPayment")}
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
