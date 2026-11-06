import { describe, expect, it } from "vitest"
import {
  HIDE_INTERNAL_PALESTINE_LINES,
  HIDE_INTERNAL_PALESTINE_LINES_LEGACY,
  PALESTINE_LABELS,
  isBoundaryLayer,
  isCountryLabelLayer,
  isPlaceLabelLayer,
  palestineBoundaryFilter,
  placeTextField,
} from "@/components/map/place-labels"

describe("place labels", () => {
  it("recognizes both CARTO country-label schemas", () => {
    expect(
      isCountryLabelLayer({
        filter: ["==", "class", "country"],
      }),
    ).toBe(true)
    expect(
      isCountryLabelLayer({
        id: "place_country_1",
        filter: ["all", ["==", ["get", "kind"], "country"], [">=", ["coalesce", ["get", "min_zoom"], 0], 4]],
      }),
    ).toBe(true)
    expect(
      isCountryLabelLayer({
        id: "place_city_r5",
        filter: ["all", ["==", ["get", "kind"], "locality"]],
      }),
    ).toBe(false)
  })

  it("matches the current and previous tile source-layer names", () => {
    expect(isPlaceLabelLayer("places")).toBe(true)
    expect(isPlaceLabelLayer("place")).toBe(true)
    expect(isPlaceLabelLayer("pois")).toBe(false)
    expect(isBoundaryLayer("boundaries")).toBe(true)
    expect(isBoundaryLayer("boundary")).toBe(true)
    expect(isBoundaryLayer("roads")).toBe(false)
  })

  it("renames the Israel country label to Palestine and hides the duplicate territories label", () => {
    const field = placeTextField("en", true)
    expect(field).toEqual([
      "case",
      [
        "any",
        ["==", ["get", "iso_a2"], "IL"],
        ["==", ["get", "wikidata"], "Q801"],
        ["==", ["get", "name:en"], "Israel"],
      ],
      PALESTINE_LABELS.en,
      [
        "any",
        ["==", ["get", "wikidata"], "Q219060"],
        ["==", ["get", "name:en"], "Palestinian Territories"],
      ],
      "",
      ["coalesce", ["get", "name:en"], ["get", "name_en"], ["get", "name"]],
    ])
  })

  it("uses the Arabic name on the Arabic map", () => {
    const field = placeTextField("ar", true)
    expect(field?.[2]).toBe(PALESTINE_LABELS.ar)
    expect(field?.[5]).toEqual([
      "coalesce",
      ["get", "name:ar"],
      ["get", "name_ar"],
      ["get", "name:en"],
      ["get", "name_en"],
      ["get", "name"],
    ])
  })

  it("leaves non-country Arabic labels to the basemap", () => {
    expect(placeTextField("ar", false)).toBeNull()
  })

  it("hides the Gaza and West Bank lines and leaves the Golan line alone", () => {
    expect(palestineBoundaryFilter("boundaries")).toBe(HIDE_INTERNAL_PALESTINE_LINES)
    expect(palestineBoundaryFilter("boundary")).toBe(HIDE_INTERNAL_PALESTINE_LINES_LEGACY)
    for (const filter of [HIDE_INTERNAL_PALESTINE_LINES, HIDE_INTERNAL_PALESTINE_LINES_LEGACY]) {
      const serialized = JSON.stringify(filter)
      expect(serialized).toContain('"B53"')
      expect(serialized).toContain('"B54"')
      expect(serialized).not.toContain('"B49"')
      expect(serialized).toContain('"ISR"')
    }
  })
})
