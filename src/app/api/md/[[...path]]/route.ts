import { NextResponse } from "next/server"
import { localeFromCookie, markdownForPath } from "@/lib/seo/markdown"

export const dynamic = "force-dynamic"

function markdownResponse(body: string): Response {
  const tokens = Math.ceil(body.length / 4)
  return new Response(body, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
      Vary: "Accept",
      "x-markdown-tokens": String(tokens),
      "Access-Control-Allow-Origin": "*",
    },
  })
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ path?: string[] }> },
) {
  const { path = [] } = await context.params
  const locale = await localeFromCookie()
  const body = await markdownForPath(path, locale)
  if (body == null) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  return markdownResponse(body)
}
