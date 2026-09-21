"use client"

import useEmblaCarousel from "embla-carousel-react"
import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { ImageWithLogoFallback } from "@/components/shared/image-with-logo-fallback"
import { getDestinations } from "@/lib/api/destinations"
import type { Destination } from "@/lib/types"
import { DUCK_LOGO_PLACEHOLDER, resolveImageUrl } from "@/lib/image-utils"
import { canonicalDestinationPath } from "@/lib/seo/slug"

function localized(value: Destination["name"] | Destination["description"], locale: string) {
  if (typeof value === "string") return value
  return value?.[locale as "ar" | "en"] || value?.en || value?.ar || ""
}

export default function ResortsSection() {
  const t = useTranslations("resorts")
  const locale = useLocale()
  const [destinations, setDestinations] = useState<Destination[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    align: "center",
    direction: locale === "ar" ? "rtl" : "ltr",
    // When all cards fit on desktop, keep the track at its natural centered
    // position instead of translating the first card into the viewport center.
    // Overflowing/mobile layouts still retain their normal carousel snaps.
    containScroll: "trimSnaps",
  })

  useEffect(() => {
    let cancelled = false
    void getDestinations(locale, "active").then(({ data, error: fetchError }) => {
      if (cancelled) return
      setDestinations(data ?? [])
      setError(fetchError)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [locale])

  const onSelect = useCallback(() => {
    if (emblaApi) setSelectedIndex(emblaApi.selectedScrollSnap())
  }, [emblaApi])

  useEffect(() => {
    if (!emblaApi) return
    const frame = requestAnimationFrame(onSelect)
    emblaApi.on("select", onSelect)
    emblaApi.on("reInit", onSelect)
    return () => {
      cancelAnimationFrame(frame)
      emblaApi.off("select", onSelect)
      emblaApi.off("reInit", onSelect)
    }
  }, [emblaApi, onSelect])

  return (
    <section id="locations" className="bg-dark-bg py-20 overflow-hidden">
      <div className="text-center mb-12 max-w-[1920px] mx-auto px-4 md:px-10">
        <span className="text-white/60 text-base block mb-3">{t("subtitle")}</span>
        <h2 className="text-white text-4xl md:text-5xl font-bold">{t("title")}</h2>
      </div>

      <div className="relative" dir={locale === "ar" ? "rtl" : "ltr"}>
        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex touch-pan-y md:justify-center">
            {loading ? (
              Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="flex-[0_0_280px] md:flex-[0_0_300px] min-w-0 h-[500px] me-6 rounded-2xl bg-white/10 animate-pulse"
                />
              ))
            ) : error ? (
              <p className="basis-full text-white/80 text-center py-12">{t("errorLoading")}</p>
            ) : destinations.length === 0 ? (
              <p className="basis-full text-white/80 text-center py-12">{t("noDestinations")}</p>
            ) : (
              destinations.map((destination) => {
                const name = localized(destination.name, locale) || t("defaultName")
                const description = localized(destination.description, locale)
                const resolved = resolveImageUrl(destination.image)
                return (
                  <Link
                    key={destination.id}
                    href={canonicalDestinationPath({ id: destination.id, name, slug: destination.slug })}
                    data-testid="destination-slide"
                    className="flex-[0_0_280px] md:flex-[0_0_300px] min-w-0 relative h-[500px] me-6 rounded-2xl overflow-hidden group"
                  >
                    <ImageWithLogoFallback
                      src={resolved ?? DUCK_LOGO_PLACEHOLDER}
                      alt={name}
                      fill
                      sizes="300px"
                      // 300px-wide cards: q50 is indistinguishable from the
                      // default 75 at this size and roughly a third smaller.
                      quality={50}
                      className={resolved ? "object-cover transition-transform duration-500 group-hover:scale-105" : "object-contain p-10 bg-white/10"}
                      fallbackClassName="object-contain p-10 bg-white/10"
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent" />
                    <div className="absolute top-4 start-4 end-4 flex justify-between items-start">
                      {destination.trip_count != null && destination.trip_count > 0 ? (
                        <span className="bg-duck-cyan-light/90 text-dark-bg text-xs font-medium px-3 py-1.5 rounded-lg backdrop-blur-sm">
                          {t("trips", { count: destination.trip_count })}
                        </span>
                      ) : null}
                    </div>
                    <div className="absolute bottom-0 start-0 end-0 p-6 text-start">
                      <span className="text-duck-cyan text-sm font-medium mb-2 block md:opacity-0 md:translate-y-4 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0">
                        {t("learnMore")}
                      </span>
                      <h3 className="text-white text-2xl font-bold mb-1 break-words">{name}</h3>
                      <p className="text-white/70 text-sm line-clamp-2 break-words">{description}</p>
                    </div>
                  </Link>
                )
              })
            )}
          </div>
        </div>
      </div>

      {!loading && !error && destinations.length > 0 ? (
        <div className="flex items-center justify-center gap-4 mt-10 text-white" dir="ltr">
          <button type="button" onClick={() => emblaApi?.scrollPrev()} aria-label={t("prevSlide")}>
            <ChevronLeft className="size-6" />
          </button>
          <div className="flex items-center gap-2 text-sm font-medium">
            <span>{selectedIndex + 1}</span>
            <span className="mx-3 w-10 h-0.5 bg-gray-500" />
            <span>{destinations.length}</span>
          </div>
          <button type="button" onClick={() => emblaApi?.scrollNext()} aria-label={t("nextSlide")}>
            <ChevronRight className="size-6" />
          </button>
        </div>
      ) : null}
    </section>
  )
}
