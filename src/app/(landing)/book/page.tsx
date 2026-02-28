/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import { useForm } from "react-hook-form"
import { z } from "zod/v3"
import { zodResolver } from "@hookform/resolvers/zod"
import { Check, ChevronLeft, User } from "lucide-react"
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
import type { Trip } from "@/lib/types"
import { getTripImage, resolveImageUrl } from "@/lib/image-utils"
import { formatCurrency } from "@/lib/constants"
import { useAuth } from "@/lib/auth/auth-context"
import { useToast } from "@/lib/toast/toast-context"
import Footer from "@/components/landing/Footer"

const PHONE_PREFIXES = ["010", "011", "012", "015"] as const

const contactSchema = z.object({
  full_name: z.string().min(2, "الاسم يجب أن يحتوي على حرفين على الأقل"),
  phone_prefix: z.enum(PHONE_PREFIXES),
  phone_suffix: z
    .string()
    .length(8, "رقم الهاتف يجب أن يكون 8 أرقام")
    .regex(/^\d{8}$/, "أدخل 8 أرقام فقط"),
})

type ContactFormValues = z.infer<typeof contactSchema>

function getLocalizedText(value: any, fallback = ""): string {
  return typeof value === "string"
    ? value
    : value?.ar || value?.en || fallback
}

export default function BookPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tripParam = searchParams.get("trip")
  const { isAuthenticated, isLoading: authLoading, user } = useAuth()
  const { addToast } = useToast()

  const [step, setStep] = useState(1)
  const [trips, setTrips] = useState<Trip[]>([])
  const [tripsLoading, setTripsLoading] = useState(true)
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null)
  const [submitLoading, setSubmitLoading] = useState(false)

  // Auth gate
  useEffect(() => {
    if (authLoading) return
    if (!isAuthenticated) {
      const returnUrl = tripParam ? `/book?trip=${tripParam}` : "/book"
      router.replace(`/login?returnUrl=${encodeURIComponent(returnUrl)}`)
    }
  }, [authLoading, isAuthenticated, router, tripParam])

  // Fetch trips
  useEffect(() => {
    let cancelled = false
    async function fetchTrips() {
      setTripsLoading(true)
      const { data, error } = await getTrips("ar")
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
  }, [tripParam])

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      full_name: "",
      phone_prefix: "010",
      phone_suffix: "",
    },
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
    const { data, error } = await bookingsApi.createBooking({
      trip_id: selectedTrip.id,
      full_name: values.full_name.trim(),
      phone_number: phoneNumber,
    })
    setSubmitLoading(false)
    if (error) {
      addToast(error, "error")
      return
    }
    if (data?.payment_url) {
      window.location.href = data.payment_url
    }
  })

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-text-muted">جاري التحميل...</div>
      </div>
    )
  }

  const placeholderImage = "/offer.webp"

  return (
    <>
      {/* Hero */}
      <section className="bg-duck-navy pt-28 md:pt-44 pb-20 px-4 md:px-10 text-center">
        <div className="max-w-2xl mx-auto">
          <span className="text-duck-cyan text-base block mb-4">احجز رحلتك</span>
          <h1 className="text-white text-4xl md:text-6xl font-bold mb-5">
            خطوات بسيطة لمغامرة لا تُنسى
          </h1>
          <p className="text-white/70 text-base md:text-lg leading-relaxed">
            اختر رحلتك، أدخل بياناتك، وادفع بأمان. استمتع بتجربة حجز سلسة.
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
          <div className="bg-white rounded-3xl shadow-lg p-8 md:p-10" dir="rtl">
            {/* Step 1: Trip selection */}
            {step === 1 && (
              <div className="space-y-8">
                <h2 className="text-text-dark text-2xl font-bold">
                  اختر رحلتك
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
                    لا توجد رحلات متاحة حالياً.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-h-[500px] overflow-y-auto scrollbar-duck">
                    {trips.map((trip) => {
                      const name = getLocalizedText(trip.name, "رحلة")
                      const rawImage = getTripImage(trip.images)
                      const imageUrl = resolveImageUrl(rawImage) ?? placeholderImage
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
                              {(trip.duration ?? 1)}{" "}
                              {(trip.duration ?? 1) === 1 ? "يوم" : "أيام"}
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
                  التالي
                </Button>
              </div>
            )}

            {/* Step 2: Contact info */}
            {step === 2 && (
              <Form {...form}>
                <form className="space-y-8">
                  <h2 className="text-text-dark text-2xl font-bold">
                    بيانات التواصل
                  </h2>
                  {user && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleUseMyData}
                      className="rounded-full gap-2 border-duck-cyan text-duck-cyan hover:bg-duck-cyan/10"
                    >
                      <User className="w-4 h-4" />
                      استخدم بياناتي
                    </Button>
                  )}
                  <FormField
                    control={form.control}
                    name="full_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-text-dark font-medium">
                          الاسم الكامل <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="مثال: أحمد محمد"
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
                            رقم الهاتف <span className="text-red-500">*</span>
                          </FormLabel>
                          <FormControl>
                            <div className="flex flex-wrap gap-3">
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
                                  +20 {prefix}
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
                            الأرقام الثمانية
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
                  <div className="flex gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setStep(1)}
                      className="rounded-full border-text-dark"
                    >
                      <ChevronLeft className="w-4 h-4 ms-1" />
                      السابق
                    </Button>
                    <Button
                      type="button"
                      onClick={() => {
                        form.trigger().then((ok) => ok && setStep(3))
                      }}
                      className="bg-duck-yellow text-duck-navy rounded-full px-10 py-3 font-medium hover:bg-duck-yellow-hover"
                    >
                      التالي
                    </Button>
                  </div>
                </form>
              </Form>
            )}

            {/* Step 3: Review & pay */}
            {step === 3 && selectedTrip && (
              <div className="space-y-8">
                <h2 className="text-text-dark text-2xl font-bold">
                  تأكيد الحجز
                </h2>
                <div className="bg-off-white rounded-2xl p-6 space-y-4">
                  <div className="flex justify-between items-start">
                    <span className="text-text-muted">الرحلة</span>
                    <span className="font-medium text-text-dark text-left">
                      {getLocalizedText(selectedTrip.name, "رحلة")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">المدة</span>
                    <span>
                      {(selectedTrip.duration ?? 1)}{" "}
                      {(selectedTrip.duration ?? 1) === 1 ? "يوم" : "أيام"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">المبلغ</span>
                    <span className="font-bold text-duck-cyan">
                      {formatCurrency(selectedTrip.price, selectedTrip.currency)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">الاسم</span>
                    <span>{form.watch("full_name")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">الهاتف</span>
                    <span dir="ltr">
                      +20
                      {(form.watch("phone_prefix") || "010").replace(/^0/, "")}
                      {form.watch("phone_suffix")}
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
                        السابق
                      </Button>
                      <Button
                        type="submit"
                        disabled={submitLoading}
                        className="bg-duck-yellow text-duck-navy rounded-full px-10 py-3 font-medium hover:bg-duck-yellow-hover"
                      >
                        {submitLoading ? "جاري التحميل..." : "متابعة للدفع"}
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
