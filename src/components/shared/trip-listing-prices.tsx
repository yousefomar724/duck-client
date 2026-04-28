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
}

export function TripListingPrices({
  trip,
  egyptiansOfferLabel,
  perHourSuffix,
  className,
  mainPriceClassName,
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
        {formatCurrency(trip.price, trip.currency)}
        {perHourEl}
      </span>
    )
  }

  return (
    <span className={cn("flex flex-col gap-1.5 items-start", className)}>
      <span className={cn("text-duck-cyan font-semibold", mainPriceClassName)}>
        {formatCurrency(trip.foreigner_price!, trip.currency)}
        {perHourEl}
      </span>
      <span className="inline-flex max-w-full rounded-full border border-emerald-200/70 bg-emerald-50 px-2.5 py-1 text-start text-xs font-semibold leading-snug text-emerald-900">
        {egyptiansOfferLabel}
      </span>
    </span>
  )
}
