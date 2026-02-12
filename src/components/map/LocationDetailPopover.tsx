"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Popover,
  PopoverContent,
  PopoverAnchor,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { ACTIVITY_LABELS, type WaterActivityLocation } from "./map-data"

interface LocationDetailPopoverProps {
  location: WaterActivityLocation | null
  open: boolean
  onOpenChange: (open: boolean) => void
  anchorPoint: { x: number; y: number }
}

export default function LocationDetailPopover({
  location,
  open,
  onOpenChange,
  anchorPoint,
}: LocationDetailPopoverProps) {
  const [side, setSide] = useState<"right" | "bottom">("right")

  useEffect(() => {
    const m = window.matchMedia("(max-width: 640px)")
    const update = () => setSide(m.matches ? "bottom" : "right")
    update()
    m.addEventListener("change", update)
    return () => m.removeEventListener("change", update)
  }, [])

  if (!location) return null

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      {/* Invisible anchor positioned at the marker's screen coordinates */}
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
          "bg-duck-navy-deep text-white border-none p-0 overflow-hidden rounded-xl shadow-2xl z-40",
          "w-[340px] max-w-[min(340px,calc(100vw-2rem))]",
          side === "bottom" && "pb-[env(safe-area-inset-bottom)] mx-2",
        )}
      >
        {/* Image */}
        <div className="relative w-full aspect-video">
          <Image
            src={location.image}
            alt={location.name}
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-linear-to-t from-duck-navy-deep via-transparent to-transparent" />

          {/* Close button */}
          <button
            onClick={() => onOpenChange(false)}
            className="absolute top-3 start-3 z-10 w-7 h-7 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white/80 hover:text-white hover:bg-black/60 transition-colors cursor-pointer"
          >
            <X className="size-3.5" />
          </button>

          {/* Brand tag */}
          <div className="absolute top-3 end-3 z-10 text-white/60 text-xs font-medium">
            أسوان
          </div>

          {/* Location name overlay */}
          <div className="absolute bottom-3 start-3 end-3 z-10">
            <p className="text-white/60 text-xs mb-0.5">موقع النشاط</p>
            <h3 className="text-white text-lg font-bold leading-tight">
              {location.name}
            </h3>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 flex flex-col gap-3">
          {/* Status */}
          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-duck-cyan" />
            <span
              className={cn(
                "text-xs font-medium",
                location.status === "coming_soon"
                  ? "text-duck-yellow"
                  : "text-duck-cyan",
              )}
            >
              {location.status === "coming_soon"
                ? "الافتتاح قريباً"
                : "متاح الآن"}
            </span>
            <div className="h-px flex-1 bg-duck-cyan" />
          </div>

          {/* Description */}
          <p className="text-white/70 text-xs leading-relaxed line-clamp-3">
            {location.description}
          </p>

          {/* Activity tags */}
          <div className="flex flex-wrap gap-1.5">
            {location.activities.map((activity) => (
              <span
                key={activity}
                className="px-2.5 py-0.5 rounded-full bg-white/10 text-white/80 text-xs font-medium"
              >
                {ACTIVITY_LABELS[activity]}
              </span>
            ))}
          </div>

          {/* CTA */}
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
      </PopoverContent>
    </Popover>
  )
}
