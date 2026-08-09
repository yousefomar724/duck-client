import { buildLlmsTxt } from "@/lib/seo/llms-txt"

export const dynamic = "force-dynamic"

export async function GET() {
  const body = await buildLlmsTxt()
  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  })
}
