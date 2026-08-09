import Navbar from "@/components/landing/Navbar"
import { WhatsAppSupportFab } from "@/components/shared/whatsapp-support-fab"
import { FeedbackFab } from "@/components/feedback/feedback-fab"
import { SkipToContent } from "@/components/shared/skip-to-content"
import { InstallPrompt } from "@/components/shared/install-prompt"
import { JsonLd } from "@/components/seo/json-ld"
import { buildSiteGraph } from "@/lib/seo/json-ld"
import { getCatalogueSummary } from "@/server/services/public-content"

async function resolvePriceRange(): Promise<string> {
  try {
    const summary = await getCatalogueSummary()
    if (!summary.tripCount) return "EGP 180–850"
    return `${summary.currency} ${summary.minPrice}–${summary.maxPrice}`
  } catch {
    // DB unreachable at build/request time — fall back rather than break the page.
    return "EGP 180–850"
  }
}

export default async function LandingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const priceRange = await resolvePriceRange()
  const siteGraph = buildSiteGraph(priceRange)

  return (
    <>
      <JsonLd data={siteGraph} />
      <SkipToContent />
      <Navbar />
      {/* Must stay outside FullpageWrapper: fullPage.js reparents and measures
          the direct children of its wrapper. */}
      <main id="main-content">{children}</main>
      <WhatsAppSupportFab />
      <FeedbackFab />
      <InstallPrompt />
    </>
  )
}
