// Fetches the Nile river polygon (with its islands) around Elephantine from
// OpenStreetMap and trims it to what the game map needs.
//
// The output (scripts/game/data/osm-river.json) is committed, so the rest of
// the pipeline runs offline and reproducibly; re-run this only to pick up OSM
// edits. Data © OpenStreetMap contributors, ODbL.
//
//   node scripts/game/fetch-osm.mjs

import { writeFile, mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { WORLD_BOUNDS } from "./map-config.mjs"

const HERE = dirname(fileURLToPath(import.meta.url))
const OUT = join(HERE, "data", "osm-river.json")

const ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
]

const { south, west, north, east } = WORLD_BOUNDS
const QUERY = `[out:json][timeout:90];
relation["natural"="water"]["water"="river"](${south},${west},${north},${east});
out geom;`

async function overpass(query) {
  let lastError
  for (let attempt = 0; attempt < 3; attempt++) {
    for (const url of ENDPOINTS) {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "content-type": "application/x-www-form-urlencoded",
            "user-agent": "duckegy-game-builder/1.0",
          },
          body: new URLSearchParams({ data: query }),
        })
        const text = await res.text()
        if (res.ok && text.startsWith("{")) return JSON.parse(text)
        lastError = new Error(`${url}: HTTP ${res.status} ${text.slice(0, 120)}`)
      } catch (err) {
        lastError = err
      }
    }
    await new Promise((r) => setTimeout(r, 5000 * (attempt + 1)))
  }
  throw lastError
}

function intersectsBounds(geometry) {
  // A member is kept when any of its points falls inside a latitude band a
  // little wider than the world. Longitude is left unbounded on purpose: the
  // map's water test casts rays eastward, so every bank segment crossing that
  // band has to be present, however far east it runs.
  const pad = 0.01
  return geometry.some((p) => p.lat >= south - pad && p.lat <= north + pad)
}

const data = await overpass(QUERY)
const river = data.elements.find((e) => e.type === "relation")
if (!river) throw new Error("No river relation found in the response")

const members = river.members
  .filter((m) => m.type === "way" && m.geometry && intersectsBounds(m.geometry))
  .map((m) => ({
    role: m.role,
    ref: m.ref,
    // 6 decimals ≈ 10 cm — plenty, and it keeps the committed file small.
    points: m.geometry.map((p) => [+p.lon.toFixed(6), +p.lat.toFixed(6)]),
  }))

await mkdir(dirname(OUT), { recursive: true })
await writeFile(
  OUT,
  JSON.stringify(
    {
      source: `OpenStreetMap relation ${river.id} (${river.tags?.name ?? "Nile"})`,
      license: "© OpenStreetMap contributors, ODbL 1.0",
      fetchedAt: new Date().toISOString(),
      members,
    },
    null,
    0,
  ),
)
console.log(`Saved ${members.length} river members to ${OUT}`)
