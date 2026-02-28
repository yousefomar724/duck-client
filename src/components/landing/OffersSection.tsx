/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import useEmblaCarousel from "embla-carousel-react"
import { useCallback, useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"
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
} from "@/components/ui/carousel"

export default function OffersSection() {
  const getLocalizedText = (value: any, fallback = "") =>
    typeof value === "string" ? value : value?.ar || value?.en || fallback

  const [trips, setTrips] = useState<Trip[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    align: "center",
    direction: "rtl",
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
      const { data, error: err } = await getTrips("ar")
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

  const placeholderImage = "/offer.webp"

  return (
    <section id="experiences" className="bg-off-white py-20 overflow-hidden">
      {/* Header */}
      <div className="text-center mb-12 max-w-[1920px] mx-auto px-4 md:px-10">
        <span className="text-duck-cyan text-base block mb-3">الرحلات</span>
        <h2 className="text-text-dark text-4xl md:text-5xl font-bold">
          رحلات مميزة من أفضل مزودي الخدمة
        </h2>
        <p className="text-text-body mt-4 max-w-2xl mx-auto">
          اكتشف أفضل الرحلات المائية من مزودي خدمة متعددين
        </p>
      </div>

      {/* Carousel */}
      <div className="relative mb-12" dir="rtl">
        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex gap-6 touch-pan-y py-10">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="flex-[0_0_90%] md:max-w-280 min-w-0 h-[500px] rounded-2xl overflow-hidden shadow-[0_4px_30px_rgba(0,0,0,0.06)] bg-white flex flex-col md:flex-row animate-pulse first:ms-6"
                />
              ))
            ) : error ? (
              <div className="flex-[0_0_100%] min-w-0 flex justify-center py-12 first:ms-6">
                <p className="text-text-body text-center">
                  حدث خطأ في تحميل الرحلات. يرجى المحاولة لاحقاً.
                </p>
              </div>
            ) : trips.length === 0 ? (
              <div className="flex-[0_0_100%] min-w-0 flex justify-center py-12 first:ms-6">
                <p className="text-text-body text-center">
                  لا توجد رحلات متاحة حالياً.
                </p>
              </div>
            ) : (
              trips.map((trip) => {
                const tripName = getLocalizedText(trip.name, "رحلة")
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

                return (
                  <div
                    key={trip.id}
                    className="flex-[0_0_90%] md:max-w-280 min-w-0 relative h-[500px] rounded-2xl overflow-hidden shadow-[0_4px_30px_rgba(0,0,0,0.06)] bg-white flex flex-col md:flex-row first:ms-6 group"
                  >
                    {/* Image Side - Carousel (structure matches LocationDetailPopover) */}
                    <div
                      dir="ltr"
                      className="w-full md:w-2/3 relative h-full overflow-hidden **:data-[slot=carousel-content]:h-full"
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
                                  alt={`${tripName} - صورة ${i + 1}`}
                                  fill
                                  className="object-cover transition-transform duration-500 group-hover:scale-105"
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
                              aria-label="السابق"
                            >
                              <ChevronLeft className="size-4" />
                            </CarouselPrevious>
                            <CarouselNext
                              variant="ghost"
                              size="icon"
                              className="absolute top-1/2 end-3 -translate-y-1/2 z-10 size-8 rounded-full bg-black/40 backdrop-blur-sm border-0 text-white/80 hover:text-white hover:bg-black/60"
                              aria-label="التالي"
                            >
                              <ChevronRight className="size-4" />
                            </CarouselNext>
                          </>
                        )}
                      </Carousel>
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
                        </p>
                        <p className="text-text-muted text-sm mt-1">
                          {(trip.duration ?? 1)}{" "}
                          {(trip.duration ?? 1) === 1 ? "يوم" : "أيام"}
                        </p>
                      </div>
                      <Link
                        href={`/book?trip=${trip.id}`}
                        className="bg-duck-yellow text-duck-navy px-7 py-3 rounded-full font-medium hover:bg-duck-yellow/80 transition-colors"
                      >
                        احجز الآن
                      </Link>
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
        <div className="flex flex-col items-center gap-10 max-w-[1920px] mx-auto px-4 md:px-10">
          <div
            className="flex items-center justify-center gap-4 text-text-dark"
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

          <Link
            href="/book"
            className="border border-text-dark text-text-dark px-8 py-3 rounded-full hover:bg-text-dark hover:text-white transition-colors"
          >
            عرض جميع الرحلات
          </Link>
        </div>
      )}
    </section>
  )
}
