/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import useEmblaCarousel from "embla-carousel-react"
import { useCallback, useState, useEffect } from "react"
import Image from "next/image"
import { ChevronLeft, ChevronRight } from "lucide-react"

const resorts = [
  {
    id: 1,
    name: "جزيرة الفنتين",
    location: "نهر النيل - أسوان",
    tags: ["كاياك", "جولات الغروب"],
    image: "/resort.webp",
    logo: "/resot-logo.svg",
    badge: "جولات الكاياك",
  },
  {
    id: 2,
    name: "كورنيش أسوان",
    location: "نهر النيل - أسوان",
    tags: ["ستاند اب", "تجديف"],
    image: "/resort.webp",
    logo: "/resot-logo.svg",
    badge: null,
  },
  {
    id: 3,
    name: "جزيرة النباتات",
    location: "نهر النيل - أسوان",
    tags: ["كاياك", "طبيعة"],
    image: "/resort.webp",
    logo: "/resot-logo.svg",
    badge: null,
  },
  {
    id: 4,
    name: "شاطئ النيل",
    location: "نهر النيل - أسوان",
    tags: ["واتر بايك", "عائلات"],
    image: "/resort.webp",
    logo: "/resot-logo.svg",
    badge: null,
  },
]

const filters = [
  "الكل",
  "كاياك",
  "ستاند اب",
  "واتر بايك",
]

export default function ResortsSection() {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    align: "center",
    direction: "rtl",
    containScroll: "trimSnaps",
  })

  const [prevBtnDisabled, setPrevBtnDisabled] = useState(true)
  const [nextBtnDisabled, setNextBtnDisabled] = useState(true)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([])

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
      setScrollSnaps(emblaApi.scrollSnapList())
      onSelect(emblaApi)
    }, 100)
    emblaApi.on("select", onSelect)
    emblaApi.on("reInit", onSelect)
  }, [emblaApi, onSelect])

  return (
    <section className="bg-dark-bg py-20 overflow-hidden">
      {/* Header */}
      <div className="text-center mb-12 max-w-[1920px] mx-auto px-4 md:px-10">
        <span className="text-white/60 text-base block mb-3">المواقع</span>
        <h2 className="text-white text-4xl md:text-5xl font-bold">
          اكتشف مواقعنا الرائعة
        </h2>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap justify-center gap-4 mb-12">
        {filters.map((filter, index) => (
          <button
            key={filter}
            className={`px-6 py-2.5 rounded-full text-sm transition-all ${
              index === 0
                ? "bg-white text-dark-bg font-medium"
                : "bg-transparent text-white/60 hover:text-white"
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      {/* Carousel */}
      <div className="relative" dir="rtl">
        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex gap-6 touch-pan-y">
            {resorts.map((resort) => (
              <div
                key={resort.id}
                className="flex-[0_0_280px] md:flex-[0_0_300px] min-w-0 relative h-[500px] rounded-2xl overflow-hidden group cursor-pointer first:ms-6"
              >
                <Image
                  src={resort.image}
                  alt={resort.name}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />

                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                {/* Top Content */}
                <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
                  {resort.badge && (
                    <span className="bg-duck-cyan-light/90 text-dark-bg text-xs font-medium px-3 py-1.5 rounded-lg backdrop-blur-sm">
                      {resort.badge}
                    </span>
                  )}
                  <div className="w-8 h-8 relative ml-auto">
                    {/* Logo placeholder */}
                    <Image
                      src={resort.logo}
                      alt="logo"
                      fill
                      className="object-contain brightness-0 invert"
                    />
                  </div>
                </div>

                {/* Bottom Content */}
                <div className="absolute bottom-0 left-0 right-0 p-6 text-right">
                  <div className="text-duck-cyan text-sm font-medium mb-2 opacity-0 transform translate-y-4 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0">
                    لمعرفة المزيد
                  </div>
                  <h3 className="text-white text-2xl font-bold mb-1">
                    {resort.name}
                  </h3>
                  <div className="text-white/70 text-sm mb-1">
                    {resort.location}
                  </div>
                  <div className="text-white/50 text-xs">
                    {resort.tags.join(" · ")}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Controls */}
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
          <span>{resorts.length}</span>
        </div>

        <button
          onClick={scrollNext}
          disabled={nextBtnDisabled}
          className="disabled:opacity-30 hover:scale-110 transition-transform"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>
    </section>
  )
}
