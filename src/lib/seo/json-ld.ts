import { SITE_CONTACT, SITE_NAME, SITE_URL } from "@/lib/site"
import { canonicalDestinationPath, canonicalTripPath } from "@/lib/seo/slug"
import type { PublicDestination, PublicTrip } from "@/server/services/public-content"

export const ORGANIZATION_ID = `${SITE_URL}/#organization`
export const WEBSITE_ID = `${SITE_URL}/#website`
export const BUSINESS_ID = `${SITE_URL}/#business`

export function buildOrganizationJsonLd() {
  return {
    "@type": "Organization",
    "@id": ORGANIZATION_ID,
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/logo-transparent.png`,
    email: SITE_CONTACT.email,
    telephone: SITE_CONTACT.phone,
    sameAs: SITE_CONTACT.social,
  }
}

export function buildWebsiteJsonLd() {
  return {
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    name: SITE_NAME,
    url: SITE_URL,
    publisher: { "@id": ORGANIZATION_ID },
    inLanguage: "en",
  }
}

export function buildBusinessJsonLd(priceRange: string) {
  return {
    "@type": "SportsActivityLocation",
    "@id": BUSINESS_ID,
    parentOrganization: { "@id": ORGANIZATION_ID },
    name: SITE_NAME,
    description:
      "Kayaking and water sports on the Nile in Aswan, Egypt.",
    url: SITE_URL,
    image: `${SITE_URL}/og-nile-sunset.jpg`,
    logo: `${SITE_URL}/logo-transparent.png`,
    telephone: SITE_CONTACT.phone,
    email: SITE_CONTACT.email,
    hasMap: SITE_CONTACT.mapUrl,
    address: {
      "@type": "PostalAddress",
      streetAddress: SITE_CONTACT.street,
      addressLocality: SITE_CONTACT.city,
      addressCountry: SITE_CONTACT.country,
    },
    // Aswan Governorate seat — used for "near me" placement, not a
    // specific island meeting point (those live on destination records).
    geo: {
      "@type": "GeoCoordinates",
      latitude: 24.0889,
      longitude: 32.8998,
    },
    areaServed: { "@type": "AdministrativeArea", name: "Aswan Governorate" },
    // "Dawn to sunset, daily, by advance booking" — approximated to the
    // widest civil-daylight window in Aswan so it reads as open year-round.
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
          "Sunday",
        ],
        opens: "05:30",
        closes: "18:30",
      },
    ],
    priceRange,
    currenciesAccepted: "EGP",
    paymentAccepted: "InstaPay, Cash",
    sport: ["Kayaking", "Stand-up paddleboarding"],
    sameAs: SITE_CONTACT.social,
  }
}

/** Root graph shared by every page in the (landing) layout. */
export function buildSiteGraph(priceRange: string) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      buildOrganizationJsonLd(),
      buildWebsiteJsonLd(),
      buildBusinessJsonLd(priceRange),
    ],
  }
}

export function buildBreadcrumbJsonLd(
  items: { name: string; url: string }[],
  pageUrl: string,
) {
  return {
    "@type": "BreadcrumbList",
    "@id": `${pageUrl}#breadcrumb`,
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  }
}

/**
 * Multi-typed TouristTrip+Product under one @id: TouristTrip alone has no
 * price property, and price is the fact people ask LLMs for. Product/Offer
 * is what Google's parsers and LLM retrieval pipelines actually read;
 * TouristTrip adds touristType/itinerary/provider semantics on top.
 */
export function buildTripJsonLd(trip: PublicTrip) {
  const pageUrl = `${SITE_URL}${canonicalTripPath(trip)}`
  const tripId = `${pageUrl}#trip`
  const hasForeignerPrice = trip.foreigner_price > 0
  const prices = hasForeignerPrice
    ? [trip.price, trip.foreigner_price]
    : [trip.price]
  const bookUrl = `${SITE_URL}/book?trip=${trip.id}`
  const validFrom = trip.from

  const offers = hasForeignerPrice
    ? {
        "@type": "AggregateOffer",
        priceCurrency: trip.currency,
        lowPrice: Math.min(...prices),
        highPrice: Math.max(...prices),
        offerCount: 2,
        offers: [
          {
            "@type": "Offer",
            name: "Egyptian residents",
            price: trip.price,
            priceCurrency: trip.currency,
            availability: "https://schema.org/InStock",
            url: bookUrl,
            validFrom,
            seller: { "@id": ORGANIZATION_ID },
          },
          {
            "@type": "Offer",
            name: "Foreign visitors",
            price: trip.foreigner_price,
            priceCurrency: trip.currency,
            availability: "https://schema.org/InStock",
            url: bookUrl,
            validFrom,
            seller: { "@id": ORGANIZATION_ID },
          },
        ],
      }
    : {
        "@type": "Offer",
        price: trip.price,
        priceCurrency: trip.currency,
        availability: "https://schema.org/InStock",
        url: bookUrl,
        validFrom,
        seller: { "@id": ORGANIZATION_ID },
      }

  return {
    "@type": ["TouristTrip", "Product"],
    "@id": tripId,
    name: trip.name,
    description: trip.description,
    url: pageUrl,
    image: trip.images.map((img) => (img.startsWith("http") ? img : `${SITE_URL}${img}`)),
    duration: trip.duration ? `PT${trip.duration}H` : undefined,
    maximumAttendeeCapacity: trip.max_guests,
    inLanguage: "en",
    provider: { "@id": ORGANIZATION_ID },
    offers,
  }
}

export function buildDestinationJsonLd(destination: PublicDestination) {
  const pageUrl = `${SITE_URL}${canonicalDestinationPath(destination)}`

  return {
    "@type": "TouristAttraction",
    "@id": `${pageUrl}#attraction`,
    name: destination.name,
    description: destination.description,
    url: pageUrl,
    image: destination.images.length
      ? destination.images.map((img) => (img.startsWith("http") ? img : `${SITE_URL}${img}`))
      : destination.image
        ? [destination.image.startsWith("http") ? destination.image : `${SITE_URL}${destination.image}`]
        : undefined,
    geo:
      destination.lat != null && destination.lng != null
        ? {
            "@type": "GeoCoordinates",
            latitude: destination.lat,
            longitude: destination.lng,
          }
        : undefined,
    containedInPlace: { "@type": "City", name: "Aswan" },
    isAccessibleForFree: false,
  }
}
