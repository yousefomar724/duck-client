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
import { SITE_URL } from "@/lib/site"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("apiDocs.metadata")
  return {
    title: t("title"),
    description: t("description"),
    alternates: { canonical: "/docs/api" },
    openGraph: {
      title: t("title"),
      description: t("description"),
      url: "/docs/api",
    },
  }
}

const REST_ENDPOINTS = [
  { method: "GET", path: "/api/health", notes: "Liveness. { status: \"ok\" }" },
  {
    method: "GET",
    path: "/api/v1/trips",
    notes: "Filters: supplier_id, destination_id, lang=en|ar",
  },
  { method: "GET", path: "/api/v1/trips/{id}", notes: "Query: lang=en|ar" },
  {
    method: "GET",
    path: "/api/v1/destinations",
    notes: "Query: lang, status, public_status",
  },
  { method: "GET", path: "/api/v1/destinations/{id}", notes: "Query: lang" },
  { method: "GET", path: "/api/v1/suppliers", notes: "Query: lang" },
  { method: "GET", path: "/api/v1/suppliers/{id}", notes: "Query: lang" },
  { method: "GET", path: "/api/v1/tour-guides", notes: "List" },
  { method: "GET", path: "/api/v1/tour-guides/{id}", notes: "By id" },
  {
    method: "POST",
    path: "/api/v1/bookings/manual",
    notes: "Guest booking. Optional bearer. Requires PII the user supplied.",
  },
  {
    method: "POST",
    path: "/api/v1/feedback",
    notes: "rating 1–5. Optional comment, name, contact.",
  },
] as const

const MCP_TOOLS = [
  {
    name: "search_trips",
    notes: "Filter by query / max_price / guests. Includes book_url.",
  },
  { name: "get_trip", notes: "Slug or 24-hex id. Includes book_url." },
  { name: "list_destinations", notes: "Meeting points." },
  {
    name: "check_availability",
    notes: "kayak | water_cycle | sup on YYYY-MM-DD. Shortage is a result, not a tool error.",
  },
  {
    name: "get_business_info",
    notes: "Hours, dual EGP tiers, InstaPay/cash, languages, contact.",
  },
] as const

export default async function ApiDocsPage() {
  const t = await getTranslations("apiDocs")
  const tCommon = await getTranslations("common")
  const pageUrl = `${SITE_URL}/docs/api`
  const breadcrumbJsonLd = buildBreadcrumbJsonLd(
    [
      { name: tCommon("home"), url: SITE_URL },
      { name: t("breadcrumb"), url: pageUrl },
    ],
    pageUrl,
  )

  return (
    <>
      <JsonLd data={{ "@context": "https://schema.org", ...breadcrumbJsonLd }} />

      <section className="bg-duck-navy pt-28 md:pt-44 pb-16 px-4 md:px-10">
        <div className="max-w-5xl mx-auto">
          <Breadcrumb className="mb-6">
            <BreadcrumbList className="text-white/60">
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/" className="hover:text-white">
                    {tCommon("home")}
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="text-white">
                  {t("breadcrumb")}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <h1 className="text-white text-4xl md:text-5xl font-bold mb-5">
            {t("title")}
          </h1>
          <p className="text-white/70 text-base md:text-lg leading-relaxed max-w-2xl">
            {t("lede")}
          </p>
        </div>
      </section>

      <section className="bg-white py-16 px-4 md:px-10">
        <div className="max-w-5xl mx-auto space-y-16 text-text-body">
          <div>
            <h2 className="text-text-dark text-2xl font-bold mb-3">
              {t("restTitle")}
            </h2>
            <p className="mb-6 leading-relaxed">{t("restBody")}</p>
            <div className="overflow-x-auto rounded-2xl border border-black/5">
              <table className="w-full text-sm">
                <thead className="bg-off-white text-text-dark">
                  <tr>
                    <th className="text-start font-semibold px-4 py-3">
                      {t("colMethod")}
                    </th>
                    <th className="text-start font-semibold px-4 py-3">
                      {t("colPath")}
                    </th>
                    <th className="text-start font-semibold px-4 py-3">
                      {t("colNotes")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {REST_ENDPOINTS.map((row) => (
                    <tr key={`${row.method}-${row.path}`} className="border-t border-black/5">
                      <td className="px-4 py-3 font-mono text-duck-cyan whitespace-nowrap">
                        {row.method}
                      </td>
                      <td className="px-4 py-3 font-mono text-text-dark">
                        {row.path}
                      </td>
                      <td className="px-4 py-3">{row.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-sm">
              {t("specLead")}{" "}
              <a href="/openapi.json" className="text-duck-cyan hover:underline">
                /openapi.json
              </a>
            </p>
          </div>

          <div>
            <h2 className="text-text-dark text-2xl font-bold mb-3">
              {t("mcpTitle")}
            </h2>
            <p className="mb-6 leading-relaxed">{t("mcpBody")}</p>
            <pre className="overflow-x-auto rounded-2xl bg-duck-navy p-4 text-sm text-white mb-6">
              {`${SITE_URL}/api/mcp`}
            </pre>
            <ul className="space-y-2">
              {MCP_TOOLS.map((tool) => (
                <li key={tool.name}>
                  <code className="text-duck-navy font-semibold">{tool.name}</code>
                  <span className="text-text-muted"> — {tool.notes}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 leading-relaxed">{t("mcpHandoff")}</p>
          </div>

          <div>
            <h2 className="text-text-dark text-2xl font-bold mb-3">
              {t("authTitle")}
            </h2>
            <p className="leading-relaxed">
              {t("authBody")}{" "}
              <a href="/auth.md" className="text-duck-cyan hover:underline">
                /auth.md
              </a>
              .
            </p>
          </div>

          <div>
            <h2 className="text-text-dark text-2xl font-bold mb-3">
              {t("discoverTitle")}
            </h2>
            <ul className="space-y-2">
              <li>
                <a
                  href="/.well-known/api-catalog"
                  className="text-duck-cyan hover:underline"
                >
                  /.well-known/api-catalog
                </a>
              </li>
              <li>
                <a
                  href="/.well-known/mcp/server-card.json"
                  className="text-duck-cyan hover:underline"
                >
                  /.well-known/mcp/server-card.json
                </a>
              </li>
              <li>
                <a
                  href="/.well-known/agent-skills/index.json"
                  className="text-duck-cyan hover:underline"
                >
                  /.well-known/agent-skills/index.json
                </a>
              </li>
              <li>
                <a
                  href="/.well-known/ai-catalog.json"
                  className="text-duck-cyan hover:underline"
                >
                  /.well-known/ai-catalog.json
                </a>
              </li>
              <li>
                <a href="/llms-full.txt" className="text-duck-cyan hover:underline">
                  /llms-full.txt
                </a>
              </li>
            </ul>
          </div>
        </div>
      </section>

      <Footer />
    </>
  )
}
