"use client"

import { useEffect } from "react"
import { useLocale } from "next-intl"
import { useRouter } from "@/i18n/navigation"

type JsonSchema = Record<string, unknown>

type WebMcpTool = {
  name: string
  description: string
  inputSchema: JsonSchema
  parameters: JsonSchema
  execute: (args: Record<string, unknown>) => Promise<unknown>
}

type W3cModelContext = {
  registerTool: (tool: WebMcpTool) => void
}

type ChromeModelContext = {
  provideContext: (input: { tools: WebMcpTool[] }) => void
}

function readModelContext():
  | { kind: "w3c"; api: W3cModelContext }
  | { kind: "chrome"; api: ChromeModelContext }
  | null {
  if (typeof document !== "undefined") {
    const api = (document as Document & { modelContext?: W3cModelContext })
      .modelContext
    if (api && typeof api.registerTool === "function") {
      return { kind: "w3c", api }
    }
  }
  if (typeof navigator !== "undefined") {
    const api = (navigator as Navigator & { modelContext?: ChromeModelContext })
      .modelContext
    if (api && typeof api.provideContext === "function") {
      return { kind: "chrome", api }
    }
  }
  return null
}

async function fetchJson(path: string): Promise<unknown> {
  const res = await fetch(path)
  if (!res.ok) {
    throw new Error(`${path} failed (${res.status})`)
  }
  return res.json()
}

function tool(
  name: string,
  description: string,
  inputSchema: JsonSchema,
  execute: (args: Record<string, unknown>) => Promise<unknown>,
): WebMcpTool {
  return { name, description, inputSchema, parameters: inputSchema, execute }
}

export function WebMcp() {
  const locale = useLocale()
  const router = useRouter()

  useEffect(() => {
    const ctx = readModelContext()
    if (!ctx) return

    const lang = locale === "ar" ? "ar" : "en"

    const tools: WebMcpTool[] = [
      tool(
        "search_trips",
        "List Nile water-sports trips from Duck Entertainment. Optional query filters by name or description.",
        {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Optional name or description filter",
            },
          },
        },
        async ({ query }) => {
          const trips = (await fetchJson(
            `/api/v1/trips?lang=${lang}`,
          )) as Array<{
            id?: string
            name?: string
            description?: string
          }>
          const q = typeof query === "string" ? query.toLowerCase().trim() : ""
          if (!q) return trips
          return trips.filter(
            (item) =>
              (item.name ?? "").toLowerCase().includes(q) ||
              (item.description ?? "").toLowerCase().includes(q),
          )
        },
      ),
      tool(
        "get_trip_details",
        "Get a single trip by id.",
        {
          type: "object",
          properties: { id: { type: "string" } },
          required: ["id"],
        },
        async ({ id }) => {
          if (typeof id !== "string" || !id) {
            throw new Error("id is required")
          }
          return fetchJson(`/api/v1/trips/${encodeURIComponent(id)}?lang=${lang}`)
        },
      ),
      tool(
        "list_destinations",
        "List meeting-point destinations on the Nile in Aswan.",
        { type: "object", properties: {} },
        async () => fetchJson(`/api/v1/destinations?lang=${lang}`),
      ),
      tool(
        "open_booking_form",
        "Navigate the user to the booking form for a trip. Does not place a booking or collect payment.",
        {
          type: "object",
          properties: { trip_id: { type: "string" } },
          required: ["trip_id"],
        },
        async ({ trip_id }) => {
          if (typeof trip_id !== "string" || !trip_id) {
            throw new Error("trip_id is required")
          }
          const href = `/book?trip=${encodeURIComponent(trip_id)}`
          router.push(href)
          return { ok: true, url: href }
        },
      ),
    ]

    if (ctx.kind === "w3c") {
      for (const item of tools) ctx.api.registerTool(item)
      return
    }
    ctx.api.provideContext({ tools })
  }, [locale, router])

  return null
}
