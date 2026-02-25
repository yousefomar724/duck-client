/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import useEmblaCarousel from "embla-carousel-react"
import { useCallback, useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { getTrips } from "@/lib/api/trips"
import type { Trip } from "@/lib/types"
import { getTripImage, resolveImageUrl } from "@/lib/image-utils"
import { formatCurrency } from "@/lib/constants"

export default function OffersSection() {
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
    <section className="bg-off-white py-20 overflow-hidden">
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
                const rawImage = getTripImage(trip.images)
                const imageUrl =
                  resolveImageUrl(rawImage) ?? placeholderImage
                const isExternal = imageUrl.startsWith("http")
                const supplierName = trip.supplier?.name?.ar

                return (
                  <div
                    key={trip.id}
                    className="flex-[0_0_90%] md:max-w-280 min-w-0 relative h-[500px] rounded-2xl overflow-hidden shadow-[0_4px_30px_rgba(0,0,0,0.06)] bg-white flex flex-col md:flex-row first:ms-6"
                  >
                    {/* Image Side */}
                    <div className="w-full md:w-2/3 relative h-full">
                      {isExternal ? (
                        // eslint-disable-next-line @next/next/no-img-element -- API image URL may be external
                        <img
                          src={imageUrl}
                          alt={trip.name.ar}
                          className="object-cover w-full h-full"
                        />
                      ) : (
                        <Image
                          src={imageUrl}
                          alt={trip.name.ar}
                          width={0}
                          height={0}
                          sizes="100vw"
                          className="object-cover w-full h-full"
                        />
                      )}
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
                          {trip.name.ar}
                        </h3>
                        <p className="text-text-body leading-relaxed mb-4 line-clamp-4">
                          {trip.description.ar}
                        </p>
                        <p className="text-duck-cyan font-semibold text-lg">
                          {formatCurrency(trip.price, trip.currency)}
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
