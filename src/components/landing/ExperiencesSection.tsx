/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import useEmblaCarousel from "embla-carousel-react"
import { useCallback, useState, useEffect } from "react"
import Image from "next/image"
import {
  ChevronLeft,
  ChevronRight,
  Waves,
  CircleDot,
  Bike,
} from "lucide-react"

const categories = [
  { id: "kayak", label: "كاياك", icon: Waves },
  { id: "sup", label: "ستاند اب", icon: CircleDot },
  { id: "waterbike", label: "واتر بايك", icon: Bike },
]

const experiences = [
  {
    id: 1,
    title: "كاياك",
    description:
      "استكشف النيل في كاياكاتنا المريحة الفردية والمزدوجة. خيارات فردية أو مزدوجة، مناسبة للمبتدئين، جميع المعدات متضمنة.",
    image: "/discover-card.webp",
    isTestimonial: false,
  },
  {
    id: 2,
    title: "ستاند اب",
    description:
      "انزلق عبر المياه الهادئة على لوح التجديف. تمرين كامل للجسم، مثالي للصور، طرق مياه هادئة.",
    image: "/discover-card.webp",
    isTestimonial: false,
  },
  {
    id: 3,
    title: "واتر بايك",
    description:
      "دوس طريقك عبر النيل على دراجاتنا المائية. سهل التعلم، مثالي للعائلات، لا حاجة لخبرة.",
    image: "/discover-card.webp",
    isTestimonial: false,
  },
  {
    id: 4,
    title: "Sarah Mitchell",
    description:
      '"Absolutely magical experience! The sunset kayak tour around Elephantine Island was the highlight of our Egypt trip. The guides were professional and the equipment was top-notch."',
    subtitle: "London, UK",
    image: "/discover-card.webp",
    isTestimonial: true,
  },
  {
    id: 5,
    title: "Ahmed Hassan",
    description:
      '"As a local, I\'ve always wanted to experience the Nile differently. Duck Entertainment made it happen! The SUP session was incredibly peaceful and well-organized."',
    subtitle: "Cairo, Egypt",
    image: "/discover-card.webp",
    isTestimonial: true,
  },
  {
    id: 6,
    title: "Maria Garcia",
    description:
      '"The water bike experience was so much fun! Perfect for families. My kids loved it and the staff was very patient with beginners. Highly recommend!"',
    subtitle: "Barcelona, Spain",
    image: "/discover-card.webp",
    isTestimonial: true,
  },
]

export default function ExperiencesSection() {
  const [activeCategory, setActiveCategory] = useState("kayak")
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    align: "center",
    direction: "rtl",
    containScroll: "trimSnaps",
  })

  const [prevBtnDisabled, setPrevBtnDisabled] = useState(true)
  const [nextBtnDisabled, setNextBtnDisabled] = useState(true)
  const [selectedIndex, setSelectedIndex] = useState(0)

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

  return (
    <section className="bg-white py-20 overflow-hidden">
      {/* Header */}
      <div className="text-center mb-12 max-w-[1920px] mx-auto px-4 md:px-10">
        <span className="text-duck-cyan text-base block mb-3">
          خدماتنا
        </span>
        <h2 className="text-text-dark text-4xl md:text-5xl font-bold mb-8">
          من جولات الغروب الهادئة إلى المنحدرات المثيرة، لدينا المغامرة المثالية للجميع
        </h2>

        {/* Tabs */}
        <div className="flex flex-wrap justify-center gap-8 md:gap-12 mb-8 border-b border-gray-100 pb-4">
          {categories.map((cat) => {
            const Icon = cat.icon
            const isActive = activeCategory === cat.id
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex flex-col items-center gap-3 pb-4 transition-all relative ${
                  isActive
                    ? "text-duck-cyan"
                    : "text-text-muted hover:text-text-body"
                }`}
              >
                <Icon
                  className={`w-8 h-8 ${isActive ? "text-duck-cyan" : "text-gray-400"}`}
                />
                <span className="text-sm font-medium">{cat.label}</span>
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-duck-cyan" />
                )}
              </button>
            )
          })}
        </div>

        <p className="text-text-body max-w-2xl mx-auto text-lg leading-relaxed">
          ماذا يقول المغامرون لدينا - لا تأخذ كلمتنا فقط، استمع إلى الآلاف الذين جربوا سحر النيل معنا.
        </p>
      </div>

      {/* Carousel */}
      <div className="relative mb-12" dir="rtl">
        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex gap-6 touch-pan-y">
            {experiences.map((exp) => (
              <div
                key={exp.id}
                className="flex-[0_0_280px] md:flex-[0_0_400px] min-w-0 relative h-[380px] rounded-2xl overflow-hidden group cursor-pointer first:ms-6"
              >
                <Image
                  src={exp.image}
                  alt={exp.title}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />

                {/* Overlay */}
                <div className="absolute inset-0 bg-linear-to-t from-black/80 via-transparent to-transparent" />

                {/* Content */}
                <div className="absolute bottom-0 left-0 right-0 p-8 text-right">
                  <h3 className="text-white text-2xl font-bold mb-2">
                    {exp.title}
                  </h3>
                  {"subtitle" in exp && exp.subtitle && (
                    <p className="text-white/70 text-xs mb-2">{exp.subtitle}</p>
                  )}
                  <p className="text-white/80 text-sm leading-relaxed">
                    {exp.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Controls */}
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
            <span>{experiences.length}</span>
          </div>

          <button
            onClick={scrollNext}
            disabled={nextBtnDisabled}
            className="disabled:opacity-30 hover:scale-110 transition-transform"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>

        <button className="border border-text-dark text-text-dark px-8 py-3 rounded-full hover:bg-text-dark hover:text-white transition-colors">
          عرض جميع التقييمات
        </button>
      </div>
    </section>
  )
}
