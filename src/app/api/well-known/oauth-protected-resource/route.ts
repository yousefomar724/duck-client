import { agentJson, agentOptions } from "@/lib/agent/response"
import { SITE_URL } from "@/lib/site"

export function GET() {
  return agentJson({
    resource: SITE_URL,
    resource_name: "Duck Entertainment API",
    bearer_methods_supported: ["header"],
    resource_documentation: `${SITE_URL}/docs/api`,
    resource_policy_uri: `${SITE_URL}/auth.md`,
  })
}

export function OPTIONS() {
  return agentOptions()
}
