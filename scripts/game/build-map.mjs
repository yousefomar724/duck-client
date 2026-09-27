// Turns OpenStreetMap geometry + map-config.mjs into everything the game and
// the Blender world build need:
//
//   public/game/data/map.json   landmarks, nests, rocks, boats, felucca routes,
//                               prop placements (read by the browser)
//   public/game/data/sdf.bin    shoreline signed-distance field (Int16, dm) —
//                               the game's collision + water-shader source
//   scripts/game/.build/terrain.bin + terrain.json
//                               height/biome grid Blender turns into the world
//
// Everything is seeded, so the same inputs always produce the same map.
//
//   node scripts/game/build-map.mjs [--debug <png path>]

import { readFile, writeFile, mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import {
  PLAY_BOUNDS,
  WORLD_BOUNDS,
  ORIGIN,
  SCALE,
  TERRAIN_CELL,
  SDF_CELL,
  LANDMARKS,
  ZONES,
  FELUCCA_ROUTES,
} from "./map-config.mjs"

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, "..", "..")
const PUBLIC_DATA = join(ROOT, "public", "game", "data")
const BUILD = join(HERE, ".build")

// ---------------------------------------------------------------------------
// Projection

const phi = (ORIGIN.lat * Math.PI) / 180
const M_PER_DEG_LAT = 111132.92 - 559.82 * Math.cos(2 * phi) + 1.175 * Math.cos(4 * phi)
const M_PER_DEG_LON = 111412.84 * Math.cos(phi) - 93.5 * Math.cos(3 * phi)

/** lat/lon → game units. +x is east, +z is south (north is -z). */
function project(lat, lon) {
  return {
    x: (lon - ORIGIN.lon) * M_PER_DEG_LON * SCALE,
    z: -(lat - ORIGIN.lat) * M_PER_DEG_LAT * SCALE,
  }
}
const metres = (m) => m * SCALE

function boundsToRect(b) {
  const nw = project(b.north, b.west)
  const se = project(b.south, b.east)
  return { minX: nw.x, maxX: se.x, minZ: nw.z, maxZ: se.z }
}

const PLAY = boundsToRect(PLAY_BOUNDS)
const WORLD = boundsToRect(WORLD_BOUNDS)

// ---------------------------------------------------------------------------
// Deterministic helpers

function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hash2(ix, iz, seed) {
  let h = Math.imul(ix, 374761393) + Math.imul(iz, 668265263) + Math.imul(seed, 2147483647)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

function valueNoise(x, z, seed = 1) {
  const ix = Math.floor(x)
  const iz = Math.floor(z)
  const fx = x - ix
  const fz = z - iz
  const sx = fx * fx * (3 - 2 * fx)
  const sz = fz * fz * (3 - 2 * fz)
  const a = hash2(ix, iz, seed)
  const b = hash2(ix + 1, iz, seed)
  const c = hash2(ix, iz + 1, seed)
  const d = hash2(ix + 1, iz + 1, seed)
  return (a + (b - a) * sx + (c - a) * sz + (a - b - c + d) * sx * sz) * 2 - 1
}

function fbm(x, z, octaves, seed) {
  let sum = 0
  let amp = 0.5
  let f = 1
  for (let i = 0; i < octaves; i++) {
    sum += amp * valueNoise(x * f, z * f, seed + i * 17)
    f *= 2
    amp *= 0.5
  }
  return sum
}

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
const smoothstep = (a, b, v) => {
  const t = clamp((v - a) / (b - a), 0, 1)
  return t * t * (3 - 2 * t)
}

// ---------------------------------------------------------------------------
// Water mask from OSM (scanline, eastward-ray parity over all ring segments)

const osm = JSON.parse(await readFile(join(HERE, "data", "osm-river.json"), "utf8"))
const segments = []
for (const member of osm.members) {
  const pts = member.points.map(([lon, lat]) => project(lat, lon))
  for (let i = 0; i < pts.length - 1; i++) segments.push([pts[i].x, pts[i].z, pts[i + 1].x, pts[i + 1].z])
}

const cell = TERRAIN_CELL
const nx = Math.ceil((WORLD.maxX - WORLD.minX) / cell) + 1
const nz = Math.ceil((WORLD.maxZ - WORLD.minZ) / cell) + 1
const N = nx * nz
const gx = (i) => WORLD.minX + i * cell
const gz = (j) => WORLD.minZ + j * cell

const water = new Uint8Array(N)
for (let j = 0; j < nz; j++) {
  const z = gz(j)
  const xs = []
  for (const [x1, z1, x2, z2] of segments) {
    if (z1 > z !== z2 > z) xs.push(x1 + ((z - z1) * (x2 - x1)) / (z2 - z1))
  }
  xs.sort((a, b) => a - b)
  let k = 0
  for (let i = 0; i < nx; i++) {
    const x = gx(i)
    while (k < xs.length && xs[k] <= x) k++
    water[j * nx + i] = (xs.length - k) & 1
  }
}

// ---------------------------------------------------------------------------
// Signed distance field (exact EDT, Felzenszwalb & Huttenlocher)

function edt1d(f, n, d, v, zz) {
  let k = 0
  v[0] = 0
  zz[0] = -Infinity
  zz[1] = Infinity
  for (let q = 1; q < n; q++) {
    let s
    for (;;) {
      const p = v[k]
      s = (f[q] + q * q - (f[p] + p * p)) / (2 * q - 2 * p)
      if (s <= zz[k]) {
        k--
        continue
      }
      break
    }
    k++
    v[k] = q
    zz[k] = s
    zz[k + 1] = Infinity
  }
  k = 0
  for (let q = 0; q < n; q++) {
    while (zz[k + 1] < q) k++
    const p = v[k]
    d[q] = (q - p) * (q - p) + f[p]
  }
}

/** Squared distance (in cells) from every cell to the nearest cell where `isTarget`. */
function edt(isTarget) {
  const INF = 1e20
  const grid = new Float64Array(N)
  for (let i = 0; i < N; i++) grid[i] = isTarget(i) ? 0 : INF
  const m = Math.max(nx, nz)
  const f = new Float64Array(m)
  const d = new Float64Array(m)
  const v = new Int32Array(m)
  const zz = new Float64Array(m + 1)
  for (let i = 0; i < nx; i++) {
    for (let j = 0; j < nz; j++) f[j] = grid[j * nx + i]
    edt1d(f, nz, d, v, zz)
    for (let j = 0; j < nz; j++) grid[j * nx + i] = d[j]
  }
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) f[i] = grid[j * nx + i]
    edt1d(f, nx, d, v, zz)
    for (let i = 0; i < nx; i++) grid[j * nx + i] = d[i]
  }
  return grid
}

const toWater = edt((i) => water[i] === 1)
const toLand = edt((i) => water[i] === 0)
let sdf = new Float32Array(N) // + on land, − in water, game units
for (let i = 0; i < N; i++) {
  sdf[i] = water[i] ? -(Math.sqrt(toLand[i]) - 0.5) * cell : (Math.sqrt(toWater[i]) - 0.5) * cell
}
// One light blur pass rounds off the grid staircase in the shoreline.
{
  const out = new Float32Array(N)
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      let s = 0
      let w = 0
      for (let dj = -1; dj <= 1; dj++) {
        for (let di = -1; di <= 1; di++) {
          const ii = clamp(i + di, 0, nx - 1)
          const jj = clamp(j + dj, 0, nz - 1)
          const k = di === 0 && dj === 0 ? 4 : di === 0 || dj === 0 ? 2 : 1
          s += sdf[jj * nx + ii] * k
          w += k
        }
      }
      out[j * nx + i] = s / w
    }
  }
  sdf = out
}

function sampleGrid(grid, x, z) {
  const fi = clamp((x - WORLD.minX) / cell, 0, nx - 1.001)
  const fj = clamp((z - WORLD.minZ) / cell, 0, nz - 1.001)
  const i = Math.floor(fi)
  const j = Math.floor(fj)
  const tx = fi - i
  const tz = fj - j
  const a = grid[j * nx + i]
  const b = grid[j * nx + i + 1]
  const c = grid[(j + 1) * nx + i]
  const d = grid[(j + 1) * nx + i + 1]
  return a + (b - a) * tx + (c - a) * tz + (a - b - c + d) * tx * tz
}
const sdfAt = (x, z) => sampleGrid(sdf, x, z)
function sdfGrad(x, z) {
  const e = 1
  const gx_ = sdfAt(x + e, z) - sdfAt(x - e, z)
  const gz_ = sdfAt(x, z + e) - sdfAt(x, z - e)
  const len = Math.hypot(gx_, gz_) || 1
  return { x: gx_ / len, z: gz_ / len }
}

// ---------------------------------------------------------------------------
// Land regions (connected components)

const REGION = { WATER: 0, WEST: 1, EAST: 2, ELEPHANTINE: 3, KITCHENER: 4, ISLET: 5 }
const region = new Uint8Array(N)
{
  const label = new Int32Array(N).fill(-1)
  const comps = []
  const stack = new Int32Array(N)
  for (let start = 0; start < N; start++) {
    if (water[start] || label[start] !== -1) continue
    const id = comps.length
    const comp = { id, touchesW: false, touchesE: false, cells: [] }
    let sp = 0
    stack[sp++] = start
    label[start] = id
    while (sp) {
      const c = stack[--sp]
      comp.cells.push(c)
      const i = c % nx
      const j = (c / nx) | 0
      if (i === 0) comp.touchesW = true
      if (i === nx - 1) comp.touchesE = true
      const nbrs = [i > 0 ? c - 1 : -1, i < nx - 1 ? c + 1 : -1, j > 0 ? c - nx : -1, j < nz - 1 ? c + nx : -1]
      for (const n of nbrs) {
        if (n >= 0 && !water[n] && label[n] === -1) {
          label[n] = id
          stack[sp++] = n
        }
      }
    }
    comps.push(comp)
  }
  const cellOf = (lat, lon) => {
    const p = project(lat, lon)
    return Math.round((p.z - WORLD.minZ) / cell) * nx + Math.round((p.x - WORLD.minX) / cell)
  }
  const eleph = label[cellOf(24.0911, 32.8888)]
  const kitch = label[cellOf(24.0938, 32.887)]
  for (const comp of comps) {
    const r = comp.touchesW
      ? REGION.WEST
      : comp.touchesE
        ? REGION.EAST
        : comp.id === eleph
          ? REGION.ELEPHANTINE
          : comp.id === kitch
            ? REGION.KITCHENER
            : REGION.ISLET
    for (const c of comp.cells) region[c] = r
  }
  if (eleph < 0 || kitch < 0) throw new Error("Could not find Elephantine / Kitchener's Island in the water mask")
}
const regionAt = (x, z) => {
  const i = clamp(Math.round((x - WORLD.minX) / cell), 0, nx - 1)
  const j = clamp(Math.round((z - WORLD.minZ) / cell), 0, nz - 1)
  return region[j * nx + i]
}

// ---------------------------------------------------------------------------
// Zones in game units

const zoneCircle = ({ lat, lon, radiusM }) => ({ ...project(lat, lon), r: metres(radiusM) })
const villages = ZONES.villages.map(zoneCircle)
const ruins = ZONES.ruins.map(zoneCircle)
const hills = ZONES.hills.map((h) => ({ ...zoneCircle(h), h: metres(h.heightM) * 1.25 }))
const graniteZ = project(ZONES.graniteSouthOf, ORIGIN.lon).z
const inAny = (zones, x, z) => zones.some((c) => Math.hypot(x - c.x, z - c.z) < c.r)
const zoneWeight = (zones, x, z) =>
  zones.reduce((m, c) => Math.max(m, 1 - smoothstep(c.r * 0.6, c.r, Math.hypot(x - c.x, z - c.z))), 0)

// ---------------------------------------------------------------------------
// Heights and biomes

export const BIOME = {
  RIVERBED: 0,
  SAND: 1,
  DESERT: 2,
  GREEN: 3,
  GRANITE: 4,
  CITY: 5,
  VILLAGE: 6,
  RUINS: 7,
}

const height = new Float32Array(N)
const biome = new Uint8Array(N)
for (let j = 0; j < nz; j++) {
  for (let i = 0; i < nx; i++) {
    const k = j * nx + i
    const x = gx(i)
    const z = gz(j)
    const d = sdf[k]
    const r = region[k]
    const south = z > graniteZ
    const n1 = fbm(x * 0.035, z * 0.035, 4, 11)
    const n2 = fbm(x * 0.12, z * 0.12, 3, 23)

    if (d < 0) {
      height[k] = Math.max(-5, d * 0.45) - 0.35
      biome[k] = BIOME.RIVERBED
      continue
    }

    let h = 0
    let b = BIOME.SAND
    const beach = smoothstep(0, 4, d)
    switch (r) {
      case REGION.WEST: {
        let hill = 0
        for (const c of hills) {
          const t = Math.hypot(x - c.x, z - c.z) / c.r
          hill += c.h * Math.exp(-t * t * 2.2)
        }
        // Hills rise from the shoreline, not out of the water.
        hill *= smoothstep(0, 22, d)
        const dunes = (Math.abs(n1) * 7 + n2 * 1.2) * smoothstep(6, 40, d)
        h = 0.25 + beach * 1.2 + Math.min(d, 60) * 0.08 + hill + dunes
        if (south && d < 12) b = BIOME.GRANITE
        else if (d < 2.5) b = BIOME.SAND
        else if (z < project(24.0935, 0).z && d < 10 && n2 > 0.05 && hill < 6) b = BIOME.GREEN
        else b = BIOME.DESERT
        if (b === BIOME.GRANITE) h += Math.abs(n2) * 2.5
        break
      }
      case REGION.EAST: {
        const nearCataract = south && d < 16
        h = 0.25 + smoothstep(0.5, 3, d) * 3.4 + Math.min(d, 80) * 0.02 + (nearCataract ? Math.abs(n2) * 3 + 1 : 0)
        b = nearCataract ? BIOME.GRANITE : d < 1.2 ? BIOME.SAND : BIOME.CITY
        break
      }
      case REGION.ELEPHANTINE: {
        const mound = zoneWeight(ruins, x, z) * 4.5
        h = 0.25 + beach * 1.8 + Math.min(Math.max(d - 4, 0), 20) * 0.07 + n1 * 0.6 + mound
        if (inAny(ruins, x, z) && d > 3) b = BIOME.RUINS
        else if (inAny(villages, x, z) && d > 2.5) b = BIOME.VILLAGE
        else if (south && d < 5) b = BIOME.GRANITE
        else if (d < 1.4) b = BIOME.SAND
        else b = BIOME.GREEN
        if (b === BIOME.GRANITE) h += Math.abs(n2) * 1.6
        break
      }
      case REGION.KITCHENER: {
        h = 0.25 + beach * 1.2 + n1 * 0.3
        b = d < 1.1 ? BIOME.SAND : BIOME.GREEN
        break
      }
      default: {
        // Small cataract islets: humps of weathered granite.
        h = 0.3 + Math.min(d, 7) * 0.8 + Math.abs(n2) * 1.8
        b = BIOME.GRANITE
      }
    }
    height[k] = h
    biome[k] = b
  }
}
const heightAt = (x, z) => sampleGrid(height, x, z)

// ---------------------------------------------------------------------------
// Landmarks and nests

function snapToWater(from, toward, depth = 4.5) {
  const dx = toward.x - from.x
  const dz = toward.z - from.z
  const len = Math.hypot(dx, dz) || 1
  const ux = dx / len
  const uz = dz / len
  for (let s = 0; s < 260; s += 0.5) {
    const x = from.x + ux * s
    const z = from.z + uz * s
    if (sdfAt(x, z) < -depth) return { x, z }
  }
  throw new Error(`No water found from ${JSON.stringify(from)}`)
}

function nearestWater(p, depth = 4.5) {
  let best = null
  for (let r = 0; r < 140 && !best; r += 1) {
    for (let a = 0; a < 64; a++) {
      const x = p.x + Math.cos((a / 64) * Math.PI * 2) * r
      const z = p.z + Math.sin((a / 64) * Math.PI * 2) * r
      if (sdfAt(x, z) < -depth) {
        best = { x, z }
        break
      }
    }
  }
  if (!best) throw new Error(`No water near ${JSON.stringify(p)}`)
  return best
}

const yawToward = (from, to) => Math.atan2(to.x - from.x, to.z - from.z)
const round = (v, p = 2) => Math.round(v * 10 ** p) / 10 ** p

const landmarks = LANDMARKS.map((lm) => {
  const site = project(lm.site.lat, lm.site.lon)
  const nest = lm.nest ? snapToWater(site, project(lm.nestToward.lat, lm.nestToward.lon)) : null
  const anchor = nest ?? nearestWater(site)
  return {
    id: lm.id,
    model: lm.model,
    site: { x: round(site.x), y: round(heightAt(site.x, site.z)), z: round(site.z) },
    faceYaw: round(yawToward(site, anchor), 3),
    anchor: { x: round(anchor.x), z: round(anchor.z) },
    discoverRadius: 34,
    nest: nest ? { x: round(nest.x), z: round(nest.z), r: 7 } : null,
  }
})

// ---------------------------------------------------------------------------
// Felucca routes: nudge waypoints to channel centres, then spline them

function channelCentre(p) {
  let best = p
  let bestScore = sdfAt(p.x, p.z)
  for (let r = 2; r <= 16; r += 2) {
    for (let a = 0; a < 24; a++) {
      const x = p.x + Math.cos((a / 24) * Math.PI * 2) * r
      const z = p.z + Math.sin((a / 24) * Math.PI * 2) * r
      const score = sdfAt(x, z) + r * 0.22
      if (score < bestScore) {
        bestScore = score
        best = { x, z }
      }
    }
  }
  return best
}

function catmullRomLoop(points, spacing) {
  const out = []
  const n = points.length
  for (let i = 0; i < n; i++) {
    const p0 = points[(i - 1 + n) % n]
    const p1 = points[i]
    const p2 = points[(i + 1) % n]
    const p3 = points[(i + 2) % n]
    const segLen = Math.hypot(p2.x - p1.x, p2.z - p1.z)
    const steps = Math.max(2, Math.ceil(segLen / spacing))
    for (let s = 0; s < steps; s++) {
      const t = s / steps
      const t2 = t * t
      const t3 = t2 * t
      const f = (a, b, c, d) =>
        0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3)
      out.push({ x: f(p0.x, p1.x, p2.x, p3.x), z: f(p0.z, p1.z, p2.z, p3.z) })
    }
  }
  return out
}

function catmullRomOpen(points, spacing) {
  const n = points.length
  const at = (i) => points[clamp(i, 0, n - 1)]
  const out = []
  for (let i = 0; i < n - 1; i++) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)]
    const steps = Math.max(2, Math.ceil(Math.hypot(p2.x - p1.x, p2.z - p1.z) / spacing))
    for (let s = 0; s < steps; s++) {
      const t = s / steps
      const t2 = t * t
      const t3 = t2 * t
      const f = (a, b, c, d) =>
        0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3)
      out.push({ x: f(p0.x, p1.x, p2.x, p3.x), z: f(p0.z, p1.z, p2.z, p3.z) })
    }
  }
  out.push(points[n - 1])
  return out
}

/** Open centre-line → closed two-lane loop (out on one side, back on the other). */
function laneLoop(centre) {
  const n = centre.length
  const offsetPoint = (i, side) => {
    const a = centre[Math.max(0, i - 1)]
    const b = centre[Math.min(n - 1, i + 1)]
    const tx = b.x - a.x
    const tz = b.z - a.z
    const len = Math.hypot(tx, tz) || 1
    const lane = clamp(-sdfAt(centre[i].x, centre[i].z) * 0.3, 2.5, 7)
    return { x: centre[i].x + (-tz / len) * lane * side, z: centre[i].z + (tx / len) * lane * side }
  }
  const out = []
  for (let i = 0; i < n; i += 3) out.push(offsetPoint(i, 1))
  for (let i = n - 1; i >= 0; i -= 3) out.push(offsetPoint(i, -1))
  return out
}

const warnings = []
const routes = FELUCCA_ROUTES.map((wps, idx) => {
  const centred = wps.map((w) => channelCentre(project(w.lat, w.lon)))
  const pts = catmullRomLoop(laneLoop(catmullRomOpen(centred, 3)), 3)
  let length = 0
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i]
    const b = pts[(i + 1) % pts.length]
    length += Math.hypot(b.x - a.x, b.z - a.z)
    if (sdfAt(a.x, a.z) > -3) warnings.push(`felucca route ${idx}: point ${i} is only ${sdfAt(a.x, a.z).toFixed(1)} from shore`)
  }
  return { points: pts.map((p) => [round(p.x, 1), round(p.z, 1)]), length: round(length, 1) }
})

function distToRoutes(x, z) {
  let best = Infinity
  for (const r of routes) {
    for (const [px, pz] of r.points) best = Math.min(best, Math.hypot(px - x, pz - z))
  }
  return best
}

// ---------------------------------------------------------------------------
// Scatter helpers

class SpatialHash {
  constructor(size) {
    this.size = size
    this.map = new Map()
  }
  key(x, z) {
    return `${Math.floor(x / this.size)},${Math.floor(z / this.size)}`
  }
  add(x, z, r) {
    const k = this.key(x, z)
    if (!this.map.has(k)) this.map.set(k, [])
    this.map.get(k).push([x, z, r])
  }
  clear(x, z, r) {
    const cx = Math.floor(x / this.size)
    const cz = Math.floor(z / this.size)
    for (let a = -2; a <= 2; a++) {
      for (let b = -2; b <= 2; b++) {
        for (const [px, pz, pr] of this.map.get(`${cx + a},${cz + b}`) ?? []) {
          if (Math.hypot(px - x, pz - z) < r + pr) return false
        }
      }
    }
    return true
  }
}

const rand = mulberry32(20260927)
const occupied = new SpatialHash(12)

// Keep landmark footprints and nests clear of scattered props.
for (const lm of landmarks) {
  if (lm.model) occupied.add(lm.site.x, lm.site.z, lm.model === "village" ? 3 : lm.model === "tombs" ? 22 : 14)
  if (lm.nest) occupied.add(lm.nest.x, lm.nest.z, 10)
}
const towerSite = project(ZONES.tower.lat, ZONES.tower.lon)
occupied.add(towerSite.x, towerSite.z, 12)

function scatter({ count, attempts = count * 40, spacing, accept, make, rect = WORLD }) {
  const out = []
  for (let a = 0; a < attempts && out.length < count; a++) {
    const x = rect.minX + rand() * (rect.maxX - rect.minX)
    const z = rect.minZ + rand() * (rect.maxZ - rect.minZ)
    const d = sdfAt(x, z)
    const b = biome[Math.round((z - WORLD.minZ) / cell) * nx + Math.round((x - WORLD.minX) / cell)]
    if (!accept(x, z, d, b)) continue
    if (!occupied.clear(x, z, spacing)) continue
    occupied.add(x, z, spacing)
    out.push(make(x, z, d))
  }
  return out
}

const faceWaterYaw = (x, z) => {
  const g = sdfGrad(x, z)
  // Gradient points inland; face the other way, snapped to the street grid.
  const yaw = Math.atan2(-g.x, -g.z)
  return Math.round(yaw / (Math.PI / 2)) * (Math.PI / 2) + (rand() - 0.5) * 0.25
}
const pack = (x, z, yaw, scale, variant) => [
  round(x, 1),
  round(heightAt(x, z), 2),
  round(z, 1),
  round(yaw, 2),
  round(scale, 2),
  variant,
]

// Moored cruise boats line the Corniche — a real Aswan sight.
const boats = []
{
  const zStart = project(24.0985, 0).z
  const zEnd = project(24.0862, 0).z
  for (let z = zStart; z < zEnd; z += 26) {
    // Walk west from the east edge until just off the east bank.
    let hit = null
    let wasLand = true
    for (let x = PLAY.maxX + 60; x > 0; x -= 0.5) {
      const d = sdfAt(x, z)
      if (wasLand && d < -5.5 && regionAt(x + 7, z) === REGION.EAST) {
        hit = { x, z }
        break
      }
      wasLand = d > -5.5
    }
    if (!hit) continue
    if (landmarks.some((l) => l.nest && Math.hypot(l.nest.x - hit.x, l.nest.z - hit.z) < 26)) continue
    const g = sdfGrad(hit.x, hit.z)
    const along = Math.atan2(g.z, -g.x) // tangent to the shore
    boats.push({ kind: "cruise", x: round(hit.x - 2.5), z: round(hit.z), yaw: round(along + (rand() < 0.5 ? 0 : Math.PI), 3), len: 19, radius: 3.2 })
    occupied.add(hit.x, hit.z, 12)
  }
}

// Moored feluccas along Elephantine's west shore guesthouses and the Corniche.
{
  const spots = [
    [24.0896, 32.8846],
    [24.0902, 32.8849],
    [24.0858, 32.8845],
    [24.0947, 32.8944],
    [24.0935, 32.8946],
    [24.0978, 32.8938],
  ]
  for (const [lat, lon] of spots) {
    const p = nearestWater(project(lat, lon), 3.5)
    if (!occupied.clear(p.x, p.z, 5)) continue
    const g = sdfGrad(p.x, p.z)
    boats.push({ kind: "felucca", x: round(p.x), z: round(p.z), yaw: round(Math.atan2(g.z, -g.x), 3), len: 9, radius: 1.8 })
    occupied.add(p.x, p.z, 6)
  }
}

// The Corniche promenade: a railing along the top of the east-bank quay wall,
// street lamps and benches, traced from the real shoreline.
const railings = []
const lamps = []
const benches = []
{
  const zStart = PLAY.minZ - 30
  const zEnd = project(24.0866, 0).z
  const edge = []
  for (let z = zStart; z < zEnd; z += 1.5) {
    let x = null
    for (let sx = PLAY.minX; sx < WORLD.maxX; sx += 0.5) {
      if (regionAt(sx, z) === REGION.EAST && sdfAt(sx, z) >= 3.2) {
        x = sx
        break
      }
    }
    if (x !== null) edge.push({ x, z })
  }
  // Resample the edge every 3 units of arc length (one railing section each).
  const path = []
  let carry = 0
  for (let i = 1; i < edge.length; i++) {
    const a = edge[i - 1]
    const b = edge[i]
    const seg = Math.hypot(b.x - a.x, b.z - a.z)
    if (seg > 8) {
      carry = 0 // a gap (e.g. a harbour inlet): start a fresh run
      continue
    }
    let t = (3 - carry) / seg
    while (t <= 1) {
      path.push({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t })
      t += 3 / seg
    }
    carry = (1 - (t - 3 / seg)) * seg
  }
  path.forEach((p, i) => {
    const prev = path[Math.max(0, i - 1)]
    const next = path[Math.min(path.length - 1, i + 1)]
    const tx = next.x - prev.x
    const tz = next.z - prev.z
    if (Math.hypot(tx, tz) > 9) return
    const g = sdfGrad(p.x, p.z) // inland
    railings.push(pack(p.x, p.z, Math.atan2(-tz, tx), 1, 0))
    occupied.add(p.x, p.z, 1.6)
    if (i % 6 === 3) {
      const lx = p.x + g.x * 0.8
      const lz = p.z + g.z * 0.8
      lamps.push(pack(lx, lz, Math.atan2(g.x, g.z), 1, 0))
      occupied.add(lx, lz, 1.2)
    }
    if (i % 8 === 0) {
      const bx = p.x + g.x * 1.6
      const bz = p.z + g.z * 1.6
      benches.push(pack(bx, bz, Math.atan2(-g.x, -g.z), 1, 0))
      occupied.add(bx, bz, 1.4)
    }
  })
}

// Granite boulders in the water — the First Cataract's obstacles. Collidable.
const waterRocks = scatter({
  count: 90,
  attempts: 30000,
  spacing: 5,
  rect: PLAY,
  accept: (x, z, d) => {
    if (d > -0.8 || d < -10) return false
    const islet = [0, 1, 2, 3].some((a) => {
      const ang = (a / 4) * Math.PI * 2
      return regionAt(x + Math.cos(ang) * (-d + 2), z + Math.sin(ang) * (-d + 2)) === REGION.ISLET
    })
    const southern = z > graniteZ - 10
    if (!islet && !southern) return rand() < 0.08 // the odd boulder further north
    return distToRoutes(x, z) > 9
  },
  make: (x, z) => {
    const r = 1.1 + rand() * rand() * 2.4
    return [round(x, 1), round(z, 1), round(r, 2), Math.floor(rand() * 4), round(rand() * Math.PI * 2, 2)]
  },
})

// Nubian houses: bright walls, domes and vaults.
const houses = scatter({
  count: 170,
  attempts: 120000,
  spacing: 3.4,
  accept: (x, z, d, b) => b === BIOME.VILLAGE && d > 3,
  make: (x, z) => pack(x, z, faceWaterYaw(x, z), 0.85 + rand() * 0.4, Math.floor(rand() * 6)),
})

// The Mövenpick tower is a single landmark-style prop.
const tower = [pack(towerSite.x, towerSite.z, 0, 1, 0)]

// City blocks on the east bank, set back behind the Corniche road.
const blocks = scatter({
  count: 180,
  spacing: 4.6,
  accept: (x, z, d, b) => b === BIOME.CITY && d > 7 && d < 140,
  make: (x, z, d) => pack(x, z, faceWaterYaw(x, z), 0.9 + rand() * 0.5, Math.floor(rand() * 4) + (d > 30 ? 0 : 4)),
})

// Broadleaf trees — dense on Kitchener's Island (the Botanical Garden).
const trees = scatter({
  count: 150,
  attempts: 120000,
  spacing: 2.6,
  accept: (x, z, d, b) => b === BIOME.GREEN && d > 1.5 && (regionAt(x, z) === REGION.KITCHENER || rand() < 0.1),
  make: (x, z) => pack(x, z, rand() * Math.PI * 2, 0.8 + rand() * 0.6, Math.floor(rand() * 3)),
})

// Palms: Corniche rows, island groves, west-bank gardens.
const palms = [
  ...scatter({
    count: 70,
    attempts: 60000,
    spacing: 4.5,
    accept: (x, z, d, b) => b === BIOME.CITY && d > 5.2 && d < 7,
    make: (x, z) => pack(x, z, rand() * Math.PI * 2, 0.9 + rand() * 0.3, Math.floor(rand() * 3)),
  }),
  ...scatter({
    count: 240,
    attempts: 120000,
    spacing: 2.3,
    accept: (x, z, d, b) => (b === BIOME.GREEN || (b === BIOME.VILLAGE && rand() < 0.15)) && d > 1.2 && (regionAt(x, z) !== REGION.KITCHENER || rand() < 0.35),
    make: (x, z) => pack(x, z, rand() * Math.PI * 2, 0.75 + rand() * 0.5, Math.floor(rand() * 3)),
  }),
]

// Granite boulders on land (scenery only).
const landRocks = scatter({
  count: 280,
  attempts: 80000,
  spacing: 2.2,
  accept: (x, z, d, b) => b === BIOME.GRANITE && d > 0.3,
  make: (x, z) => pack(x, z, rand() * Math.PI * 2, 0.7 + rand() * rand() * 2.8, Math.floor(rand() * 4)),
})

// Reeds and papyrus fringing the island shores.
const reeds = scatter({
  count: 170,
  attempts: 500000,
  spacing: 4,
  accept: (x, z, d) => {
    if (d < -1.0 || d > 0.8) return false
    const g = sdfGrad(x, z)
    const lx = x + g.x * 3
    const lz = z + g.z * 3
    const r = regionAt(lx, lz)
    const lb = biome[Math.round((lz - WORLD.minZ) / cell) * nx + Math.round((lx - WORLD.minX) / cell)]
    return (r === REGION.ELEPHANTINE || r === REGION.KITCHENER || r === REGION.WEST) && (lb === BIOME.GREEN || lb === BIOME.SAND)
  },
  make: (x, z) => pack(x, z, rand() * Math.PI * 2, 0.8 + rand() * 0.6, 0),
})

// A few camels resting on the west-bank sand near the tombs and the Aga Khan hill.
const camels = scatter({
  count: 6,
  attempts: 6000,
  spacing: 5,
  accept: (x, z, d, b) =>
    b === BIOME.DESERT && d > 6 && d < 18 && (Math.hypot(x - landmarks[7].site.x, z - landmarks[7].site.z) < 90 || Math.hypot(x - landmarks[5].site.x, z - landmarks[5].site.z) < 90),
  make: (x, z) => pack(x, z, rand() * Math.PI * 2, 1, 0),
})

// ---------------------------------------------------------------------------
// Start position: west channel south of the Nubian village nest, pointing north,
// so the first ducklings (placed ahead by the sim) lead straight to a nest.

const villageNest = landmarks.find((l) => l.id === "nubianVillage").nest
let startPoint = null
for (let deg = -75; deg <= 75; deg += 5) {
  const a = (deg * Math.PI) / 180
  const p = { x: villageNest.x + Math.sin(a) * 36, z: villageNest.z + Math.cos(a) * 36 }
  // The whole run-up to the nest must be water.
  let clear = true
  for (let t = 0; t <= 1; t += 0.1) if (sdfAt(p.x + (villageNest.x - p.x) * t, p.z + (villageNest.z - p.z) * t) > -4) clear = false
  if (clear && (!startPoint || sdfAt(p.x, p.z) < startPoint.d)) startPoint = { ...p, d: sdfAt(p.x, p.z) }
}
if (!startPoint) throw new Error("No clear start position south of the village nest")
const start = {
  x: round(startPoint.x),
  z: round(startPoint.z),
  heading: round(Math.atan2(villageNest.x - startPoint.x, villageNest.z - startPoint.z), 4),
}

// ---------------------------------------------------------------------------
// Outputs

// Collision/shoreline SDF for the client: play area + margin, Int16 decimetres.
const SDF_MARGIN = 40
const sdfRect = {
  minX: Math.floor(PLAY.minX - SDF_MARGIN),
  minZ: Math.floor(PLAY.minZ - SDF_MARGIN),
  maxX: Math.ceil(PLAY.maxX + SDF_MARGIN),
  maxZ: Math.ceil(PLAY.maxZ + SDF_MARGIN),
}
const snx = Math.ceil((sdfRect.maxX - sdfRect.minX) / SDF_CELL) + 1
const snz = Math.ceil((sdfRect.maxZ - sdfRect.minZ) / SDF_CELL) + 1
const sdfOut = new Int16Array(snx * snz)
for (let j = 0; j < snz; j++) {
  for (let i = 0; i < snx; i++) {
    const v = sdfAt(sdfRect.minX + i * SDF_CELL, sdfRect.minZ + j * SDF_CELL)
    sdfOut[j * snx + i] = clamp(Math.round(v * 10), -32000, 32000)
  }
}

const map = {
  version: 1,
  attribution: "Map data © OpenStreetMap contributors (ODbL)",
  scale: SCALE,
  origin: ORIGIN,
  play: roundRect(PLAY),
  world: roundRect(WORLD),
  sdf: { url: "/game/data/sdf.bin", minX: sdfRect.minX, minZ: sdfRect.minZ, cell: SDF_CELL, nx: snx, nz: snz, unit: 0.1 },
  start,
  landmarks,
  waterRocks,
  boats,
  routes,
  props: {
    house: houses,
    block: blocks,
    tower,
    palm: palms,
    tree: trees,
    rock: landRocks,
    camel: camels,
    reeds,
    railing: railings,
    lamp: lamps,
    bench: benches,
  },
}

function roundRect(r) {
  return { minX: round(r.minX), maxX: round(r.maxX), minZ: round(r.minZ), maxZ: round(r.maxZ) }
}

await mkdir(PUBLIC_DATA, { recursive: true })
await mkdir(BUILD, { recursive: true })
await writeFile(join(PUBLIC_DATA, "map.json"), JSON.stringify(map))
await writeFile(join(PUBLIC_DATA, "sdf.bin"), Buffer.from(sdfOut.buffer))

// Terrain grid for Blender: float32 heights then uint8 biomes.
await writeFile(join(BUILD, "terrain.bin"), Buffer.concat([Buffer.from(height.buffer), Buffer.from(biome.buffer)]))
await writeFile(
  join(BUILD, "terrain.json"),
  JSON.stringify({ minX: WORLD.minX, minZ: WORLD.minZ, cell, nx, nz, biomes: BIOME }),
)

const counts = Object.fromEntries(Object.entries(map.props).map(([k, v]) => [k, v.length]))
console.log(
  `map: ${nx}×${nz} terrain grid, sdf ${snx}×${snz}, play ${Math.round(PLAY.maxX - PLAY.minX)}×${Math.round(PLAY.maxZ - PLAY.minZ)} units`,
)
console.log(`landmarks ${landmarks.length}, water rocks ${waterRocks.length}, boats ${boats.length}, routes ${routes.map((r) => r.length).join("/")}`)
console.log("props", counts)
for (const w of warnings.slice(0, 12)) console.warn("warn:", w)

// ---------------------------------------------------------------------------
// Optional top-down debug render

const debugIdx = process.argv.indexOf("--debug")
if (debugIdx > 0) {
  const { default: sharp } = await import("sharp")
  const PAL = [
    [34, 92, 120],
    [224, 200, 150],
    [214, 170, 110],
    [92, 140, 70],
    [80, 72, 72],
    [200, 196, 186],
    [196, 140, 90],
    [230, 214, 170],
  ]
  const img = Buffer.alloc(nx * nz * 3)
  for (let k = 0; k < N; k++) {
    const c = PAL[biome[k]]
    const shade = biome[k] === 0 ? 1 : clamp(0.75 + height[k] / 60, 0.6, 1.3)
    img[k * 3] = clamp(c[0] * shade, 0, 255)
    img[k * 3 + 1] = clamp(c[1] * shade, 0, 255)
    img[k * 3 + 2] = clamp(c[2] * shade, 0, 255)
  }
  const dot = (x, z, rgb, r = 1) => {
    const ci = Math.round((x - WORLD.minX) / cell)
    const cj = Math.round((z - WORLD.minZ) / cell)
    for (let a = -r; a <= r; a++)
      for (let b = -r; b <= r; b++) {
        const i = ci + a
        const j = cj + b
        if (i < 0 || j < 0 || i >= nx || j >= nz) continue
        const k = (j * nx + i) * 3
        img[k] = rgb[0]
        img[k + 1] = rgb[1]
        img[k + 2] = rgb[2]
      }
  }
  for (const r of routes) for (const [x, z] of r.points) dot(x, z, [255, 255, 255], 0)
  for (const [x, z] of waterRocks) dot(x, z, [20, 20, 20], 1)
  for (const b of boats) dot(b.x, b.z, [250, 250, 250], 2)
  for (const p of houses) dot(p[0], p[2], [60, 120, 220], 0)
  for (const p of blocks) dot(p[0], p[2], [150, 150, 150], 0)
  for (const lm of landmarks) {
    dot(lm.site.x, lm.site.z, [255, 0, 180], 3)
    if (lm.nest) dot(lm.nest.x, lm.nest.z, [255, 230, 0], 3)
  }
  dot(start.x, start.z, [255, 60, 0], 4)
  // Play-area outline.
  for (let x = PLAY.minX; x < PLAY.maxX; x += cell) {
    dot(x, PLAY.minZ, [255, 80, 80], 0)
    dot(x, PLAY.maxZ, [255, 80, 80], 0)
  }
  for (let z = PLAY.minZ; z < PLAY.maxZ; z += cell) {
    dot(PLAY.minX, z, [255, 80, 80], 0)
    dot(PLAY.maxX, z, [255, 80, 80], 0)
  }
  // Lat/lon graticule every 0.002° so routes and zones can be read off the image.
  const lines = []
  for (let lat = Math.ceil(WORLD_BOUNDS.south / 0.002) * 0.002; lat < WORLD_BOUNDS.north; lat += 0.002) {
    const y = (project(lat, ORIGIN.lon).z - WORLD.minZ) / cell
    lines.push(`<line x1="0" x2="${nx}" y1="${y}" y2="${y}" stroke="#fff" stroke-opacity=".25"/>`)
    lines.push(`<text x="2" y="${y - 2}" font-size="9" fill="#fff">${lat.toFixed(3)}</text>`)
  }
  for (let lon = Math.ceil(WORLD_BOUNDS.west / 0.002) * 0.002; lon < WORLD_BOUNDS.east; lon += 0.002) {
    const x = (project(ORIGIN.lat, lon).x - WORLD.minX) / cell
    lines.push(`<line y1="0" y2="${nz}" x1="${x}" x2="${x}" stroke="#fff" stroke-opacity=".25"/>`)
    lines.push(`<text y="10" x="${x + 2}" font-size="9" fill="#fff">${lon.toFixed(3)}</text>`)
  }
  const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${nx}" height="${nz}">${lines.join("")}</svg>`)
  // sharp resizes before compositing, so composite first, then scale in a second pass.
  const flat = await sharp(img, { raw: { width: nx, height: nz, channels: 3 } }).composite([{ input: svg }]).png().toBuffer()
  await sharp(flat).resize(nx * 2).toFile(process.argv[debugIdx + 1])
  console.log("debug render:", process.argv[debugIdx + 1])
}
