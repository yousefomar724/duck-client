import type { Metadata } from "next"
import { getLocale, getTranslations } from "next-intl/server"
import { notFound, permanentRedirect } from "next/navigation"
import Link from "next/link"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { RichText } from "@/components/shared/rich-text"
import Footer from "@/components/landing/Footer"
import { TripImageGallery } from "@/components/landing/trip-image-gallery"
import { JsonLd } from "@/components/seo/json-ld"
import { buildBreadcrumbJsonLd, buildTripJsonLd } from "@/lib/seo/json-ld"
import { canonicalTripPath, extractObjectId, tripSlug } from "@/lib/seo/slug"
import { getTripBySlug, type PublicTrip } from "@/server/services/public-content"
import { formatCurrency } from "@/lib/constants"
import { parseDurationHours, tripDurationText } from "@/lib/trips/duration"
import { SITE_CONTACT, SITE_NAME, SITE_URL } from "@/lib/site"
import { buildWhatsAppHref } from "@/lib/support-contact"
import { Phone } from "lucide-react"

interface PageProps {
  params: Promise<{ slug: string }>
}

async function resolveTrip(slug: string, locale: string): Promise<PublicTrip> {
  const trip = await getTripBySlug(slug, locale)
  if (!trip) notFound()

  const canonicalSlug = tripSlug(trip)
  const requestedId = extractObjectId(slug)
  if (requestedId && slug !== canonicalSlug) {
    permanentRedirect(canonicalTripPath(trip))
  }

  return trip
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params
  const locale = await getLocale()
  const trip = await getTripBySlug(slug, locale)
  if (!trip) return {}

  const t = await getTranslations("tripPage")
  const path = canonicalTripPath(trip)
  const hasForeignerPrice = trip.foreigner_price > 0
  const durationText = tripDurationText(trip, locale)
  const description = durationText
    ? hasForeignerPrice
      ? t("metaDescriptionDualText", {
          name: trip.name,
          duration: durationText,
          priceLocal: trip.price,
          priceForeign: trip.foreigner_price,
        })
      : t("metaDescriptionSingleText", {
          name: trip.name,
          duration: durationText,
          priceLocal: trip.price,
        })
    : hasForeignerPrice
      ? t("metaDescriptionDual", {
          name: trip.name,
          duration: trip.duration || 1,
          priceLocal: trip.price,
          priceForeign: trip.foreigner_price,
        })
      : t("metaDescriptionSingle", {
          name: trip.name,
          duration: trip.duration || 1,
          priceLocal: trip.price,
        })

  return {
    title: t("metaTitle", { name: trip.name }),
    description,
    alternates: { canonical: path },
    openGraph: {
      title: t("metaTitle", { name: trip.name }),
      description,
      url: path,
      images: trip.images.length
        ? [trip.images[0].startsWith("http") ? trip.images[0] : `${SITE_URL}${trip.images[0]}`]
        : undefined,
    },
  }
}

export default async function TripDetailPage({ params }: PageProps) {
  const { slug } = await params
  const locale = await getLocale()
  const trip = await resolveTrip(slug, locale)
  const t = await getTranslations("tripPage")
  const tFaq = await getTranslations("faq")

  const path = canonicalTripPath(trip)
  const pageUrl = `${SITE_URL}${path}`
  const hasForeignerPrice = trip.foreigner_price > 0
  const destination = trip.destinations[0]?.name
  const duration = trip.duration || 1
  const durationText = tripDurationText(trip, locale)

  const summary = durationText
    ? hasForeignerPrice
      ? t("summaryDualText", {
          name: trip.name,
          duration: durationText,
          destination: destination ?? SITE_CONTACT.city,
          priceLocal: formatCurrency(trip.price, trip.currency, locale),
          priceForeign: formatCurrency(trip.foreigner_price, trip.currency, locale),
          maxGuests: trip.max_guests,
          siteName: SITE_NAME,
        })
      : t("summarySingleText", {
          name: trip.name,
          duration: durationText,
          destination: destination ?? SITE_CONTACT.city,
          priceLocal: formatCurrency(trip.price, trip.currency, locale),
          maxGuests: trip.max_guests,
          siteName: SITE_NAME,
        })
    : hasForeignerPrice
      ? t("summaryDual", {
          name: trip.name,
          duration,
          destination: destination ?? SITE_CONTACT.city,
          priceLocal: formatCurrency(trip.price, trip.currency, locale),
          priceForeign: formatCurrency(trip.foreigner_price, trip.currency, locale),
          maxGuests: trip.max_guests,
          siteName: SITE_NAME,
        })
      : t("summarySingle", {
          name: trip.name,
          duration,
          destination: destination ?? SITE_CONTACT.city,
          priceLocal: formatCurrency(trip.price, trip.currency, locale),
          maxGuests: trip.max_guests,
          siteName: SITE_NAME,
        })

  const guideLabel = trip.guide_mandatory
    ? t("factGuideMandatory")
    : trip.guide_price > 0
      ? t("factGuideOptional")
      : t("factGuideNone")

  const bookHref = `/book?trip=${trip.id}`
  const whatsappHref = buildWhatsAppHref(
    `${tFaq("transportWhatsappPrefill")} (${trip.name})`,
  )

  const breadcrumbJsonLd = buildBreadcrumbJsonLd(
    [
      { name: t("breadcrumbHome"), url: SITE_URL },
      { name: t("breadcrumbTrips"), url: `${SITE_URL}/trips` },
      { name: trip.name, url: pageUrl },
    ],
    pageUrl,
  )
  const tripJsonLd = buildTripJsonLd(trip)

  const defaultFaqEntries = trip.hide_default_faqs
    ? []
    : [
        {
          q: t("faqPriceQ", { name: trip.name }),
          a: hasForeignerPrice
            ? t("faqPriceADual", {
                name: trip.name,
                priceLocal: trip.price,
                priceForeign: trip.foreigner_price,
              })
            : t("faqPriceASingle", { name: trip.name, priceLocal: trip.price }),
        },
        {
          q: t("faqDurationQ", { name: trip.name }),
          a: durationText
            ? t("faqDurationAText", { name: trip.name, duration: durationText })
            : t("faqDurationA", { name: trip.name, duration }),
        },
        {
          q: t("faqGroupQ", { name: trip.name }),
          a: t("faqGroupA", { name: trip.name, maxGuests: trip.max_guests }),
        },
        destination
          ? {
              q: t("faqMeetQ", { name: trip.name }),
              a: t("faqMeetA", { name: trip.name, destination }),
            }
          : null,
        trip.cancelation_policy
          ? {
              q: t("faqCancelQ", { name: trip.name }),
              a: trip.cancelation_policy,
            }
          : null,
        { q: tFaq("q2"), a: tFaq("a2") },
      ].filter((e): e is { q: string; a: string } => e != null)

  const faqEntries = [...trip.faqs, ...defaultFaqEntries]

  const faqJsonLd = {
    "@type": "FAQPage",
    "@id": `${pageUrl}#faq`,
    mainEntity: faqEntries.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  }

  const pageGraph = {
    "@context": "https://schema.org",
    "@graph": [breadcrumbJsonLd, tripJsonLd, faqJsonLd],
  }

  return (
    <>
      <JsonLd data={pageGraph} />

      <section className="bg-duck-navy pt-28 md:pt-40 pb-10 px-4 md:px-10">
        <div className="max-w-4xl mx-auto">
          <Breadcrumb className="mb-6">
            <BreadcrumbList className="text-white/70">
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/" className="hover:text-white">
                    {t("breadcrumbHome")}
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/trips" className="hover:text-white">
                    {t("breadcrumbTrips")}
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage
                  className="text-white max-w-[60vw] truncate md:max-w-none"
                  title={trip.name}
                >
                  {trip.name}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <h1 className="text-white text-3xl md:text-5xl font-bold mb-5">
            {trip.name}
          </h1>
          <p className="text-white/80 text-base md:text-lg leading-relaxed max-w-3xl">
            {summary}
          </p>
        </div>
      </section>

      <section className="bg-white pt-10 pb-4 px-4 md:px-10">
        <div className="max-w-4xl mx-auto">
          <TripImageGallery images={trip.images} alt={trip.name} />
        </div>
      </section>

      <section className="bg-white py-10 px-4 md:px-10">
        <div className="max-w-4xl mx-auto grid md:grid-cols-3 gap-10">
          <div className="md:col-span-2 space-y-10">
            <div>
              <h2 className="text-text-dark text-xl font-bold mb-4">
                {t("priceTableTitle")}
              </h2>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{" "}</TableHead>
                    <TableHead className="text-end">
                      {t("priceTableTitle")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>{t("priceEgyptian")}</TableCell>
                    <TableCell className="text-end font-semibold text-duck-cyan">
                      {formatCurrency(trip.price, trip.currency, locale)}
                    </TableCell>
                  </TableRow>
                  {hasForeignerPrice && (
                    <TableRow>
                      <TableCell>{t("priceForeign")}</TableCell>
                      <TableCell className="text-end font-semibold text-duck-cyan">
                        {formatCurrency(trip.foreigner_price, trip.currency, locale)}
                      </TableCell>
                    </TableRow>
                  )}
                  {trip.guide_price > 0 && (
                    <TableRow>
                      <TableCell>
                        {t("priceGuide")}{" "}
                        <span className="text-text-muted text-xs">
                          (
                          {trip.guide_mandatory
                            ? t("priceGuideMandatory")
                            : t("priceGuideOptional")}
                          )
                        </span>
                      </TableCell>
                      <TableCell className="text-end font-semibold text-duck-cyan">
                        {formatCurrency(trip.guide_price, trip.currency, locale)}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {trip.description && (
              <div>
                <h2 className="text-text-dark text-xl font-bold mb-3">
                  {t("includedTitle")}
                </h2>
                <RichText text={trip.description} className="text-text-body leading-relaxed" />
              </div>
            )}

            {trip.itinerary && (
              <div>
                <h2 className="text-text-dark text-xl font-bold mb-3">
                  {t("itineraryTitle")}
                </h2>
                <RichText text={trip.itinerary} className="text-text-body leading-relaxed" />
              </div>
            )}

            {trip.availability && (
              <div>
                <h2 className="text-text-dark text-xl font-bold mb-3">
                  {t("availabilityTitle")}
                </h2>
                <RichText text={trip.availability} className="text-text-body leading-relaxed" />
              </div>
            )}

            {trip.cancelation_policy && (
              <div>
                <h2 className="text-text-dark text-xl font-bold mb-3">
                  {t("cancellationTitle")}
                </h2>
                <RichText text={trip.cancelation_policy} className="text-text-body leading-relaxed" />
              </div>
            )}

            {(trip.meeting_point || destination) && (
              <div>
                <h2 className="text-text-dark text-xl font-bold mb-3">
                  {t("meetingTitle")}
                </h2>
                <p className="text-text-body leading-relaxed mb-3">
                  {trip.meeting_point ||
                    `${destination}, ${SITE_CONTACT.city}, ${SITE_CONTACT.country}`}
                </p>
                <a
                  href={trip.map_url || SITE_CONTACT.mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-duck-cyan font-medium hover:underline"
                >
                  {t("meetingCta")}
                </a>
              </div>
            )}

            <div>
              <h2 className="text-text-dark text-xl font-bold mb-4">
                {t("faqTitle")}
              </h2>
              {/* Answers of collapsed items leave the DOM, but every Q&A is
                  still published in the FAQPage JSON-LD above. */}
              <Accordion
                type="single"
                collapsible
                defaultValue={faqEntries.length ? "faq-0" : undefined}
                className="rounded-xl bg-off-white border border-black/5 px-5"
              >
                {faqEntries.map(({ q, a }, index) => (
                  <AccordionItem
                    key={q}
                    value={`faq-${index}`}
                    className="border-black/5"
                  >
                    <AccordionTrigger className="text-text-dark font-semibold text-base hover:no-underline">
                      {q}
                    </AccordionTrigger>
                    <AccordionContent>
                      <RichText
                        text={a}
                        className="text-text-body text-sm leading-relaxed"
                      />
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>

          <aside className="order-first md:order-none">
            <div className="sticky top-24 md:top-32 max-h-[calc(100dvh-9rem)] overflow-y-auto rounded-2xl bg-off-white border border-black/5 p-6 space-y-5">
              <h2 className="sr-only">{t("factsTitle")}</h2>
              <dl className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="text-text-muted">{t("factDuration")}</dt>
                  <dd className="font-medium text-text-dark">
                    {(() => {
                      const parsedHours = durationText
                        ? parseDurationHours(durationText)
                        : duration
                      const label = durationText
                        ? t("factDurationValueText", { duration: durationText })
                        : t("factDurationValue", { duration })
                      return parsedHours ? (
                        <time dateTime={`PT${parsedHours}H`}>{label}</time>
                      ) : (
                        label
                      )
                    })()}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-text-muted">{t("factMaxGuests")}</dt>
                  <dd className="font-medium text-text-dark">
                    {t("factMaxGuestsValue", { count: trip.max_guests })}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-text-muted">{t("factRefundable")}</dt>
                  <dd className="font-medium text-text-dark">
                    {trip.refundable
                      ? t("factRefundableYes")
                      : t("factRefundableNo")}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-text-muted">{t("factGuide")}</dt>
                  <dd className="font-medium text-text-dark">{guideLabel}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-text-muted">{t("factOperator")}</dt>
                  <dd className="font-medium text-text-dark">
                    {trip.supplier?.name ?? SITE_NAME}
                  </dd>
                </div>
              </dl>

              <div className="space-y-2 pt-2">
                <Link
                  href={bookHref}
                  className="block w-full text-center rounded-full bg-duck-yellow px-5 py-3 text-sm font-semibold text-duck-navy hover:bg-duck-yellow-hover transition-colors"
                >
                  {t("ctaBook")}
                </Link>
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full text-center rounded-full border border-duck-navy/20 px-5 py-3 text-sm font-semibold text-duck-navy hover:bg-white transition-colors"
                >
                  {t("ctaWhatsapp")}
                </a>
                <a
                  href={`tel:${SITE_CONTACT.phone}`}
                  className="flex items-center justify-center gap-2 w-full text-center rounded-full border border-duck-navy/20 px-5 py-3 text-sm font-semibold text-duck-navy hover:bg-white transition-colors"
                >
                  <Phone className="size-4" aria-hidden="true" />
                  {t("ctaCall")}
                </a>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <Footer />
    </>
  )
}
