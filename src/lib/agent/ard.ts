import { SITE_NAME, SITE_URL, absoluteUrl } from "@/lib/site"

const QUERIES = {
  booking: [
    "kayaking in Aswan Egypt",
    "book a Nile sunset kayak trip",
    "water sports near Aswan Corniche",
  ],
  api: [
    "book a Nile sunset kayak trip",
    "how much does stand-up paddleboarding on the Nile cost",
    "kayaking in Aswan Egypt",
  ],
  docs: [
    "how much does stand-up paddleboarding on the Nile cost",
    "kayaking in Aswan Egypt",
    "water sports near Aswan Corniche",
  ],
  skills: [
    "book a Nile sunset kayak trip",
    "kayaking in Aswan Egypt",
    "water sports near Aswan Corniche",
  ],
} as const

function entry(input: {
  identifier: string
  displayName: string
  type: string
  url: string
  description: string
  representativeQueries: readonly string[]
}) {
  return {
    identifier: input.identifier,
    id: input.identifier,
    displayName: input.displayName,
    type: input.type,
    mediaType: input.type,
    url: input.url,
    description: input.description,
    representativeQueries: [...input.representativeQueries],
  }
}

/** Same body at both /.well-known/ai-catalog.json and /.well-known/ard.json. */
export function buildArdManifest() {
  return {
    specVersion: "1.0",
    host: {
      displayName: SITE_NAME,
      identifier: SITE_URL,
      documentationUrl: absoluteUrl("/docs/api"),
    },
    entries: [
      entry({
        identifier: "urn:air:duckegy.com:server:booking",
        displayName: `${SITE_NAME} MCP`,
        type: "application/mcp-server-card+json",
        url: absoluteUrl("/.well-known/mcp/server-card.json"),
        description:
          "Read-only MCP server for Nile water-sports trips, destinations, availability, and business details.",
        representativeQueries: QUERIES.booking,
      }),
      entry({
        identifier: "urn:air:duckegy.com:api:public",
        displayName: `${SITE_NAME} public API`,
        type: "application/openapi+json",
        url: absoluteUrl("/openapi.json"),
        description:
          "OpenAPI 3.1 description of the unauthenticated catalogue, health, manual booking, and feedback endpoints.",
        representativeQueries: QUERIES.api,
      }),
      entry({
        identifier: "urn:air:duckegy.com:doc:reference",
        displayName: `${SITE_NAME} full reference`,
        type: "text/markdown",
        url: absoluteUrl("/llms-full.txt"),
        description:
          "Full markdown reference of trips, destinations, pricing, and booking links.",
        representativeQueries: QUERIES.docs,
      }),
      entry({
        identifier: "urn:air:duckegy.com:skills:index",
        displayName: `${SITE_NAME} agent skills`,
        type: "application/json",
        url: absoluteUrl("/.well-known/agent-skills/index.json"),
        description:
          "Agent Skills discovery index for booking a Duck trip and calling the public API.",
        representativeQueries: QUERIES.skills,
      }),
    ],
  }
}
