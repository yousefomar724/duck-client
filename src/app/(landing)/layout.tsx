import Navbar from "@/components/landing/Navbar"
import { WhatsAppSupportFab } from "@/components/shared/whatsapp-support-fab"
import { SkipToContent } from "@/components/shared/skip-to-content"
import { SITE_CONTACT, SITE_NAME, SITE_URL } from "@/lib/site"

const businessJsonLd = {
  "@context": "https://schema.org",
  "@type": "SportsActivityLocation",
  "@id": `${SITE_URL}/#business`,
  name: SITE_NAME,
  description:
    "Kayaking, stand-up paddleboarding and water bike trips on the Nile around Elephantine Island in Aswan, Egypt.",
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
  // Matches the seeded Elephantine Island meeting point. Coordinates are what
  // let Google place the business on the map for "near me" style searches.
  geo: {
    "@type": "GeoCoordinates",
    latitude: 24.0867,
    longitude: 32.8895,
  },
  areaServed: {
    "@type": "City",
    name: "Aswan",
  },
  // "Dawn to sunset, daily, by advance booking" — approximated to the widest
  // civil-daylight window in Aswan so the business reads as open year-round.
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
  // Broad band covering local and foreigner rates across both tours. Revisit
  // if pricing moves materially — mismatched structured data hurts more than
  // omitting it.
  priceRange: "EGP 180–850",
  currenciesAccepted: "EGP",
  paymentAccepted: "InstaPay, Cash",
  sport: ["Kayaking", "Stand-up paddleboarding"],
  sameAs: SITE_CONTACT.social,
}

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <script
        type="application/ld+json"
        // Static object built at module scope — no user input reaches this.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(businessJsonLd) }}
      />
      <SkipToContent />
      <Navbar />
      {/* Must stay outside FullpageWrapper: fullPage.js reparents and measures
          the direct children of its wrapper. */}
      <main id="main-content">{children}</main>
      <WhatsAppSupportFab />
    </>
  )
}
