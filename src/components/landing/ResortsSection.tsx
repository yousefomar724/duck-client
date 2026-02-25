/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import useEmblaCarousel from "embla-carousel-react"
import { useCallback, useState, useEffect } from "react"
import Image from "next/image"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { getDestinations } from "@/lib/api/destinations"
import type { Destination } from "@/lib/types"
import { resolveImageUrl } from "@/lib/image-utils"

export default function ResortsSection() {
  const [destinations, setDestinations] = useState<Destination[]>([])
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
    async function fetchDestinations() {
      setLoading(true)
      setError(null)
      const { data, error: err } = await getDestinations("ar", "active")
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

  const placeholderImage = "/resort.webp"

  return (
    <section className="bg-dark-bg py-20 overflow-hidden">
      {/* Header */}
      <div className="text-center mb-12 max-w-[1920px] mx-auto px-4 md:px-10">
        <span className="text-white/60 text-base block mb-3">الوجهات</span>
        <h2 className="text-white text-4xl md:text-5xl font-bold">
          اكتشف وجهاتنا المميزة
        </h2>
      </div>

      {/* Carousel */}
      <div className="relative" dir="rtl">
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
                <p className="text-white/80 text-center">
                  حدث خطأ في تحميل الوجهات. يرجى المحاولة لاحقاً.
                </p>
              </div>
            ) : destinations.length === 0 ? (
              <div className="flex-[0_0_100%] min-w-0 flex justify-center py-12 first:ms-6">
                <p className="text-white/80 text-center">
                  لا توجد وجهات متاحة حالياً.
                </p>
              </div>
            ) : (
              destinations.map((destination) => {
                const imageUrl =
                  resolveImageUrl(destination.image) ?? placeholderImage
                const isExternal = imageUrl.startsWith("http")
                return (
                  <div
                    key={destination.id}
                    className="flex-[0_0_280px] md:flex-[0_0_300px] min-w-0 relative h-[500px] rounded-2xl overflow-hidden group cursor-pointer first:ms-6"
                  >
                    {isExternal ? (
                      // eslint-disable-next-line @next/next/no-img-element -- API image URL may be external
                      <img
                        src={imageUrl}
                        alt={destination.name.ar}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <Image
                        src={imageUrl}
                        alt={destination.name.ar}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    )}

                    {/* Overlay */}
                    <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent" />

                    {/* Top Content */}
                    <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
                      {destination.trip_count != null &&
                        destination.trip_count > 0 && (
                          <span className="bg-duck-cyan-light/90 text-dark-bg text-xs font-medium px-3 py-1.5 rounded-lg backdrop-blur-sm">
                            {destination.trip_count} رحلات
                          </span>
                        )}
                    </div>

                    {/* Bottom Content */}
                    <div className="absolute bottom-0 left-0 right-0 p-6 text-right">
                      <div className="text-duck-cyan text-sm font-medium mb-2 opacity-0 transform translate-y-4 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0">
                        لمعرفة المزيد
                      </div>
                      <h3 className="text-white text-2xl font-bold mb-1">
                        {destination.name.ar}
                      </h3>
                      <div className="text-white/70 text-sm line-clamp-2">
                        {destination.description.ar}
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
    </section>
  )
}
