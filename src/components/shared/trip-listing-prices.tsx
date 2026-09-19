import { Tag } from "lucide-react"
import { formatCurrency } from "@/lib/constants"
import { cn } from "@/lib/utils"

/**
 * Only the price fields are read, so both the client `Trip` shape and the
 * server-rendered `PublicTrip` satisfy this without a cast.
 */
type PricedTrip = {
  price: number
  foreigner_price?: number | null
  currency: string
}

type TripListingPricesProps = {
  trip: PricedTrip
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
    <span className={cn("flex min-w-0 max-w-full flex-col gap-1.5 items-start", className)}>
      <span className={cn("text-duck-cyan font-semibold", mainPriceClassName)}>
        {formatCurrency(trip.foreigner_price!, trip.currency, locale)}
        {perHourEl}
      </span>
      <span className="inline-flex min-w-0 max-w-full flex-wrap items-center gap-1.5 rounded-2xl border-2 border-amber-400 bg-amber-100 px-3 py-1.5 text-start text-sm md:text-base font-bold leading-snug text-amber-900 shadow-sm break-words [overflow-wrap:anywhere]">
        <Tag className="size-4 shrink-0 text-amber-600" />
        {egyptiansOfferLabel}
      </span>
    </span>
  )
}
