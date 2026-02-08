/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import useEmblaCarousel from "embla-carousel-react"
import { useCallback, useState, useEffect } from "react"
import Image from "next/image"
import {
  ChevronLeft,
  ChevronRight,
  Waves,
  Mountain,
  Leaf,
  Building2,
  Utensils,
  Flag,
} from "lucide-react"

const categories = [
  { id: "water", label: "الرياضات المائية", icon: Waves },
  { id: "adventure", label: "رياضات المغامرة", icon: Mountain },
  { id: "nature", label: "تجارب الطبيعة", icon: Leaf },
  { id: "culture", label: "الثقافة", icon: Building2 },
  { id: "culinary", label: "طهي", icon: Utensils },
  { id: "golf", label: "الغولف", icon: Flag },
]

const experiences = [
  {
    id: 1,
    title: "الغوص السطحي",
    description:
      "اكتشف الشعاب المرجانية الزاهية خلال النهار أو تأمل الحياة البحرية المتوهجة في غوص ليلي ساحر.",
    image: "/discover-card.webp",
  },
  {
    id: 2,
    title: "الغوص",
    description:
      "اكتشف الشعاب المرجانية الزاهية خلال النهار أو تأمل الحياة البحرية المتوهجة في غوص ليلي ساحر.",
    image: "/discover-card.webp",
  },
  {
    id: 3,
    title: "تجربة الإبحار",
    description:
      "استمتع برحلات الإبحار الهادئة وسط مياه البحر الأحمر الصافية لاكتشاف الجزر الخلابة والمناظر الطبيعية.",
    image: "/discover-card.webp",
  },
  {
    id: 4,
    title: "ركوب الأمواج",
    description:
      "خض تحدي ركوب الأمواج على الشواطئ الرملية وتمتع بإثارة الرياضات المائية في أجواء مثالية.",
    image: "/discover-card.webp",
  },
  {
    id: 5,
    title: "جولات الحياة البرية",
    description:
      "تجول بين المحميات الطبيعية لاكتشاف التنوع البيولوجي الفريد للحيوانات والنباتات المحلية.",
    image: "/discover-card.webp",
  },
  {
    id: 6,
    title: "تجربة المأكولات البحرية",
    description:
      "تذوّق أشهى أطباق المأكولات البحرية الطازجة من مطاعم راقية بإطلالة مباشرة على البحر.",
    image: "/discover-card.webp",
  },
  {
    id: 7,
    title: "الجولات الثقافية",
    description:
      "اكتشف التراث الغني للمنطقة عبر زيارات للمتاحف المحلية والمواقع الأثرية والفعاليات الثقافية.",
    image: "/discover-card.webp",
  },
  {
    id: 8,
    title: "الجولف بين الطبيعة",
    description:
      "اختبر متعة لعب الجولف في ملاعب حديثة مفتوحة وسط مناظر طبيعية خلابة وأجواء هادئة.",
    image: "/discover-card.webp",
  },
]

export default function ExperiencesSection() {
  const [activeCategory, setActiveCategory] = useState("water")
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
          التجارب والفعاليات
        </span>
        <h2 className="text-text-dark text-4xl md:text-5xl font-bold mb-8">
          مغامرات استثنائية بانتظارك
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
          أيقظ حواسك مع مغامرات مائية تجمع بين الإثارة والهدوء، مصممة لتغمرك
          بإيقاع وجمال وحرية البحر المفتوح.
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
                  {/* Show description only on active/center card ideally, but for now show on all or simplify */}
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
          استكشف جميع التجارب
        </button>
      </div>
    </section>
  )
}
