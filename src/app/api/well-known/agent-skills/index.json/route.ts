import { getAgentSkills, skillIndexEntry } from "@/lib/agent/skills"
import { agentJson, agentOptions } from "@/lib/agent/response"

export function GET() {
  return agentJson({
    $schema: "https://schemas.agentskills.io/discovery/0.2.0/schema.json",
    skills: getAgentSkills().map(skillIndexEntry),
  })
}

export function OPTIONS() {
  return agentOptions()
}
