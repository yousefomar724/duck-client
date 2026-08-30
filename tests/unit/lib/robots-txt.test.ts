import { describe, expect, it } from "vitest"
import { buildRobotsTxt } from "@/app/robots.txt/route"

describe("robots.txt", () => {
  const body = buildRobotsTxt()

  it("includes the Content-Signal preamble and directive", () => {
    expect(body).toContain("As a condition of accessing this website")
    expect(body).toContain("Content-Signal: search=yes, ai-input=yes, ai-train=yes")
  })

  it("allows the public API while still disallowing /api", () => {
    expect(body).toContain("Allow: /api/health")
    expect(body).toContain("Allow: /api/mcp")
    expect(body).toContain("Disallow: /api")
  })

  it("repeats private-path disallows in every user-agent group", () => {
    const blocks = body.split(/User-Agent: /).slice(1)
    expect(blocks.length).toBeGreaterThan(1)
    for (const block of blocks) {
      expect(block).toContain("Disallow: /admin")
      expect(block).toContain("Disallow: /api")
      expect(block).toContain("Content-Signal:")
    }
  })
})
