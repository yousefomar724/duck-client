import { agentJson, agentOptions } from "@/lib/agent/response"
import { SITE_URL } from "@/lib/site"

export function GET() {
  return agentJson({
    serverInfo: {
      name: "duckegy",
      title: "Duck Entertainment",
      version: "1.0.0",
    },
    transport: {
      type: "streamable-http",
      endpoint: `${SITE_URL}/api/mcp`,
    },
    capabilities: { tools: { listChanged: false } },
    websiteUrl: SITE_URL,
    description:
      "Read-only access to Duck Entertainment's Nile water-sports trips, destinations, availability and business details.",
  })
}

export function OPTIONS() {
  return agentOptions()
}
