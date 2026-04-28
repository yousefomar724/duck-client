"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import {
  X,
  Clock,
  Gauge,
  Banknote,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Popover, PopoverContent, PopoverAnchor } from "@/components/ui/popover"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel"
import { type WaterActivityLocation, type DifficultyLevel } from "./map-data"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { ImageWithLogoFallback } from "@/components/shared/image-with-logo-fallback"

interface LocationDetailPopoverProps {
  location: WaterActivityLocation | null
  open: boolean
  onOpenChange: (open: boolean) => void
  anchorPoint: { x: number; y: number }
}

function getDisplayImages(location: WaterActivityLocation): (string | undefined)[] {
  if (location.images?.length) {
    const urls = location.images.filter((u): u is string => Boolean(u?.trim?.()))
    if (urls.length) return urls
  }
  if (location.image?.trim()) return [location.image]
  return [undefined]
}

export default function LocationDetailPopover({
  location,
  open,
  onOpenChange,
  anchorPoint,
}: LocationDetailPopoverProps) {
  const t = useTranslations("mapPage")
  const [side, setSide] = useState<"right" | "bottom">("right")
  const [carouselApi, setCarouselApi] = useState<CarouselApi | null>(null)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const carouselApiRef = useRef<CarouselApi | null>(null)

  useEffect(() => {
    carouselApiRef.current = carouselApi
  }, [carouselApi])

  useEffect(() => {
    if (!carouselApi) return
    const onSelect = () => setSelectedIndex(carouselApi.selectedScrollSnap())
    carouselApi.on("select", onSelect)
    queueMicrotask(() => setSelectedIndex(carouselApi.selectedScrollSnap()))
    return () => {
      carouselApi.off("select", onSelect)
    }
  }, [carouselApi])

  // Reinit carousel when popover opens so Embla measures the visible container
  useEffect(() => {
    if (!open || !carouselApi) return
    let cancelled = false
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!cancelled) carouselApi.reInit()
      })
    })
    return () => {
      cancelled = true
      cancelAnimationFrame(id)
    }
  }, [open, carouselApi])

  useEffect(() => {
    const m = window.matchMedia("(max-width: 640px)")
    const update = () => setSide(m.matches ? "bottom" : "right")
    update()
    m.addEventListener("change", update)
    return () => m.removeEventListener("change", update)
  }, [])

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) carouselApiRef.current?.scrollTo(0)
      onOpenChange(next)
    },
    [onOpenChange],
  )

  if (!location) return null

  const images = getDisplayImages(location)
  const hasMultipleImages = images.length > 1
  const activityLabels = {
    kayak: t("filters.kayak"),
    sup: t("filters.sup"),
    waterbike: t("filters.waterbike"),
  } as const
  const difficultyLabels: Record<DifficultyLevel, string> = {
    easy: t("difficulty.easy"),
    medium: t("difficulty.medium"),
    hard: t("difficulty.hard"),
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverAnchor asChild>
        <span
          className="pointer-events-none fixed w-0 h-0"
          style={{ left: anchorPoint.x, top: anchorPoint.y }}
        />
      </PopoverAnchor>

      <PopoverContent
        side={side}
        sideOffset={side === "bottom" ? 12 : 16}
        align="center"
        collisionPadding={16}
        className={cn(
          "bg-duck-navy-deep! text-white border-none p-0! overflow-hidden rounded-xl shadow-2xl z-40 flex flex-col",
          "w-[340px] max-w-[min(340px,calc(100vw-2rem))]",
          side === "bottom"
            ? "max-h-[65vh] w-[calc(100vw-1rem)] max-w-[340px] pb-[env(safe-area-inset-bottom)] mx-2"
            : "max-h-[80vh]",
        )}
      >
        {/* Full-bleed image carousel — shorter aspect on mobile so popover fits */}
        <div
          dir="ltr"
          className="relative w-full aspect-2/1 sm:aspect-16/10 shrink-0 overflow-hidden **:data-[slot=carousel-content]:h-full"
        >
          <Carousel
            setApi={setCarouselApi}
            opts={{ align: "start", loop: true, direction: "ltr" }}
            className="h-full w-full relative"
          >
            <CarouselContent className="h-full ms-0 min-h-full">
              {images.map((src, i) => (
                <CarouselItem key={i} className="h-full ps-0">
                  <div className="relative h-full w-full">
                    <ImageWithLogoFallback
                      src={src}
                      alt={t("imageAlt", {
                        name: location.name,
                        index: i + 1,
                      })}
                      fill
                      sizes="(max-width: 640px) calc(100vw - 1rem), 340px"
                      className="object-cover"
                      fallbackClassName="object-contain bg-gray-100 p-6"
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
                  aria-label={t("carousel.previous")}
                >
                  <ChevronLeft className="size-4" />
                </CarouselPrevious>
                <CarouselNext
                  variant="ghost"
                  size="icon"
                  className="absolute top-1/2 end-3 -translate-y-1/2 z-10 size-8 rounded-full bg-black/40 backdrop-blur-sm border-0 text-white/80 hover:text-white hover:bg-black/60"
                  aria-label={t("carousel.next")}
                >
                  <ChevronRight className="size-4" />
                </CarouselNext>
              </>
            )}
          </Carousel>
          {hasMultipleImages && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 flex gap-1.5">
              {images.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => carouselApi?.scrollTo(i)}
                  className={cn(
                    "w-2 h-2 rounded-full transition-colors cursor-pointer",
                    i === selectedIndex
                      ? "bg-white"
                      : "bg-white/50 hover:bg-white/70",
                  )}
                  aria-label={t("carousel.imageDot", { index: i + 1 })}
                  aria-current={i === selectedIndex ? "true" : undefined}
                />
              ))}
            </div>
          )}
          <div className="absolute inset-0 bg-linear-to-t from-duck-navy-deep via-transparent to-transparent pointer-events-none" />

          {/* Close button */}
          <button
            onClick={() => handleOpenChange(false)}
            className="absolute top-3 start-3 z-10 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white/80 hover:text-white hover:bg-black/60 transition-colors cursor-pointer"
            aria-label={t("close")}
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Content — only description scrolls when long */}
        <div className="flex flex-col min-h-0 flex-1">
          <div className="px-4 pt-2 flex flex-col gap-3">
            {/* Name + Status badge */}
            <div className="flex flex-col gap-2">
              <h3 className="text-white text-xl font-bold leading-tight">
                {location.name}
              </h3>
              <span
                className={cn(
                  "w-fit text-xs font-medium px-2.5 py-1 rounded-full",
                  location.status === "coming_soon"
                    ? "bg-duck-yellow/20 text-duck-yellow animate-pulse"
                    : "bg-duck-cyan/20 text-duck-cyan",
                )}
              >
                {location.status === "coming_soon"
                  ? t("status.comingSoon")
                  : t("status.availableNow")}
              </span>
            </div>

            {/* Quick info: duration | difficulty | price */}
            <div className="flex flex-wrap gap-2">
              {location.duration && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 text-white/90 text-xs">
                  <Clock className="size-3.5 shrink-0" />
                  {location.duration}
                </span>
              )}
              {location.difficulty && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 text-white/90 text-xs">
                  <Gauge className="size-3.5 shrink-0" />
                  {difficultyLabels[location.difficulty as DifficultyLevel]}
                </span>
              )}
              {location.price && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 text-white/90 text-xs">
                  <Banknote className="size-3.5 shrink-0" />
                  {location.price}
                </span>
              )}
            </div>

            {/* Description — scrolls only when height exceeds max */}
            <div className="max-h-16 break-all overflow-y-auto overscroll-contain scrollbar-duck rounded-lg">
              <p className="text-white/80 text-sm leading-relaxed ps-1">
                {location.description}
              </p>
            </div>

            {/* Activity tags */}
            <div className="flex flex-wrap gap-1.5">
              {location.activities.map((activity) => (
                <span
                  key={activity}
                  className="px-3 py-1 rounded-full bg-white/10 text-white/90 text-xs font-semibold"
                >
                  {activityLabels[activity]}
                </span>
              ))}
            </div>

            {/* Operating hours */}
            {location.operatingHours && (
              <div className="flex items-center gap-2 text-white/70 text-xs">
                <Clock className="size-3.5 shrink-0 text-duck-cyan/80" />
                <span>
                  {t("operatingHours", { hours: location.operatingHours })}
                </span>
              </div>
            )}

            {/* Highlights */}
            {location.highlights?.length ? (
              <ul className="flex flex-col gap-1.5">
                {location.highlights.map((item, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-white/80 text-sm"
                  >
                    <CheckCircle2 className="size-4 shrink-0 mt-0.5 text-duck-cyan" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            ) : null}

            {/* CTA */}
            <div className="pt-2 pb-4">
              <Link
                className={cn(
                  "inline-flex w-full items-center justify-center rounded-full font-medium text-sm py-2.5 sm:py-2 min-h-[44px] sm:min-h-0 touch-manipulation",
                  location.status === "coming_soon"
                    ? "bg-white/10 text-white/50 cursor-not-allowed pointer-events-none"
                    : "bg-duck-yellow text-duck-navy hover:bg-duck-yellow-hover",
                )}
                href={
                  location.status === "coming_soon"
                    ? "#"
                    : `/book?location=${location.id}`
                }
              >
                {location.status === "coming_soon"
                  ? t("cta.comingSoon")
                  : t("cta.bookNow")}
              </Link>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
