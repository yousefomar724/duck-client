import { agentJson, agentOptions } from "@/lib/agent/response"
import { SITE_URL } from "@/lib/site"

export function GET() {
  return agentJson(
    {
      linkset: [
        {
          anchor: `${SITE_URL}/api/v1`,
          "service-desc": [
            {
              href: `${SITE_URL}/openapi.json`,
              type: "application/json",
            },
          ],
          "service-doc": [
            { href: `${SITE_URL}/docs/api`, type: "text/html" },
          ],
          status: [
            { href: `${SITE_URL}/api/health`, type: "application/json" },
          ],
        },
        {
          anchor: `${SITE_URL}/api/mcp`,
          "service-desc": [
            {
              href: `${SITE_URL}/.well-known/mcp/server-card.json`,
              type: "application/json",
            },
          ],
          "service-doc": [
            { href: `${SITE_URL}/docs/api`, type: "text/html" },
          ],
        },
      ],
    },
    'application/linkset+json; profile="https://www.rfc-editor.org/info/rfc9727"',
  )
}

export function OPTIONS() {
  return agentOptions()
}
