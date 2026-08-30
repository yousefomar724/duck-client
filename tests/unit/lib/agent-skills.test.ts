import { describe, expect, it } from "vitest"
import {
  getAgentSkill,
  getAgentSkills,
  sha256Digest,
  skillIndexEntry,
  skillMarkdown,
} from "@/lib/agent/skills"

describe("agent skills", () => {
  it("exports the two published skills", () => {
    const names = getAgentSkills().map((s) => s.name)
    expect(names).toEqual(["book-a-duck-trip", "duckegy-api"])
  })

  it("computes index digests from the exact SKILL.md bytes", () => {
    for (const skill of getAgentSkills()) {
      const markdown = skillMarkdown(skill)
      const entry = skillIndexEntry(skill)
      expect(entry.digest).toBe(sha256Digest(markdown))
      expect(entry.url).toBe(
        `/.well-known/agent-skills/${skill.name}/SKILL.md`,
      )
      expect(markdown.startsWith("---\nname: ")).toBe(true)
    }
  })

  it("returns undefined for an unknown skill", () => {
    expect(getAgentSkill("not-a-skill")).toBeUndefined()
  })
})
