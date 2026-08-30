import { NextResponse } from "next/server"
import { getAgentSkill, skillMarkdown } from "@/lib/agent/skills"
import { agentOptions, agentText } from "@/lib/agent/response"

export async function GET(
  _request: Request,
  context: { params: Promise<{ name: string }> },
) {
  const { name } = await context.params
  const skill = getAgentSkill(name)
  if (!skill) {
    return NextResponse.json({ error: "Skill not found" }, { status: 404 })
  }
  return agentText(skillMarkdown(skill), "text/markdown; charset=utf-8")
}

export function OPTIONS() {
  return agentOptions()
}
