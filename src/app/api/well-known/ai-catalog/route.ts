import { buildArdManifest } from "@/lib/agent/ard"
import { agentJson, agentOptions } from "@/lib/agent/response"

export function GET() {
  return agentJson(buildArdManifest())
}

export function OPTIONS() {
  return agentOptions()
}
