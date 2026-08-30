import { SITE_URL } from "@/lib/site"

/**
 * robots.txt has no inheritance: a user-agent that matches a specific block
 * ignores the `*` block entirely. Deriving every rule from this one list
 * makes it structurally impossible for a named agent to fall through to an
 * unfiltered default and see /admin, /api, or /profile.
 */
const PRIVATE_PATHS = [
  "/admin",
  "/supplier",
  "/profile",
  "/my-bookings",
  "/booking",
  "/api",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
]

/**
 * Retrieval / live-search agents: fetch on demand to answer a query and cite
 * the source with a link. These are the actual citation path into ChatGPT,
 * Perplexity, Copilot and similar answer engines.
 */
const AI_RETRIEVAL_AGENTS = [
  "OAI-SearchBot",
  "ChatGPT-User",
  "Claude-User",
  "Claude-SearchBot",
  "PerplexityBot",
  "Perplexity-User",
  "Amazonbot",
]

/**
 * Training-corpus crawlers. Blocking these buys nothing for a small public
 * business (there's no IP to protect here) and costs being recalled at all
 * when someone asks an LLM a question with no live web search involved.
 * Note Google-Extended only gates Gemini/Vertex training and grounding — it
 * has no effect on Google Search indexing, a common misreading.
 */
const AI_TRAINING_AGENTS = [
  "GPTBot",
  "ClaudeBot",
  "Google-Extended",
  "Applebot-Extended",
  "Meta-ExternalAgent",
  "CCBot",
]

/**
 * Read-only public API. Longest-match wins over `Disallow: /api` so robots.txt
 * does not contradict the API catalog.
 */
const PUBLIC_API_PATHS = [
  "/api/health",
  "/api/v1/trips",
  "/api/v1/destinations",
  "/api/v1/suppliers",
  "/api/v1/tour-guides",
  "/api/mcp",
]

const CONTENT_SIGNAL = "search=yes, ai-input=yes, ai-train=yes"

/**
 * Contentsignals.org comment preamble. The three signal definitions are the
 * contract crawlers that honour Content-Signal are asked to follow.
 */
const CONTENT_SIGNAL_PREAMBLE = `# As a condition of accessing this website, you agree to
# abide by the following content signals:
# (a)  If a content-signal = yes, you may collect content
# for the corresponding use.
# (b)  If a content-signal = no, you may not collect content
# for the corresponding use.
# (c)  If the website operator does not include a content
# signal for a corresponding use, the website operator
# neither grants nor restricts permission via content signal
# with respect to the corresponding use.
# The content signals and their meanings are:
# search: building a search index and providing search
# results (e.g., returning hyperlinks and short excerpts
# from your website's contents).  Search does not include
# providing AI-generated search summaries.
# ai-input: inputting content into one or more AI models
# (e.g., retrieval augmented generation, grounding, or other
# real-time taking of content for generative AI search
# answers).
# ai-train: training or fine-tuning AI models.
# ANY RESTRICTIONS EXPRESSED VIA CONTENT SIGNALS ARE EXPRESS
# RESERVATIONS OF RIGHTS UNDER ARTICLE 4 OF THE EUROPEAN
# UNION DIRECTIVE 2019/790 ON COPYRIGHT AND RELATED RIGHTS
# IN THE DIGITAL SINGLE MARKET.`

function renderGroup(userAgent: string, extra?: { crawlDelay?: number }): string {
  const lines = [
    `User-Agent: ${userAgent}`,
    `Content-Signal: ${CONTENT_SIGNAL}`,
    "Allow: /",
    ...PUBLIC_API_PATHS.map((path) => `Allow: ${path}`),
    ...PRIVATE_PATHS.map((path) => `Disallow: ${path}`),
  ]
  if (extra?.crawlDelay != null) {
    lines.push(`Crawl-delay: ${extra.crawlDelay}`)
  }
  return lines.join("\n")
}

export function buildRobotsTxt(): string {
  const namedAgents = [...AI_RETRIEVAL_AGENTS, ...AI_TRAINING_AGENTS]
  const groups = [
    renderGroup("*"),
    ...namedAgents.map((agent) => renderGroup(agent)),
    renderGroup("Bytespider", { crawlDelay: 10 }),
  ]

  return (
    `${CONTENT_SIGNAL_PREAMBLE}\n\n` +
    `${groups.join("\n\n")}\n\n` +
    `Sitemap: ${SITE_URL}/sitemap.xml\n` +
    `Host: ${SITE_URL}\n`
  )
}

export function GET() {
  return new Response(buildRobotsTxt(), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  })
}
