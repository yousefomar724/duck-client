import { describe, expect, it } from "vitest"
import { canonicalSiteOrigin } from "@/lib/site"

describe("canonicalSiteOrigin", () => {
  it("rewrites the apex host to www, the host that returns 200", () => {
    expect(canonicalSiteOrigin("https://duckegy.com")).toBe("https://www.duckegy.com")
    expect(canonicalSiteOrigin("http://duckegy.com")).toBe("https://www.duckegy.com")
    expect(canonicalSiteOrigin("duckegy.com")).toBe("https://www.duckegy.com")
  })

  it("leaves www, preview, and local origins alone", () => {
    expect(canonicalSiteOrigin("https://www.duckegy.com")).toBe("https://www.duckegy.com")
    expect(canonicalSiteOrigin("https://duck-client.vercel.app")).toBe(
      "https://duck-client.vercel.app",
    )
    expect(canonicalSiteOrigin("http://localhost:3000")).toBe("http://localhost:3000")
  })
})
