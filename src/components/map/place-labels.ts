/**
 * CARTO's basemap used to be OpenMapTiles: one country label for this area
 * (`iso_a2` "IL", source-layer `place`, filter `class == country`) and
 * West Bank / Gaza lines tagged `ISR` on one side only.
 *
 * The current basemap is Protomaps (`places` / `boundaries`). That label is
 * `kind == country` with `wikidata` Q801 and `name:en` "Israel", and there is
 * a second country label, "Palestinian Territories" (Q219060). Gaza and the
 * West Bank are Natural Earth breakaways `brk_a3` B53 and B54. The Golan line
 * is a different breakaway (B49) and stays visible.
 */

export const PALESTINE_LABELS = {
  en: "Palestine",
  ar: "فلسطين",
} as const

/** OpenMapTiles (`boundary`): legacy filter. Expression filters are ignored there. */
export const HIDE_INTERNAL_PALESTINE_LINES_LEGACY = [
  "none",
  ["all", ["==", "adm0_l", "ISR"], ["!has", "adm0_r"]],
  ["all", ["==", "adm0_r", "ISR"], ["!has", "adm0_l"]],
  ["in", "brk_a3", "B53", "B54"],
] as const

/** Protomaps (`boundaries`): expression filter. Legacy `none` is ignored there. */
export const HIDE_INTERNAL_PALESTINE_LINES = [
  "!",
  [
    "any",
    ["all", ["==", ["get", "adm0_l"], "ISR"], ["!", ["has", "adm0_r"]]],
    ["all", ["==", ["get", "adm0_r"], "ISR"], ["!", ["has", "adm0_l"]]],
    ["in", ["get", "brk_a3"], ["literal", ["B53", "B54"]]],
  ],
] as const

export function palestineBoundaryFilter(sourceLayer: string | undefined) {
  return sourceLayer === "boundaries"
    ? HIDE_INTERNAL_PALESTINE_LINES
    : HIDE_INTERNAL_PALESTINE_LINES_LEGACY
}

const ISRAEL_COUNTRY = [
  "any",
  ["==", ["get", "iso_a2"], "IL"],
  ["==", ["get", "wikidata"], "Q801"],
  ["==", ["get", "name:en"], "Israel"],
]

/** The extra label that appears once you zoom in. The area already reads as Palestine. */
const PALESTINIAN_TERRITORIES_COUNTRY = [
  "any",
  ["==", ["get", "wikidata"], "Q219060"],
  ["==", ["get", "name:en"], "Palestinian Territories"],
]

export function isCountryLabelLayer(layer: { id?: string; filter?: unknown }) {
  if (typeof layer.id === "string" && layer.id.startsWith("place_country")) {
    return true
  }
  const filter = JSON.stringify(layer.filter ?? null)
  return (
    filter.includes('["==","class","country"]') ||
    filter.includes('["==",["get","kind"],"country"]')
  )
}

export function isPlaceLabelLayer(sourceLayer: string | undefined) {
  return sourceLayer === "place" || sourceLayer === "places"
}

export function isBoundaryLayer(sourceLayer: string | undefined) {
  return sourceLayer === "boundary" || sourceLayer === "boundaries"
}

function countryName(locale: string) {
  if (locale === "ar") {
    return [
      "coalesce",
      ["get", "name:ar"],
      ["get", "name_ar"],
      ["get", "name:en"],
      ["get", "name_en"],
      ["get", "name"],
    ]
  }
  return ["coalesce", ["get", "name:en"], ["get", "name_en"], ["get", "name"]]
}

/** `text-field` for a place layer, or null to keep the stock label.
 *  English uses English names. Arabic keeps stock city labels, and country
 *  labels use Arabic names. The Israel country label is renamed to Palestine. */
export function placeTextField(locale: string, isCountry: boolean) {
  const english = ["coalesce", ["get", "name:en"], ["get", "name"]]
  if (!isCountry) return locale === "en" ? english : null
  return [
    "case",
    ISRAEL_COUNTRY,
    locale === "ar" ? PALESTINE_LABELS.ar : PALESTINE_LABELS.en,
    PALESTINIAN_TERRITORIES_COUNTRY,
    "",
    countryName(locale),
  ]
}
