import type { MetadataRoute } from "next"
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

export default function robots(): MetadataRoute.Robots {
  const rules: MetadataRoute.Robots["rules"] = [
    { userAgent: "*", allow: "/", disallow: PRIVATE_PATHS },
    ...[...AI_RETRIEVAL_AGENTS, ...AI_TRAINING_AGENTS].map((userAgent) => ({
      userAgent,
      allow: "/",
      disallow: PRIVATE_PATHS,
    })),
    // Known for aggressive crawl rates; crawlDelay is honored by Bing/Yandex
    // and ignored by Google/OpenAI, but it's free to set.
    { userAgent: "Bytespider", allow: "/", disallow: PRIVATE_PATHS, crawlDelay: 10 },
  ]

  return {
    rules,
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
