"use client"

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
  startTransition,
} from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import {
  ArrowRight,
  CheckCircle,
  Copy,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  RefreshCw,
} from "lucide-react"
import { format, parseISO } from "date-fns"
import { arSA, enUS } from "date-fns/locale"
import { useLocale, useTranslations } from "next-intl"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  type SuccessCache,
  readLastBookingContext,
} from "@/lib/booking-success-cache"
import { buildGoogleMapsUrl } from "@/lib/maps"
import { resolveImageUrl } from "@/lib/image-utils"
import { formatCurrency } from "@/lib/constants"
import { useToast } from "@/lib/stores/toast-store"
import { cn } from "@/lib/utils"

const OFFICE_MAPS_URL = "https://maps.app.goo.gl/FPt8JJ8VgaTTzBir6"
const SUPPORT_PHONE_DISPLAY = "+20 15 5006 1006"
const SUPPORT_PHONE_TEL = "tel:+201550061006"
const SUPPORT_EMAIL = "mailto:duck.aswan@gmail.com"
const SUPPORT_WHATSAPP_NUMBER = "201550061006"

function getLocalizedBilingual(
  value: { ar: string; en: string } | undefined,
  locale: string,
  fallback = "",
) {
  if (!value) return fallback
  if (typeof value === "string") return value
  return (
    (locale === "en" ? value.en : value.ar) || value.ar || value.en || fallback
  )
}

function BookingSuccessContent() {
  const t = useTranslations("bookingSuccess")
  const searchParams = useSearchParams()
  const orderRef = searchParams.get("order_ref")?.trim() ?? ""
  const locale = useLocale()
  const { addToast } = useToast()
  const [cache, setCache] = useState<SuccessCache | null>(null)

  useEffect(() => {
    const c = readLastBookingContext()
    startTransition(() => {
      if (c && orderRef && c.order_ref === orderRef) {
        setCache(c)
      } else {
        setCache(null)
      }
    })
  }, [orderRef])

  const validCache = useMemo(
    () => (cache && orderRef && cache.order_ref === orderRef ? cache : null),
    [cache, orderRef],
  )

  const dateLocale = locale === "ar" ? arSA : enUS

  const formatBookingDate = (iso: string) => {
    try {
      return format(parseISO(iso), "PPP", { locale: dateLocale })
    } catch {
      return iso
    }
  }

  const copyToClipboard = useCallback(
    async (text: string, messageKey: "referenceCopied" | "linkCopied") => {
      try {
        if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(text)
          addToast(t(messageKey), "success")
        } else {
          window.prompt(t("copyMapsLink"), text)
        }
      } catch {
        window.prompt(t("copyMapsLink"), text)
      }
    },
    [addToast, t],
  )

  const tripName = validCache
    ? getLocalizedBilingual(validCache.trip.name, locale, "")
    : ""

  const policyText = validCache?.trip.cancelation_policy
    ? getLocalizedBilingual(
        validCache.trip.cancelation_policy,
        locale,
        t("genericRefundPolicy"),
      )
    : null

  const whatsappHref = `https://wa.me/${SUPPORT_WHATSAPP_NUMBER}?text=${encodeURIComponent(
    t("whatsappPrefill", { ref: orderRef || "—" }),
  )}`

  const destinations = validCache?.trip.destinations ?? []
  const showOfficeOnly = !validCache || destinations.length === 0

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-linear-to-br from-duck-cyan/5 to-duck-yellow/5 py-10">
      <div className="w-full max-w-2xl space-y-6">
        <Card className="border-duck-cyan/30 bg-white shadow-xl">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle className="w-16 h-16 text-duck-cyan" />
            </div>
            <CardTitle className="text-3xl text-duck-navy">{t("title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center space-y-2">
              <p className="text-text-dark font-medium">{t("thankYou")}</p>
              <p className="text-text-body text-sm">{t("description")}</p>
            </div>

            {orderRef ? (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-center gap-2">
                <span className="text-sm text-text-muted">{t("bookingReference")}</span>
                <div className="inline-flex items-center justify-center gap-2 flex-wrap">
                  <code
                    className="text-xs sm:text-sm bg-off-white border border-duck-cyan/20 rounded-full px-3 py-1.5 text-duck-navy break-all"
                    dir="ltr"
                  >
                    {orderRef}
                  </code>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-full border-duck-navy/30"
                    onClick={() => void copyToClipboard(orderRef, "referenceCopied")}
                  >
                    <Copy className="w-3.5 h-3.5 me-1" />
                    {t("copyReference")}
                  </Button>
                </div>
              </div>
            ) : null}

            {validCache ? (
              <div className="bg-off-white rounded-lg p-4 border border-duck-cyan/20 space-y-3">
                <h3 className="font-semibold text-duck-navy">{t("tripSummary")}</h3>
                {tripName ? (
                  <p className="text-sm text-text-dark font-medium">{tripName}</p>
                ) : null}
                <div className="grid gap-2 text-sm text-text-body">
                  <div className="flex flex-wrap justify-between gap-2">
                    <span className="text-text-muted">{t("bookingDate")}</span>
                    <span>
                      {formatBookingDate(validCache.summary.booking_date)}
                    </span>
                  </div>
                  <div className="flex flex-wrap justify-between gap-2">
                    <span className="text-text-muted">{t("guests")}</span>
                    <span>
                      {validCache.summary.local_guests > 0
                        ? t("localGuests", {
                            count: validCache.summary.local_guests,
                          })
                        : null}
                      {validCache.summary.local_guests > 0 &&
                      validCache.summary.foreigner_guests > 0
                        ? " · "
                        : null}
                      {validCache.summary.foreigner_guests > 0
                        ? t("foreignerGuests", {
                            count: validCache.summary.foreigner_guests,
                          })
                        : null}
                      {validCache.summary.local_guests === 0 &&
                      validCache.summary.foreigner_guests === 0
                        ? `×${validCache.summary.quantity}`
                        : null}
                    </span>
                  </div>
                  <div className="flex flex-wrap justify-between gap-2 font-medium text-duck-cyan">
                    <span className="text-text-muted font-normal">
                      {t("total")}
                    </span>
                    <span>
                      {formatCurrency(
                        validCache.summary.amount,
                        validCache.trip.currency,
                      )}
                    </span>
                  </div>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="border-duck-cyan/20 bg-white/95 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg text-duck-navy flex items-center gap-2">
              <MapPin className="w-5 h-5 text-duck-cyan" />
              {t("destinations")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {showOfficeOnly ? (
              <div className="rounded-lg border border-duck-cyan/15 bg-off-white p-4">
                <p className="font-medium text-duck-navy mb-1">
                  {t("noDestinationFallbackTitle")}
                </p>
                <p className="text-sm text-text-body mb-3">
                  {t("noDestinationFallbackBody")}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    asChild
                    size="sm"
                    className="bg-duck-yellow text-duck-navy hover:bg-duck-yellow-hover rounded-full"
                  >
                    <a
                      href={OFFICE_MAPS_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {t("openInMaps")}
                    </a>
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="rounded-full border-duck-navy/30"
                    onClick={() => void copyToClipboard(OFFICE_MAPS_URL, "linkCopied")}
                  >
                    <Copy className="w-3.5 h-3.5 me-1" />
                    {t("copyMapsLink")}
                  </Button>
                </div>
              </div>
            ) : (
              <ul className="space-y-4">
                {destinations.map((dest) => {
                  const name = getLocalizedBilingual(dest.name, locale, "—")
                  const img = resolveImageUrl(dest.image)
                  const hasCoords =
                    typeof dest.lat === "number" &&
                    typeof dest.lng === "number" &&
                    !Number.isNaN(dest.lat) &&
                    !Number.isNaN(dest.lng)
                  const mapUrl = hasCoords
                    ? buildGoogleMapsUrl(dest.lat as number, dest.lng as number)
                    : null

                  return (
                    <li
                      key={dest.id}
                      className="rounded-lg border border-duck-cyan/15 bg-off-white p-4"
                    >
                      <div
                        className={cn(
                          "flex gap-3",
                          !img ? "items-start" : "items-center",
                        )}
                      >
                        {img ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={img}
                            alt=""
                            className="w-20 h-20 rounded-lg object-cover shrink-0 border border-white/50"
                          />
                        ) : null}
                        <div className="min-w-0 flex-1 space-y-1">
                          <p className="font-medium text-duck-navy">{name}</p>
                          {dest.operating_hours ? (
                            <p className="text-xs text-text-muted">
                              {dest.operating_hours}
                            </p>
                          ) : null}
                          {hasCoords && mapUrl ? (
                            <div className="flex flex-wrap gap-2 pt-2">
                              <Button
                                asChild
                                size="sm"
                                className="bg-duck-yellow text-duck-navy hover:bg-duck-yellow-hover rounded-full"
                              >
                                <a
                                  href={mapUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  {t("openInMaps")}
                                </a>
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="rounded-full border-duck-navy/30"
                                onClick={() =>
                                  void copyToClipboard(mapUrl, "linkCopied")
                                }
                              >
                                <Copy className="w-3.5 h-3.5 me-1" />
                                {t("copyMapsLink")}
                              </Button>
                            </div>
                          ) : (
                            <p className="text-sm text-text-body pt-1">
                              {t("mapsUnavailable")}
                            </p>
                          )}
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="border-duck-cyan/20 bg-white/95 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg text-duck-navy flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-duck-cyan" />
              {t("refundPolicy")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-text-body">
            <p>{policyText || t("genericRefundPolicy")}</p>
            <p>{t("cancel24hRule")}</p>
            {validCache ? (
              <p className="text-text-dark">
                {validCache.trip.refundable
                  ? t("refundable")
                  : t("nonRefundable")}
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card className="border-duck-cyan/20 bg-white/95 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg text-duck-navy">{t("support")}</CardTitle>
            <p className="text-sm text-text-muted font-normal">
              {t("supportHours")}
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <a
              href={SUPPORT_PHONE_TEL}
              className="flex items-center gap-3 p-3 rounded-lg border border-duck-cyan/10 hover:bg-off-white transition-colors"
            >
              <Phone className="w-5 h-5 text-duck-cyan shrink-0" />
              <div>
                <p className="text-xs text-text-muted">{t("callUs")}</p>
                <p className="font-medium text-duck-navy" dir="ltr">
                  {SUPPORT_PHONE_DISPLAY}
                </p>
              </div>
            </a>
            <a
              href={SUPPORT_EMAIL}
              className="flex items-center gap-3 p-3 rounded-lg border border-duck-cyan/10 hover:bg-off-white transition-colors"
            >
              <Mail className="w-5 h-5 text-duck-cyan shrink-0" />
              <div>
                <p className="text-xs text-text-muted">{t("emailUs")}</p>
                <p className="font-medium text-duck-navy break-all">
                  duck.aswan@gmail.com
                </p>
              </div>
            </a>
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 rounded-lg border border-duck-cyan/10 hover:bg-off-white transition-colors"
            >
              <MessageCircle className="w-5 h-5 text-duck-cyan shrink-0" />
              <div>
                <p className="text-xs text-text-muted">{t("whatsappUs")}</p>
                <p className="font-medium text-duck-navy">WhatsApp</p>
              </div>
            </a>
          </CardContent>
        </Card>

        <Card className="border-duck-cyan/20 bg-white/95 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg text-duck-navy">{t("goodToKnow")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-text-body list-disc list-inside ps-1">
              <li>{t("tipArriveEarly")}</li>
              <li>{t("tipBringSunscreen")}</li>
              <li>{t("tipBringSwimwear")}</li>
              <li>{t("tipLifeJacket")}</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="border-duck-cyan/30 bg-white shadow-xl">
          <CardContent className="pt-6 space-y-6">
            <div className="bg-off-white rounded-lg p-4 border border-duck-cyan/20 space-y-3">
              <h3 className="font-semibold text-duck-navy">{t("whatNext")}</h3>
              <ul className="space-y-2 text-sm text-text-body">
                <li className="flex gap-2">
                  <span className="text-duck-cyan">✓</span>
                  <span>{t("step1")}</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-duck-cyan">✓</span>
                  <span>{t("step2")}</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-duck-cyan">✓</span>
                  <span>{t("step3")}</span>
                </li>
              </ul>
            </div>

            <Separator className="bg-duck-cyan/20" />

            <div className="space-y-3">
              <Button
                asChild
                className="w-full bg-duck-yellow text-duck-navy hover:bg-duck-yellow-hover font-medium rounded-full"
              >
                <Link href="/">
                  {t("backToHome")}
                  <ArrowRight className="w-4 h-4 ms-1 rtl:rotate-180" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="w-full border-duck-navy/30 text-duck-navy hover:bg-duck-navy/5 rounded-full"
              >
                <Link href="/book">{t("bookAnother")}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function BookingSuccessFallback() {
  const t = useTranslations("bookingSuccess")
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-linear-to-br from-duck-cyan/5 to-duck-yellow/5">
      <p className="text-text-muted text-sm">{t("loading")}</p>
    </div>
  )
}

export default function BookingSuccessPage() {
  return (
    <Suspense fallback={<BookingSuccessFallback />}>
      <BookingSuccessContent />
    </Suspense>
  )
}
