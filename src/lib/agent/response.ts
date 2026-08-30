const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "Accept, Content-Type",
} as const

const CACHE = "public, max-age=3600"

export function agentJson(
  body: unknown,
  contentType = "application/json",
): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": CACHE,
      ...CORS,
    },
  })
}

export function agentText(body: string, contentType: string): Response {
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": CACHE,
      ...CORS,
    },
  })
}

export function agentOptions(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      ...CORS,
      "Access-Control-Max-Age": "86400",
      "Cache-Control": CACHE,
    },
  })
}
