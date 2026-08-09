import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import Link from "next/link"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import Footer from "@/components/landing/Footer"
import { JsonLd } from "@/components/seo/json-ld"
import { buildBreadcrumbJsonLd } from "@/lib/seo/json-ld"
import { buildFaqJsonLd, getFaqEntries, type FaqEntry } from "@/lib/seo/faq"
import { SITE_URL } from "@/lib/site"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("faq.metadata")
  return {
    title: t("title"),
    description: t("description"),
    alternates: { canonical: "/faq" },
    openGraph: {
      title: t("title"),
      description: t("description"),
      url: "/faq",
    },
  }
}

/** Topical grouping of the 12 Q&A keys, for a richer page than the homepage accordion. */
const TOPIC_GROUPS: { titleKey: string; questions: number[] }[] = [
  { titleKey: "topicSafety", questions: [1, 2, 4, 6] },
  { titleKey: "topicPreparing", questions: [7, 8, 9] },
  { titleKey: "topicWhoFor", questions: [5, 3] },
  { titleKey: "topicBooking", questions: [10, 11, 12] },
]

export default async function FaqPage() {
  const t = await getTranslations("faq")
  const tPage = await getTranslations("faqPage")
  const entries = await getFaqEntries()
  const pageUrl = `${SITE_URL}/faq`

  const entryByIndex = new Map<number, FaqEntry>(
    entries.map((e, i) => [i + 1, e]),
  )

  const breadcrumbJsonLd = buildBreadcrumbJsonLd(
    [
      { name: tPage("breadcrumbHome"), url: SITE_URL },
      { name: tPage("breadcrumbFaq"), url: pageUrl },
    ],
    pageUrl,
  )
  const faqJsonLd = buildFaqJsonLd(entries, pageUrl)
  const pageGraph = {
    "@context": "https://schema.org",
    "@graph": [breadcrumbJsonLd, faqJsonLd],
  }

  return (
    <>
      <JsonLd data={pageGraph} />

      <section className="bg-duck-navy pt-28 md:pt-44 pb-16 px-4 md:px-10">
        <div className="max-w-3xl mx-auto">
          <Breadcrumb className="mb-6">
            <BreadcrumbList className="text-white/60">
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/" className="hover:text-white">
                    {tPage("breadcrumbHome")}
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="text-white">
                  {tPage("breadcrumbFaq")}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <span className="text-duck-cyan text-base block mb-4">
            {t("subtitle")}
          </span>
          <h1 className="text-white text-4xl md:text-5xl font-bold mb-5">
            {t("title")}
          </h1>
          <p className="text-white/70 text-base md:text-lg leading-relaxed">
            {t("description")}
          </p>
        </div>
      </section>

      <section className="bg-white py-16 px-4 md:px-10">
        <div className="max-w-3xl mx-auto space-y-12">
          {TOPIC_GROUPS.map((group) => (
            <div key={group.titleKey}>
              <h2 className="text-text-dark text-xl md:text-2xl font-bold mb-5">
                {tPage(group.titleKey)}
              </h2>
              <div className="space-y-6">
                {group.questions.map((n) => {
                  const entry = entryByIndex.get(n)
                  if (!entry) return null
                  return (
                    <div
                      key={n}
                      className="rounded-2xl bg-off-white border border-black/5 p-6"
                    >
                      <h3 className="text-text-dark font-semibold mb-2">
                        {entry.question}
                      </h3>
                      <p className="text-text-body leading-relaxed whitespace-pre-line">
                        {entry.answer}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}

          <div className="rounded-2xl bg-duck-cyan/10 border border-duck-cyan/20 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-text-dark font-semibold mb-1">
                {tPage("ctaTitle")}
              </h2>
              <p className="text-text-body text-sm">{tPage("ctaDescription")}</p>
            </div>
            <div className="flex gap-3 shrink-0">
              <Link
                href="/trips"
                className="inline-flex items-center rounded-full border border-duck-navy/20 px-5 py-2.5 text-sm font-semibold text-duck-navy hover:bg-white transition-colors"
              >
                {tPage("ctaViewTrips")}
              </Link>
              <Link
                href="/book"
                className="inline-flex items-center rounded-full bg-duck-yellow px-5 py-2.5 text-sm font-semibold text-duck-navy hover:bg-duck-yellow-hover transition-colors"
              >
                {t("bookNow")}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  )
}
