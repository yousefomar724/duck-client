"use client"

import { Ship, Sailboat, Bike, Waves } from "lucide-react"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import { ACTIVITY_FILTERS, type ActivityType } from "./map-data"
import type { MapStyle } from "./MapView"

const FILTER_ICONS: Record<string, React.ElementType> = {
  all: Waves,
  kayak: Ship,
  sup: Sailboat,
  waterbike: Bike,
}

interface ActivityFiltersProps {
  activeFilter: ActivityType | "all"
  onFilterChange: (filter: ActivityType | "all") => void
  mapStyle: MapStyle
}

export default function ActivityFilters({
  activeFilter,
  onFilterChange,
  mapStyle,
}: ActivityFiltersProps) {
  const isDark = mapStyle === "dark"

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className={cn(
        "mx-auto w-fit max-w-full flex items-center gap-1.5 sm:gap-2 rounded-full px-1.5 sm:px-2 py-1.5 sm:py-2 shadow-lg overflow-x-auto [&::-webkit-scrollbar]:hidden",
        isDark
          ? "bg-duck-navy/80 backdrop-blur-md"
          : "bg-white/90 backdrop-blur-md border border-black/10",
      )}
      style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
    >
      {ACTIVITY_FILTERS.map((filter) => {
        const Icon = FILTER_ICONS[filter.id]
        const isActive = activeFilter === filter.id
        return (
          <button
            key={filter.id}
            onClick={() => onFilterChange(filter.id)}
            className={cn(
              "flex items-center gap-1.5 sm:gap-2 px-3 py-2 sm:px-4 rounded-full text-xs sm:text-sm font-medium transition-all duration-200 cursor-pointer whitespace-nowrap shrink-0 touch-manipulation min-h-[44px] sm:min-h-0",
              isActive
                ? "bg-duck-cyan text-white shadow-lg"
                : isDark
                  ? "bg-white/10 text-white/70 hover:bg-white/20 hover:text-white"
                  : "bg-transparent text-duck-navy/60 hover:bg-black/5 hover:text-duck-navy",
            )}
          >
            <Icon className="size-3.5 sm:size-4 shrink-0 hidden sm:block" />
            <span>{filter.label}</span>
          </button>
        )
      })}
    </motion.div>
  )
}
