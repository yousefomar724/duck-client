/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import useEmblaCarousel from "embla-carousel-react"
import { useCallback, useState, useEffect, useRef } from "react"
import Image from "next/image"
import Link from "next/link"
import { ChevronLeft, ChevronRight, Clock, Users } from "lucide-react"
import { useTranslations, useLocale } from "next-intl"
import { getTrips } from "@/lib/api/trips"
import type { Trip } from "@/lib/types"
import { getTripImage, getTripImages, resolveImageUrl } from "@/lib/image-utils"
import { formatCurrency } from "@/lib/constants"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

export default function OffersSection() {
  const t = useTranslations("offers")
  const locale = useLocale()

  const getLocalizedText = (value: any, fallback = "") =>
    typeof value === "string"
      ? value
      : value?.[locale] || value?.ar || value?.en || fallback

  const [trips, setTrips] = useState<Trip[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Dialog state
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null)
  const [dialogCarouselApi, setDialogCarouselApi] =
    useState<CarouselApi | null>(null)
  const [dialogCarouselIndex, setDialogCarouselIndex] = useState(0)
  const dialogCarouselApiRef = useRef<CarouselApi | null>(null)

  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    align: "center",
    direction: locale === "ar" ? "rtl" : "ltr",
    containScroll: "trimSnaps",
  })

  const [prevBtnDisabled, setPrevBtnDisabled] = useState(true)
  const [nextBtnDisabled, setNextBtnDisabled] = useState(true)
  const [selectedIndex, setSelectedIndex] = useState(0)

  useEffect(() => {
    let cancelled = false
    async function fetchTrips() {
      setLoading(true)
      setError(null)
      const { data, error: err } = await getTrips(locale)
      if (cancelled) return
      setLoading(false)
      if (err) {
        setError(err)
        return
      }
      setTrips(data ?? [])
    }
    fetchTrips()
    return () => {
      cancelled = true
    }
  }, [])

  const scrollPrev = useCallback(
    () => emblaApi && emblaApi.scrollPrev(),
    [emblaApi],
  )
  const scrollNext = useCallback(
    () => emblaApi && emblaApi.scrollNext(),
    [emblaApi],
  )

  const onSelect = useCallback((emblaApi: any) => {
    setSelectedIndex(emblaApi.selectedScrollSnap())
    setPrevBtnDisabled(!emblaApi.canScrollPrev())
    setNextBtnDisabled(!emblaApi.canScrollNext())
  }, [])

  useEffect(() => {
    if (!emblaApi) return
    setTimeout(() => {
      onSelect(emblaApi)
    }, 100)
    emblaApi.on("select", onSelect)
    emblaApi.on("reInit", onSelect)
  }, [emblaApi, onSelect])

  // Dialog carousel effects (same pattern as ResortsSection)
  useEffect(() => {
    dialogCarouselApiRef.current = dialogCarouselApi
  }, [dialogCarouselApi])

  useEffect(() => {
    if (!dialogCarouselApi) return
    const handler = () =>
      setDialogCarouselIndex(dialogCarouselApi.selectedScrollSnap())
    dialogCarouselApi.on("select", handler)
    queueMicrotask(() =>
      setDialogCarouselIndex(dialogCarouselApi.selectedScrollSnap()),
    )
    return () => {
      dialogCarouselApi.off("select", handler)
    }
  }, [dialogCarouselApi])

  useEffect(() => {
    if (!selectedTrip || !dialogCarouselApi) return
    let cancelled = false
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!cancelled) dialogCarouselApi.reInit()
      })
    })
    return () => {
      cancelled = true
      cancelAnimationFrame(id)
    }
  }, [selectedTrip, dialogCarouselApi])

  const placeholderImage = "/offer.webp"

  // Dialog computed values
  const isDialogOpen = selectedTrip !== null
  const selectedTripName = getLocalizedText(
    selectedTrip?.name,
    t("defaultName"),
  )
  const selectedTripDescription = getLocalizedText(selectedTrip?.description)

  const dialogRawImages = selectedTrip ? getTripImages(selectedTrip.images) : []
  const dialogFallbackImage = selectedTrip
    ? getTripImage(selectedTrip.images)
    : null
  const dialogImageUrls =
    dialogRawImages.length > 0
      ? dialogRawImages
          .map((raw) => resolveImageUrl(raw) ?? placeholderImage)
          .filter(Boolean)
      : [resolveImageUrl(dialogFallbackImage) ?? placeholderImage].filter(
          Boolean,
        )
  const dialogDisplayUrls =
    dialogImageUrls.length > 0 ? dialogImageUrls : [placeholderImage]
  const dialogHasMultipleImages = dialogDisplayUrls.length > 1

  const handleDialogClose = useCallback((open: boolean) => {
    if (!open) {
      dialogCarouselApiRef.current?.scrollTo(0)
      setSelectedTrip(null)
    }
  }, [])

  const renderDurationUnit = (duration: number) =>
    duration === 1 ? t("hour") : t("hours")

  return (
    <section id="experiences" className="bg-off-white py-20 overflow-hidden">
      {/* Header */}
      <div className="text-center mb-12 max-w-[1920px] mx-auto px-4 md:px-10">
        <span className="text-duck-cyan text-base block mb-3">
          {t("subtitle")}
        </span>
        <h2 className="text-text-dark text-4xl md:text-5xl font-bold">
          {t("title")}
        </h2>
        <p className="text-text-body mt-4 max-w-2xl mx-auto">
          {t("description")}
        </p>
      </div>

      {/* Carousel */}
      <div className="relative mb-12" dir={locale === "ar" ? "rtl" : "ltr"}>
        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex gap-6 touch-pan-y py-10">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="flex-[0_0_90%] md:max-w-280 min-w-0 md:h-[500px] rounded-2xl overflow-hidden shadow-[0_4px_30px_rgba(0,0,0,0.06)] bg-white flex flex-col md:flex-row animate-pulse first:ms-6"
                />
              ))
            ) : error ? (
              <div className="flex-[0_0_100%] min-w-0 flex justify-center py-12 first:ms-6">
                <p className="text-text-body text-center">
                  {t("errorLoading")}
                </p>
              </div>
            ) : trips.length === 0 ? (
              <div className="flex-[0_0_100%] min-w-0 flex justify-center py-12 first:ms-6">
                <p className="text-text-body text-center">{t("noTrips")}</p>
              </div>
            ) : (
              trips.map((trip) => {
                const tripName = getLocalizedText(trip.name, t("defaultName"))
                const tripDescription = getLocalizedText(trip.description)
                const rawImages = getTripImages(trip.images)
                const fallbackImage = getTripImage(trip.images)
                const imageUrls =
                  rawImages.length > 0
                    ? rawImages
                        .map((raw) => resolveImageUrl(raw) ?? placeholderImage)
                        .filter(Boolean)
                    : [
                        resolveImageUrl(fallbackImage) ?? placeholderImage,
                      ].filter(Boolean)
                const displayUrls =
                  imageUrls.length > 0 ? imageUrls : [placeholderImage]
                const hasMultipleImages = displayUrls.length > 1
                const supplierName =
                  typeof trip.supplier?.name === "string"
                    ? trip.supplier?.name
                    : trip.supplier?.name?.ar ||
                      trip.supplier?.name?.en ||
                      "Unknown Supplier"
                const duration = trip.duration ?? 1

                return (
                  <div
                    key={trip.id}
                    className="flex-[0_0_90%] md:max-w-280 min-w-0 relative md:h-[500px] rounded-2xl overflow-hidden shadow-[0_4px_30px_rgba(0,0,0,0.06)] bg-white flex flex-col md:flex-row first:ms-6 group"
                  >
                    {/* Image Side */}
                    <div
                      dir="ltr"
                      className="w-full md:w-2/3 relative h-72 md:h-full overflow-hidden **:data-[slot=carousel-content]:h-full"
                    >
                      <Carousel
                        opts={{
                          align: "start",
                          loop: true,
                          direction: "ltr",
                        }}
                        className="h-full w-full relative"
                      >
                        <CarouselContent className="h-full ms-0 min-h-full">
                          {displayUrls.map((imageUrl, i) => (
                            <CarouselItem key={i} className="h-full ps-0">
                              <div className="relative h-full w-full">
                                <Image
                                  src={imageUrl}
                                  alt={`${tripName} - ${t("imageAlt", { index: i + 1 })}`}
                                  fill
                                  className="object-cover"
                                  unoptimized={imageUrl.startsWith("http")}
                                />
                              </div>
                            </CarouselItem>
                          ))}
                        </CarouselContent>
                        {hasMultipleImages && (
                          <>
                            <CarouselPrevious
                              variant="ghost"
                              size="icon"
                              className="absolute top-1/2 start-3 -translate-y-1/2 z-10 size-8 rounded-full bg-black/40 backdrop-blur-sm border-0 text-white/80 hover:text-white hover:bg-black/60"
                              aria-label={t("prevImage")}
                            >
                              <ChevronLeft className="size-4" />
                            </CarouselPrevious>
                            <CarouselNext
                              variant="ghost"
                              size="icon"
                              className="absolute top-1/2 end-3 -translate-y-1/2 z-10 size-8 rounded-full bg-black/40 backdrop-blur-sm border-0 text-white/80 hover:text-white hover:bg-black/60"
                              aria-label={t("nextImage")}
                            >
                              <ChevronRight className="size-4" />
                            </CarouselNext>
                          </>
                        )}
                      </Carousel>
                      {/* Tour/Trip badge */}
                      <span
                        className={cn(
                          "absolute top-3 start-3 z-10 text-xs font-medium px-2.5 py-1 rounded-full",
                          trip.is_tour
                            ? "bg-purple-100 text-purple-700"
                            : "bg-blue-100 text-blue-700",
                        )}
                      >
                        {trip.is_tour ? t("tour") : t("trip")}
                      </span>
                    </div>

                    {/* Text Side */}
                    <div className="w-full md:w-1/3 p-10 flex flex-col justify-between items-start text-right">
                      <div>
                        {supplierName && (
                          <div className="flex items-center gap-2 mb-2">
                            {trip.supplier?.icon &&
                              resolveImageUrl(trip.supplier.icon) && (
                                // eslint-disable-next-line @next/next/no-img-element -- API supplier icon URL may be external
                                <img
                                  src={
                                    resolveImageUrl(trip.supplier.icon) ?? ""
                                  }
                                  alt=""
                                  className="w-6 h-6 rounded-full object-cover"
                                />
                              )}
                            <span className="text-text-muted text-sm">
                              {supplierName}
                            </span>
                          </div>
                        )}
                        <h3 className="text-2xl md:text-3xl font-bold text-text-dark mb-4">
                          {tripName}
                        </h3>
                        <p className="text-text-body leading-relaxed mb-4 line-clamp-4">
                          {tripDescription}
                        </p>
                        <p className="text-duck-cyan font-semibold text-lg">
                          {formatCurrency(trip.price, trip.currency)}
                          {trip.is_tour && (
                            <span className="text-sm font-normal text-duck-cyan/70">
                              {" "}
                              {t("perHour")}
                            </span>
                          )}
                        </p>
                        <p className="text-text-muted text-sm mt-1">
                          {trip.is_tour
                            ? t("minDuration", {
                                count: duration,
                                unit: renderDurationUnit(duration),
                              })
                            : t("fixedDuration", {
                                count: duration,
                                unit: renderDurationUnit(duration),
                              })}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <Link
                          href={`/book?trip=${trip.id}`}
                          className="bg-duck-yellow text-duck-navy px-7 py-3 rounded-full font-medium hover:bg-duck-yellow/80 transition-colors"
                        >
                          {t("bookNow")}
                        </Link>
                        <button
                          type="button"
                          onClick={() => setSelectedTrip(trip)}
                          className="border border-text-dark text-text-dark px-5 py-3 rounded-full font-medium hover:bg-text-dark hover:text-white transition-colors text-sm"
                        >
                          {t("details")}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* Controls */}
      {!loading && !error && trips.length > 0 && (
        <div
          className="flex items-center justify-center gap-4 max-w-[1920px] mx-auto px-4 md:px-10 text-text-dark"
          dir="ltr"
        >
          <button
            onClick={scrollPrev}
            disabled={prevBtnDisabled}
            className="disabled:opacity-30 hover:scale-110 transition-transform"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <div className="flex items-center gap-2 text-sm font-medium">
            <span>{selectedIndex + 1}</span>
            <span className="mx-3 w-10 h-0.5 bg-gray-500" />
            <span>{trips.length}</span>
          </div>

          <button
            onClick={scrollNext}
            disabled={nextBtnDisabled}
            className="disabled:opacity-30 hover:scale-110 transition-transform"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      )}

      {/* Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent
          className={cn(
            "sm:max-w-2xl! p-0! overflow-hidden text-right",
            "bg-white! text-text-dark border-none",
          )}
        >
          {/* Image carousel */}
          <div
            dir="ltr"
            className="relative w-full aspect-4/3 sm:aspect-16/10 shrink-0 overflow-hidden **:data-[slot=carousel-content]:h-full"
          >
            <Carousel
              setApi={setDialogCarouselApi}
              opts={{ align: "start", loop: true, direction: "ltr" }}
              className="h-full w-full relative"
            >
              <CarouselContent className="h-full ms-0 min-h-full">
                {dialogDisplayUrls.map((imageUrl, i) => (
                  <CarouselItem key={i} className="h-full ps-0">
                    <div className="relative h-full w-full">
                      <Image
                        src={imageUrl}
                        alt={`${selectedTripName} - ${t("imageAlt", { index: i + 1 })}`}
                        fill
                        className="object-cover"
                        unoptimized={imageUrl.startsWith("http")}
                      />
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              {dialogHasMultipleImages && (
                <>
                  <CarouselPrevious
                    variant="ghost"
                    size="icon"
                    className="absolute top-1/2 start-3 -translate-y-1/2 z-10 size-8 rounded-full bg-black/40 backdrop-blur-sm border-0 text-white/80 hover:text-white hover:bg-black/60"
                    aria-label={t("prevImage")}
                  >
                    <ChevronLeft className="size-4" />
                  </CarouselPrevious>
                  <CarouselNext
                    variant="ghost"
                    size="icon"
                    className="absolute top-1/2 end-3 -translate-y-1/2 z-10 size-8 rounded-full bg-black/40 backdrop-blur-sm border-0 text-white/80 hover:text-white hover:bg-black/60"
                    aria-label={t("nextImage")}
                  >
                    <ChevronRight className="size-4" />
                  </CarouselNext>
                </>
              )}
            </Carousel>
            {dialogHasMultipleImages && (
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 flex gap-1.5">
                {dialogDisplayUrls.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => dialogCarouselApi?.scrollTo(i)}
                    className={cn(
                      "w-2 h-2 rounded-full transition-colors cursor-pointer",
                      i === dialogCarouselIndex
                        ? "bg-white"
                        : "bg-white/50 hover:bg-white/70",
                    )}
                    aria-label={t("imageAlt", { index: i + 1 })}
                    aria-current={
                      i === dialogCarouselIndex ? "true" : undefined
                    }
                  />
                ))}
              </div>
            )}
            <div className="absolute inset-0 bg-linear-to-t from-white/70 via-transparent to-transparent pointer-events-none" />
          </div>

          {/* Content section */}
          <div className="flex flex-col min-h-0 flex-1">
            <div className="px-4 pt-4 pb-6 flex flex-col gap-3">
              {/* Title */}
              <DialogHeader className="mb-0">
                <DialogTitle className="text-text-dark text-xl font-bold leading-tight">
                  {selectedTripName}
                </DialogTitle>
              </DialogHeader>

              {/* Badges */}
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "text-xs font-medium px-2.5 py-1 rounded-full",
                    selectedTrip?.is_tour
                      ? "bg-purple-100 text-purple-700"
                      : "bg-blue-100 text-blue-700",
                  )}
                >
                  {selectedTrip?.is_tour ? t("tour") : t("trip")}
                </span>
                {selectedTrip?.refundable === true && (
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-green-100 text-green-700">
                    {t("refundable")}
                  </span>
                )}
                {selectedTrip?.refundable === false && (
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-red-100 text-red-700">
                    {t("nonRefundable")}
                  </span>
                )}
              </div>

              {/* Supplier */}
              {selectedTrip?.supplier && (
                <div className="flex items-center gap-2">
                  {selectedTrip.supplier.icon &&
                    resolveImageUrl(selectedTrip.supplier.icon) && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={resolveImageUrl(selectedTrip.supplier.icon) ?? ""}
                        alt=""
                        className="w-5 h-5 rounded-full object-cover"
                      />
                    )}
                  <span className="text-text-muted text-sm">
                    {getLocalizedText(selectedTrip.supplier.name)}
                  </span>
                </div>
              )}

              {/* Price + Duration */}
              <div className="flex items-center gap-4 text-sm">
                <span className="text-duck-cyan font-semibold">
                  {selectedTrip &&
                    formatCurrency(selectedTrip.price, selectedTrip.currency)}
                  {selectedTrip?.is_tour && (
                    <span className="font-normal text-duck-cyan/70">
                      {" "}
                      {t("perHour")}
                    </span>
                  )}
                </span>
                <span className="text-text-muted flex items-center gap-1">
                  <Clock className="size-3.5" />
                  {selectedTrip?.is_tour
                    ? t("minDuration", {
                        count: selectedTrip.duration ?? 1,
                        unit: renderDurationUnit(selectedTrip.duration ?? 1),
                      })
                    : t("fixedDuration", {
                        count: selectedTrip?.duration ?? 1,
                        unit: renderDurationUnit(selectedTrip?.duration ?? 1),
                      })}
                </span>
              </div>

              {/* Max guests */}
              {selectedTrip?.max_guests != null && (
                <div className="flex items-center gap-1.5 text-text-muted text-xs">
                  <Users className="size-3.5" />
                  <span>
                    {t("maxGuests", { count: selectedTrip.max_guests })}
                  </span>
                </div>
              )}

              {/* Description */}
              <div className="max-h-30 overflow-y-auto overscroll-contain scrollbar-duck rounded-lg">
                <DialogDescription className="text-text-body text-sm leading-relaxed whitespace-pre-line ps-1">
                  {selectedTripDescription || t("noDescription")}
                </DialogDescription>
              </div>

              {/* Itinerary */}
              {selectedTrip?.itinerary && (
                <div>
                  <h4 className="text-sm font-semibold text-text-dark mb-1">
                    {t("itinerary")}
                  </h4>
                  {Array.isArray(selectedTrip.itinerary) ? (
                    <ol className="list-decimal list-inside text-text-body text-sm space-y-1 ps-1">
                      {selectedTrip.itinerary.map((step, i) => (
                        <li key={i}>{getLocalizedText(step)}</li>
                      ))}
                    </ol>
                  ) : (
                    <p className="text-text-body text-sm ps-1">
                      {getLocalizedText(selectedTrip.itinerary)}
                    </p>
                  )}
                </div>
              )}

              {/* Destinations */}
              {selectedTrip?.destinations &&
                selectedTrip.destinations.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-text-dark mb-1">
                      {t("destinations")}
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedTrip.destinations.map((dest) => (
                        <span
                          key={dest.id}
                          className="px-3 py-1 rounded-full bg-gray-100 text-text-body text-xs font-medium"
                        >
                          {getLocalizedText(dest.name)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

              {/* Cancellation Policy */}
              {selectedTrip?.cancelation_policy && (
                <div>
                  <h4 className="text-sm font-semibold text-text-dark mb-1">
                    {t("cancelationPolicy")}
                  </h4>
                  <p className="text-text-body text-sm ps-1">
                    {getLocalizedText(selectedTrip.cancelation_policy)}
                  </p>
                </div>
              )}

              {/* Book Now CTA */}
              <Link
                href={`/book?trip=${selectedTrip?.id}`}
                className="bg-duck-yellow text-duck-navy px-7 py-3 rounded-full font-medium hover:bg-duck-yellow/80 transition-colors text-center mt-2"
              >
                {t("bookNow")}
              </Link>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  )
}
