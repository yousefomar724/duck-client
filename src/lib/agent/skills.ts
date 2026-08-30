import { createHash } from "node:crypto"
import { SITE_NAME, SITE_URL } from "@/lib/site"

export interface AgentSkill {
  name: string
  description: string
  body: string
}

const SKILLS: AgentSkill[] = [
  {
    name: "book-a-duck-trip",
    description:
      "Find a Duck Entertainment Nile water-sports trip in Aswan, check availability, and hand the user to the booking form. Do not collect payment or personal data.",
    body: `Use this skill when someone wants to kayak, stand-up paddleboard, or take a water-cycle trip on the Nile in Aswan with ${SITE_NAME}.

## What you can do

This skill is **read-only**. Booking requires a person to fill in the form on the website (name, phone, date, guest counts, InstaPay or cash). Never invent a checkout, never collect card details, and never POST a booking on the user's behalf unless they explicitly asked you to call the public manual-booking endpoint with data they provided.

## Workflow

1. Discover trips:
   - MCP: \`search_trips\` (optional \`query\`, \`max_price\`, \`guests\`, \`lang\`)
   - REST: \`GET ${SITE_URL}/api/v1/trips?lang=en\`
2. Get details of a candidate:
   - MCP: \`get_trip\` with the slug or 24-hex id
   - REST: \`GET ${SITE_URL}/api/v1/trips/{id}?lang=en\`
3. Optionally check kit for a date:
   - MCP: \`check_availability\` with \`trip\`, \`date\` (\`YYYY-MM-DD\`, Africa/Cairo), \`resource_type\` (\`kayak\` | \`water_cycle\` | \`sup\`), and \`quantity\`
4. Hand off to the booking form. Every trip payload includes a \`book_url\`:
   \`${SITE_URL}/book?trip=<id>\`

## Business facts

- Location: Nile Corniche, Aswan, Egypt
- Hours: daily, sunrise to sunset, by advance booking
- Prices in EGP, two tiers: Egyptian residents and foreign visitors
- Payment: InstaPay or cash. No card gateway.
- Languages: Arabic, English
- Contact and hours: MCP \`get_business_info\`, or ${SITE_URL}/contact

## Do not

- Advertise write tools that do not exist
- Promise card payments
- Skip the dual price tiers when quoting a cost
`,
  },
  {
    name: "duckegy-api",
    description:
      "Call Duck Entertainment's public read-only REST API and MCP endpoint for trips, destinations, availability, and business details.",
    body: `Use this skill when you need machine-readable catalogue data for ${SITE_NAME} (Nile kayaking and water sports in Aswan).

## Discovery

- OpenAPI: ${SITE_URL}/openapi.json
- Human docs: ${SITE_URL}/docs/api
- API catalog: ${SITE_URL}/.well-known/api-catalog
- MCP server card: ${SITE_URL}/.well-known/mcp/server-card.json
- Auth notes: ${SITE_URL}/auth.md

## REST (no token)

All of these are unauthenticated. Prefer \`lang=en\` or \`lang=ar\` so localized fields resolve to strings.

- \`GET ${SITE_URL}/api/health\` → \`{"status":"ok"}\`
- \`GET ${SITE_URL}/api/v1/trips\` — filters: \`supplier_id\`, \`destination_id\`, \`lang\`
- \`GET ${SITE_URL}/api/v1/trips/{id}\`
- \`GET ${SITE_URL}/api/v1/destinations\`
- \`GET ${SITE_URL}/api/v1/destinations/{id}\`
- \`GET ${SITE_URL}/api/v1/suppliers\`
- \`GET ${SITE_URL}/api/v1/suppliers/{id}\`
- \`GET ${SITE_URL}/api/v1/tour-guides\`
- \`GET ${SITE_URL}/api/v1/tour-guides/{id}\`
- \`POST ${SITE_URL}/api/v1/bookings/manual\` — guest booking; requires PII the user supplied
- \`POST ${SITE_URL}/api/v1/feedback\` — rating 1–5

Errors are \`{"error":"<message>"}\`.

## MCP

Streamable HTTP at \`${SITE_URL}/api/mcp\`. Tools: \`search_trips\`, \`get_trip\`, \`list_destinations\`, \`check_availability\`, \`get_business_info\`. No write tools.

## Auth (dashboard only)

Public catalogue calls need no token. Supplier/admin routes use \`Authorization: Bearer <jwt>\` from \`POST /api/v1/auth/login\`. There is no OAuth authorization server and no automated agent registration. See ${SITE_URL}/auth.md.
`,
  },
]

export function skillMarkdown(skill: AgentSkill): string {
  return `---\nname: ${skill.name}\ndescription: ${skill.description}\n---\n\n${skill.body}`
}

export function sha256Digest(value: string): string {
  const hex = createHash("sha256").update(value, "utf8").digest("hex")
  return `sha256:${hex}`
}

export function getAgentSkills(): AgentSkill[] {
  return SKILLS
}

export function getAgentSkill(name: string): AgentSkill | undefined {
  return SKILLS.find((skill) => skill.name === name)
}

export function skillIndexEntry(skill: AgentSkill) {
  const markdown = skillMarkdown(skill)
  return {
    name: skill.name,
    type: "skill-md" as const,
    description: skill.description,
    url: `/.well-known/agent-skills/${skill.name}/SKILL.md`,
    digest: sha256Digest(markdown),
  }
}
