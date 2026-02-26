"use client"

import { useState, useEffect, useCallback } from "react"
import Image from "next/image"
import { X, Clock, Gauge, Banknote, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Popover, PopoverContent, PopoverAnchor } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import {
  ACTIVITY_LABELS,
  DIFFICULTY_LABELS,
  type WaterActivityLocation,
  type DifficultyLevel,
} from "./map-data"

interface LocationDetailPopoverProps {
  location: WaterActivityLocation | null
  open: boolean
  onOpenChange: (open: boolean) => void
  anchorPoint: { x: number; y: number }
}

function getDisplayImages(location: WaterActivityLocation): string[] {
  if (location.images?.length) return location.images
  return [location.image]
}

export default function LocationDetailPopover({
  location,
  open,
  onOpenChange,
  anchorPoint,
}: LocationDetailPopoverProps) {
  const [side, setSide] = useState<"right" | "bottom">("right")
  const [imageIndex, setImageIndex] = useState(0)

  useEffect(() => {
    const m = window.matchMedia("(max-width: 640px)")
    const update = () => setSide(m.matches ? "bottom" : "right")
    update()
    m.addEventListener("change", update)
    return () => m.removeEventListener("change", update)
  }, [])

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) setImageIndex(0)
      onOpenChange(next)
    },
    [onOpenChange],
  )

  if (!location) return null

  const images = getDisplayImages(location)
  const hasMultipleImages = images.length > 1

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
          "bg-duck-navy-deep! text-white border-none p-0! overflow-hidden rounded-xl shadow-2xl z-40",
          "w-[380px] max-w-[min(380px,calc(100vw-2rem))]",
          side === "bottom" &&
            "pb-[env(safe-area-inset-bottom)] mx-2 max-h-[85vh] flex flex-col",
        )}
      >
        {/* Full-bleed image(s) — no padding */}
        <div className="relative w-full aspect-16/10 shrink-0 overflow-hidden">
          {hasMultipleImages ? (
            <>
              <Image
                key={imageIndex}
                src={images[imageIndex]!}
                alt={location.name}
                fill
                className="object-cover"
              />
              {/* Dot indicators */}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 flex gap-1.5">
                {images.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setImageIndex(i)}
                    className={cn(
                      "w-2 h-2 rounded-full transition-colors cursor-pointer",
                      i === imageIndex
                        ? "bg-white"
                        : "bg-white/50 hover:bg-white/70",
                    )}
                    aria-label={`صورة ${i + 1}`}
                  />
                ))}
              </div>
            </>
          ) : (
            <Image
              src={images[0]!}
              alt={location.name}
              fill
              className="object-cover"
            />
          )}
          <div className="absolute inset-0 bg-linear-to-t from-duck-navy-deep via-transparent to-transparent pointer-events-none" />

          {/* Close button */}
          <button
            onClick={() => handleOpenChange(false)}
            className="absolute top-3 start-3 z-10 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white/80 hover:text-white hover:bg-black/60 transition-colors cursor-pointer"
            aria-label="إغلاق"
          >
            <X className="size-4" />
          </button>

          <div className="absolute top-3 end-3 z-10 text-white/60 text-xs font-medium">
            أسوان
          </div>
        </div>

        {/* Content — structured spacing */}
        <div
          className={cn(
            "flex flex-col overflow-y-auto",
            side === "bottom" && "min-h-0 flex-1",
          )}
        >
          <div className="px-4 pt-4 flex flex-col gap-3">
            {/* Name + Status badge */}
            <div className="flex flex-col gap-2">
              <h3 className="text-white text-xl font-bold leading-tight text-end">
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
                  ? "الافتتاح قريباً"
                  : "متاح الآن"}
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
                  {DIFFICULTY_LABELS[location.difficulty as DifficultyLevel]}
                </span>
              )}
              {location.price && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 text-white/90 text-xs">
                  <Banknote className="size-3.5 shrink-0" />
                  {location.price}
                </span>
              )}
            </div>

            {/* Description */}
            <p className="text-white/80 text-sm leading-relaxed">
              {location.description}
            </p>

            {/* Activity tags */}
            <div className="flex flex-wrap gap-1.5">
              {location.activities.map((activity) => (
                <span
                  key={activity}
                  className="px-3 py-1 rounded-full bg-white/10 text-white/90 text-xs font-semibold"
                >
                  {ACTIVITY_LABELS[activity]}
                </span>
              ))}
            </div>

            {/* Operating hours */}
            {location.operatingHours && (
              <div className="flex items-center gap-2 text-white/70 text-xs">
                <Clock className="size-3.5 shrink-0 text-duck-cyan/80" />
                <span>ساعات العمل: {location.operatingHours}</span>
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
              <Button
                className={cn(
                  "w-full rounded-full font-medium text-sm py-2.5 sm:py-2 min-h-[44px] sm:min-h-0 touch-manipulation",
                  location.status === "coming_soon"
                    ? "bg-white/10 text-white/50 cursor-not-allowed hover:bg-white/10"
                    : "bg-duck-yellow text-duck-navy hover:bg-duck-yellow-hover",
                )}
                disabled={location.status === "coming_soon"}
              >
                {location.status === "coming_soon" ? "قريباً" : "احجز الآن"}
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
