export interface GuestAgeCounts {
  adults: number
  kids_1_6: number
  kids_7_12: number
  kids: number
}

export function guestAgeBreakdown(b: {
  quantity?: number
  adults?: number
  kids_1_6?: number
  kids_7_12?: number
}): GuestAgeCounts {
  const kids_1_6 = b.kids_1_6 ?? 0
  const kids_7_12 = b.kids_7_12 ?? 0
  const kids = kids_1_6 + kids_7_12
  const adults = b.adults ?? Math.max(0, (b.quantity ?? 0) - kids)
  return { adults, kids_1_6, kids_7_12, kids }
}

export function resolveGuestBreakdown(input: {
  guests: number
  adults?: number
  kids_1_6?: number
  kids_7_12?: number
}): { adults: number; kids_1_6: number; kids_7_12: number } {
  const kids_1_6 = input.kids_1_6 ?? 0
  const kids_7_12 = input.kids_7_12 ?? 0
  const kids = kids_1_6 + kids_7_12
  const adults = input.adults ?? Math.max(0, input.guests - kids)
  if (adults + kids !== input.guests) {
    throw new Error(
      `guest breakdown mismatch: adults (${adults}) + kids (${kids}) !== guests (${input.guests})`,
    )
  }
  return { adults, kids_1_6, kids_7_12 }
}
