import Navbar from "@/components/landing/Navbar"
import { WhatsAppSupportFab } from "@/components/shared/whatsapp-support-fab"
import { SkipToContent } from "@/components/shared/skip-to-content"
import { SITE_CONTACT, SITE_NAME, SITE_URL } from "@/lib/site"

const businessJsonLd = {
  "@context": "https://schema.org",
  "@type": "SportsActivityLocation",
  name: SITE_NAME,
  description: "Water sports and Nile adventures in Aswan, Egypt.",
  url: SITE_URL,
  image: `${SITE_URL}/logo-transparent.png`,
  telephone: SITE_CONTACT.phone,
  email: SITE_CONTACT.email,
  hasMap: SITE_CONTACT.mapUrl,
  address: {
    "@type": "PostalAddress",
    streetAddress: SITE_CONTACT.street,
    addressLocality: SITE_CONTACT.city,
    addressCountry: SITE_CONTACT.country,
  },
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
