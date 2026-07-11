import { Tag } from "lucide-react"
import type { Trip } from "@/lib/types"
import { formatCurrency } from "@/lib/constants"
import { cn } from "@/lib/utils"

type TripListingPricesProps = {
  trip: Trip
  /** Fully translated string including the local price (e.g. special-offer sentence). */
  egyptiansOfferLabel: string
  perHourSuffix?: string
  className?: string
  /** Applied to the main amount line when two-tier pricing exists, and to single-tier price. */
  mainPriceClassName?: string
  locale?: string
}

export function TripListingPrices({
  trip,
  egyptiansOfferLabel,
  perHourSuffix,
  className,
  mainPriceClassName,
  locale,
}: TripListingPricesProps) {
  const hasForeigner = (trip.foreigner_price ?? 0) > 0
  const perHourEl = perHourSuffix ? (
    <span className="font-normal text-duck-cyan/70">{` ${perHourSuffix}`}</span>
  ) : null

  if (!hasForeigner) {
    return (
      <span
        className={cn(
          "text-duck-cyan font-semibold",
          mainPriceClassName,
          className,
        )}
      >
        {formatCurrency(trip.price, trip.currency, locale)}
        {perHourEl}
      </span>
    )
  }

  return (
    <span className={cn("flex flex-col gap-1.5 items-start", className)}>
      <span className={cn("text-duck-cyan font-semibold", mainPriceClassName)}>
        {formatCurrency(trip.foreigner_price!, trip.currency, locale)}
        {perHourEl}
      </span>
      <span className="inline-flex items-center gap-1.5 max-w-full rounded-full border-2 border-amber-400 bg-amber-100 px-3 py-1.5 text-start text-sm md:text-base font-bold leading-snug text-amber-900 shadow-sm">
        <Tag className="size-4 shrink-0 text-amber-600" />
        {egyptiansOfferLabel}
      </span>
    </span>
  )
}
