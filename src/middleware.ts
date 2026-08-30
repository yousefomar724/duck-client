import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const MARKDOWN = "text/markdown"

export function middleware(request: NextRequest) {
  const accept = request.headers.get("accept") ?? ""
  if (accept.includes(MARKDOWN)) {
    const url = request.nextUrl.clone()
    const suffix = url.pathname === "/" ? "" : url.pathname
    url.pathname = `/api/md${suffix}`
    const response = NextResponse.rewrite(url)
    response.headers.set("Vary", "Accept")
    return response
  }

  const response = NextResponse.next()
  response.headers.set("Vary", "Accept")
  return response
}

export const config = {
  matcher: [
    "/",
    "/trips",
    "/trips/:slug",
    "/destinations",
    "/destinations/:slug",
    "/faq",
    "/about",
    "/contact",
    "/book",
    "/map",
    "/docs/api",
  ],
}
