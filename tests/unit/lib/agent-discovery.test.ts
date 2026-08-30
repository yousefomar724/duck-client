import { describe, expect, it } from "vitest"
import { buildArdManifest } from "@/lib/agent/ard"
import { GET as getCatalog } from "@/app/api/well-known/api-catalog/route"
import { GET as getCard } from "@/app/api/well-known/mcp-server-card/route"
import { GET as getProtected } from "@/app/api/well-known/oauth-protected-resource/route"

describe("agent discovery documents", () => {
  it("builds an ARD manifest with identifier and id aliases", () => {
    const manifest = buildArdManifest()
    expect(manifest.specVersion).toBe("1.0")
    expect(manifest.entries).toHaveLength(4)
    for (const entry of manifest.entries) {
      expect(entry.id).toBe(entry.identifier)
      expect(entry.identifier.startsWith("urn:air:duckegy.com:")).toBe(true)
      expect(entry.representativeQueries.length).toBeGreaterThanOrEqual(2)
      expect(entry.representativeQueries.length).toBeLessThanOrEqual(5)
      expect(entry.url).toMatch(/^https?:\/\//)
    }
  })

  it("serves api-catalog as linkset+json", async () => {
    const res = getCatalog()
    expect(res.status).toBe(200)
    expect(res.headers.get("content-type")).toContain("application/linkset+json")
    expect(res.headers.get("access-control-allow-origin")).toBe("*")
    const body = await res.json()
    expect(body.linkset).toHaveLength(2)
  })

  it("serves the MCP server card", async () => {
    const res = getCard()
    const body = await res.json()
    expect(body.serverInfo.name).toBe("duckegy")
    expect(body.transport.type).toBe("streamable-http")
    expect(body.transport.endpoint).toMatch(/\/api\/mcp$/)
  })

  it("omits authorization_servers from the protected-resource document", async () => {
    const res = getProtected()
    const body = await res.json()
    expect(body.resource).toBeTruthy()
    expect(body.bearer_methods_supported).toEqual(["header"])
    expect(body.authorization_servers).toBeUndefined()
    expect(body.scopes_supported).toBeUndefined()
  })
})
