/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import useEmblaCarousel from "embla-carousel-react"
import { useCallback, useState, useEffect } from "react"
import Image from "next/image"
import { ChevronLeft, ChevronRight } from "lucide-react"

const offers = [
  {
    id: 1,
    title: "عروض الافتتاح الخاص",
    description:
      "من قلب البحر الأحمر، ترحب بكم جزيرة شورى بعروضها الافتتاحية، وتدعوكم لاكتشاف عالم جديد من أفخم المنتجعات وتجربة أجوائها الاستثنائية.",
    image: "/offer.webp",
    cta: "لمعرفة المزيد",
  },
  {
    id: 2,
    title: "رومانسية للزوجين",
    description:
      "رحلة ساحرة مصممة خصيصاً للأزواج عن ملاذ رومانسي لا مثيل له في الفاخرة.",
    image: "/offer.webp",
    cta: "لمعرفة المزيد",
  },
  {
    id: 3,
    title: "عطلة العائلة",
    description: "استمتع بأوقات لا تنسى مع العائلة في وجهاتنا الفريدة.",
    image: "/offer.webp",
    cta: "لمعرفة المزيد",
  },
  {
    id: 4,
    title: "باقة العافية",
    description: "جدد نشاطك وحيويتك مع برامجنا الصحية المتكاملة.",
    image: "/offer.webp",
    cta: "لمعرفة المزيد",
  },
]

export default function OffersSection() {
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
    <section className="bg-off-white py-20 overflow-hidden">
      {/* Header */}
      <div className="text-center mb-12 max-w-[1920px] mx-auto px-4 md:px-10">
        <span className="text-duck-cyan text-base block mb-3">العروض</span>
        <h2 className="text-text-dark text-4xl md:text-5xl font-bold">
          اكتشف عروضنا الحصرية
        </h2>
      </div>

      {/* Carousel */}
      <div className="relative mb-12" dir="rtl">
        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex gap-6 touch-pan-y py-10">
            {/* py-10 for shadow space */}
            {offers.map((offer) => (
              <div
                key={offer.id}
                className="flex-[0_0_90%] md:max-w-[70rem] min-w-0 relative h-[500px] rounded-2xl overflow-hidden shadow-[0_4px_30px_rgba(0,0,0,0.06)] bg-white flex flex-col md:flex-row first:ms-6"
              >
                {/* Image Side (Left) */}
                <div className="w-full md:w-2/3 relative h-full">
                  <Image
                    src={offer.image}
                    alt={offer.title}
                    width={0}
                    height={0}
                    sizes="100vw"
                    className="object-cover w-full h-full"
                  />
                </div>

                {/* Text Side (Right) */}
                <div className="w-full md:w-1/3 p-10 flex flex-col justify-between items-start text-right">
                  <div>
                    <h3 className="text-2xl md:text-3xl font-bold text-text-dark mb-4">
                      {offer.title}
                    </h3>
                    <p className="text-text-body leading-relaxed mb-8">
                      {offer.description}
                    </p>
                  </div>
                  <button className="bg-duck-yellow text-duck-navy px-7 py-3 rounded-full font-medium hover:bg-duck-yellow/80 transition-colors">
                    {offer.cta}
                  </button>
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
            <span>{offers.length}</span>
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
          استكشف جميع العروض
        </button>
      </div>
    </section>
  )
}
