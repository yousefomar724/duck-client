/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import useEmblaCarousel from "embla-carousel-react"
import { useCallback, useState, useEffect, useRef } from "react"
import {
  ImageWithLogoFallback,
  ImgWithLogoFallback,
} from "@/components/shared/image-with-logo-fallback"
import { ChevronLeft, ChevronRight, Clock } from "lucide-react"
import { useTranslations, useLocale } from "next-intl"
import { getDestinations } from "@/lib/api/destinations"
import type { Destination } from "@/lib/types"
import { DUCK_LOGO_PLACEHOLDER, resolveImageUrl } from "@/lib/image-utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel"
import { cn } from "@/lib/utils"
import type { DestinationActivity } from "@/lib/types"
import { useIsMobile } from "@/hooks/use-mobile"

function getDisplayImages(destination: Destination | null): string[] {
  if (!destination) return []
  const primary = destination.image
  const extras = destination.images ?? []
  return primary ? [primary, ...extras] : extras
}

export default function ResortsSection() {
  const t = useTranslations("resorts")
  const tMap = useTranslations("mapPage")
  const locale = useLocale()
  const isMobile = useIsMobile()
  const activityLabels: Record<string, string> = {
    kayak: tMap("filters.kayak"),
    sup: tMap("filters.sup"),
    waterbike: tMap("filters.waterbike"),
    water_cycle: tMap("filters.waterbike"),
  }

  const getLocalizedText = (value: any, fallback = "") =>
    typeof value === "string"
      ? value
      : value?.[locale] || value?.ar || value?.en || fallback

  const [destinations, setDestinations] = useState<Destination[]>([])
  const [selectedDestination, setSelectedDestination] =
    useState<Destination | null>(null)
  const [dialogCarouselApi, setDialogCarouselApi] =
    useState<CarouselApi | null>(null)
  const [dialogCarouselIndex, setDialogCarouselIndex] = useState(0)
  const dialogCarouselApiRef = useRef<CarouselApi | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
    async function fetchDestinations() {
      setLoading(true)
      setError(null)
      const { data, error: err } = await getDestinations(locale, "active")
      if (cancelled) return
      setLoading(false)
      if (err) {
        setError(err)
        return
      }
      setDestinations(data ?? [])
    }
    fetchDestinations()
    return () => {
      cancelled = true
    }
  }, [locale])

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
    if (!selectedDestination || !dialogCarouselApi) return
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
  }, [selectedDestination, dialogCarouselApi])

  const placeholderImage = DUCK_LOGO_PLACEHOLDER
  const selectedDestinationName = getLocalizedText(
    selectedDestination?.name,
    t("defaultName"),
  )
  const selectedDestinationDescription = getLocalizedText(
    selectedDestination?.description,
  )
  const dialogImages = getDisplayImages(selectedDestination)
  const displayImages =
    dialogImages.length > 0
      ? dialogImages.map((src) => resolveImageUrl(src) ?? placeholderImage)
      : [placeholderImage]
  const hasMultipleImages = displayImages.length > 1
  const isDialogOpen = selectedDestination !== null

  const handleDialogClose = useCallback((open: boolean) => {
    if (!open) {
      dialogCarouselApiRef.current?.scrollTo(0)
      setSelectedDestination(null)
    }
  }, [])

  return (
    <section id="locations" className="bg-dark-bg py-20 overflow-hidden">
      {/* Header */}
      <div className="text-center mb-12 max-w-[1920px] mx-auto px-4 md:px-10">
        <span className="text-white/60 text-base block mb-3">
          {t("subtitle")}
        </span>
        <h2 className="text-white text-4xl md:text-5xl font-bold">
          {t("title")}
        </h2>
      </div>

      {/* Carousel */}
      <div className="relative" dir={locale === "ar" ? "rtl" : "ltr"}>
        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex gap-6 touch-pan-y">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="flex-[0_0_280px] md:flex-[0_0_300px] min-w-0 h-[500px] rounded-2xl overflow-hidden bg-white/10 animate-pulse first:ms-6"
                />
              ))
            ) : error ? (
              <div className="flex-[0_0_100%] min-w-0 flex justify-center py-12 first:ms-6">
                <p className="text-white/80 text-center">{t("errorLoading")}</p>
              </div>
            ) : destinations.length === 0 ? (
              <div className="flex-[0_0_100%] min-w-0 flex justify-center py-12 first:ms-6">
                <p className="text-white/80 text-center">
                  {t("noDestinations")}
                </p>
              </div>
            ) : (
              destinations.map((destination) => {
                const destinationName = getLocalizedText(
                  destination.name,
                  t("defaultName"),
                )
                const destinationDescription = getLocalizedText(
                  destination.description,
                )
                const resolvedMain = resolveImageUrl(destination.image)
                const imageUrl = resolvedMain ?? placeholderImage
                const isPlaceholder = !resolvedMain
                const isExternal = imageUrl.startsWith("http")
                const imageObjectClass = isPlaceholder
                  ? "object-contain p-10 sm:p-12"
                  : "object-cover"
                return (
                  <div
                    key={destination.id}
                    onClick={() => setSelectedDestination(destination)}
                    className="flex-[0_0_280px] md:flex-[0_0_300px] min-w-0 relative h-[500px] rounded-2xl overflow-hidden group cursor-pointer first:ms-6"
                  >
                    {isExternal ? (
                      <ImgWithLogoFallback
                        src={imageUrl}
                        alt={destinationName}
                        className={`absolute inset-0 w-full h-full transition-transform duration-500 group-hover:scale-105 ${imageObjectClass}`}
                        fallbackClassName="absolute inset-0 w-full h-full object-contain p-0 transition-transform duration-500 group-hover:scale-105 bg-white"
                      />
                    ) : (
                      <ImageWithLogoFallback
                        src={imageUrl}
                        alt={destinationName}
                        fill
                        className={`transition-transform duration-500 group-hover:scale-105 ${imageObjectClass}`}
                        fallbackClassName="object-contain p-10 sm:p-12"
                        unoptimized={imageUrl.startsWith("http")}
                      />
                    )}

                    {/* Overlay */}
                    <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent" />

                    {/* Top Content */}
                    <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
                      {destination.trip_count != null &&
                        destination.trip_count > 0 && (
                          <span className="bg-duck-cyan-light/90 text-dark-bg text-xs font-medium px-3 py-1.5 rounded-lg backdrop-blur-sm">
                            {t("trips", { count: destination.trip_count })}
                          </span>
                        )}
                    </div>

                    {/* Bottom Content */}
                    <div className="absolute bottom-0 left-0 right-0 p-6 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedDestination(destination)}
                        className="text-duck-cyan text-sm font-medium mb-2 max-md:opacity-100 max-md:translate-y-0 md:opacity-0 transform translate-y-4 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0 hover:underline"
                      >
                        {t("learnMore")}
                      </button>
                      <h3 className="text-white text-2xl font-bold mb-1">
                        {destinationName}
                      </h3>
                      <div className="text-white/70 text-sm line-clamp-2">
                        {destinationDescription}
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
      {!loading && !error && destinations.length > 0 && (
        <div
          className="flex items-center justify-center gap-4 mt-10 text-white"
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
            <span>{destinations.length}</span>
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

      {/* Details (mobile: bottom sheet, desktop: dialog) */}
      {isMobile ? (
        <Sheet open={isDialogOpen} onOpenChange={handleDialogClose}>
          <SheetContent
            side="bottom"
            className={cn(
              "p-0 gap-0 overflow-hidden text-right",
              "bg-duck-navy-deep text-white border-none",
              "rounded-t-2xl max-h-[90vh]",
            )}
          >
            <div className="max-h-[90vh] overflow-y-auto">
              {/* Image carousel - structure matches LocationDetailPopover */}
              <div
                dir="ltr"
                className="relative w-full aspect-2/1 sm:aspect-16/10 shrink-0 overflow-hidden **:data-[slot=carousel-content]:h-full"
              >
                <Carousel
                  setApi={setDialogCarouselApi}
                  opts={{ align: "start", loop: true, direction: "ltr" }}
                  className="h-full w-full relative"
                >
                  <CarouselContent className="h-full ms-0 min-h-full">
                    {displayImages.map((imageUrl, i) => (
                      <CarouselItem key={i} className="h-full ps-0">
                        <div className="relative h-full w-full">
                          <ImageWithLogoFallback
                            src={imageUrl}
                            alt={`${selectedDestinationName} - ${t("imageAlt", { index: i + 1 })}`}
                            fill
                            className="object-cover"
                            fallbackClassName="object-contain p-6 bg-white"
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
                {hasMultipleImages && (
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 flex gap-1.5">
                    {displayImages.map((_, i) => (
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
                <div className="absolute inset-0 bg-linear-to-t from-duck-navy-deep via-transparent to-transparent pointer-events-none" />
              </div>

              {/* Content section */}
              <div className="flex flex-col min-h-0 flex-1 bg-duck-navy-deep text-white">
                <div className="p-4 flex flex-col gap-3">
                  {/* Name + Status badge */}
                  <div className="flex flex-col gap-2">
                    <div className="text-white text-xl font-bold leading-tight">
                      {selectedDestinationName}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {selectedDestination?.public_status === "coming-soon" ? (
                        <span className="w-fit text-xs font-medium px-2.5 py-1 rounded-full bg-duck-yellow/20 text-duck-yellow animate-pulse">
                          {t("comingSoon")}
                        </span>
                      ) : (
                        <span className="w-fit text-xs font-medium px-2.5 py-1 rounded-full bg-duck-cyan/20 text-duck-cyan">
                          {t("availableNow")}
                        </span>
                      )}
                      {selectedDestination?.trip_count != null &&
                        selectedDestination.trip_count > 0 && (
                          <span className="text-sm text-white/70">
                            {t("availableTrips", {
                              count: selectedDestination.trip_count,
                            })}
                          </span>
                        )}
                    </div>
                  </div>

                  {/* Activities */}
                  {selectedDestination?.activities?.length ? (
                    <div className="flex flex-wrap gap-1.5">
                      {selectedDestination.activities.map((activity) => (
                        <span
                          key={activity}
                          className="px-3 py-1 rounded-full bg-white/10 text-white/90 text-xs font-semibold"
                        >
                          {activityLabels[activity as DestinationActivity] ??
                            activity}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  {/* Operating hours */}
                  {selectedDestination?.operating_hours ? (
                    <div className="flex items-center gap-2 text-white/70 text-xs">
                      <Clock className="size-3.5 shrink-0 text-duck-cyan/80" />
                      <span>
                        {t("operatingHours", {
                          hours: selectedDestination.operating_hours,
                        })}
                      </span>
                    </div>
                  ) : null}

                  {/* Description */}
                  <div className="max-h-16 break-all overflow-y-auto overscroll-contain scrollbar-duck rounded-lg">
                    <div className="text-white/80 text-sm leading-relaxed whitespace-pre-line ps-1">
                      {selectedDestinationDescription || t("noDescription")}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
          <DialogContent
            className={cn(
              "sm:max-w-2xl! p-0! overflow-hidden text-right",
              "bg-duck-navy-deep! text-white border-none",
            )}
          >
            {/* Image carousel - structure matches LocationDetailPopover */}
            <div
              dir="ltr"
              className="relative w-full aspect-2/1 sm:aspect-16/10 shrink-0 overflow-hidden **:data-[slot=carousel-content]:h-full"
            >
              <Carousel
                setApi={setDialogCarouselApi}
                opts={{ align: "start", loop: true, direction: "ltr" }}
                className="h-full w-full relative"
              >
                <CarouselContent className="h-full ms-0 min-h-full">
                  {displayImages.map((imageUrl, i) => (
                    <CarouselItem key={i} className="h-full ps-0">
                      <div className="relative h-full w-full">
                        <ImageWithLogoFallback
                          src={imageUrl}
                          alt={`${selectedDestinationName} - ${t("imageAlt", { index: i + 1 })}`}
                          fill
                          className="object-cover"
                          fallbackClassName="object-contain p-6 bg-white"
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
              {hasMultipleImages && (
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 flex gap-1.5">
                  {displayImages.map((_, i) => (
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
              <div className="absolute inset-0 bg-linear-to-t from-duck-navy-deep via-transparent to-transparent pointer-events-none" />
            </div>

            {/* Content section */}
            <div className="flex flex-col min-h-0 flex-1">
              <div className="p-4 flex flex-col gap-3">
                {/* Name + Status badge */}
                <div className="flex flex-col gap-2">
                  <DialogHeader className="mb-0">
                    <DialogTitle className="text-white text-xl font-bold leading-tight">
                      {selectedDestinationName}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="flex flex-wrap items-center gap-2">
                    {selectedDestination?.public_status === "coming-soon" ? (
                      <span className="w-fit text-xs font-medium px-2.5 py-1 rounded-full bg-duck-yellow/20 text-duck-yellow animate-pulse">
                        {t("comingSoon")}
                      </span>
                    ) : (
                      <span className="w-fit text-xs font-medium px-2.5 py-1 rounded-full bg-duck-cyan/20 text-duck-cyan">
                        {t("availableNow")}
                      </span>
                    )}
                    {selectedDestination?.trip_count != null &&
                      selectedDestination.trip_count > 0 && (
                        <span className="text-sm text-white/70">
                          {t("availableTrips", {
                            count: selectedDestination.trip_count,
                          })}
                        </span>
                      )}
                  </div>
                </div>

                {/* Activities */}
                {selectedDestination?.activities?.length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedDestination.activities.map((activity) => (
                      <span
                        key={activity}
                        className="px-3 py-1 rounded-full bg-white/10 text-white/90 text-xs font-semibold"
                      >
                        {activityLabels[activity as DestinationActivity] ??
                          activity}
                      </span>
                    ))}
                  </div>
                ) : null}

                {/* Operating hours */}
                {selectedDestination?.operating_hours ? (
                  <div className="flex items-center gap-2 text-white/70 text-xs">
                    <Clock className="size-3.5 shrink-0 text-duck-cyan/80" />
                    <span>
                      {t("operatingHours", {
                        hours: selectedDestination.operating_hours,
                      })}
                    </span>
                  </div>
                ) : null}

                {/* Description */}
                <div className="max-h-16 break-all overflow-y-auto overscroll-contain scrollbar-duck rounded-lg">
                  <DialogDescription className="text-white/80 text-sm leading-relaxed whitespace-pre-line ps-1">
                    {selectedDestinationDescription || t("noDescription")}
                  </DialogDescription>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </section>
  )
}
