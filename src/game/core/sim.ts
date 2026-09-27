/**
 * Duckling Rescue simulation — pure, deterministic, renderer-agnostic.
 *
 * Fixed 60 Hz steps, seeded randomness, and every input recorded in
 * `inputLog`. Given the same map, seed and log, a server can replay a run
 * tick-for-tick and re-derive its score — the hook the points/gifts stage
 * will use to reject forged scores.
 */

import { createRng, type Rng } from "./rng"
import type { ShoreField } from "./sdf"
import { TUNING as T } from "./tuning"
import type { GameMap, LandmarkId } from "./types"

export type Side = -1 | 1

/** Per-tick intent: which side(s) the player wants to stroke on. */
export interface StrokeInput {
  left: boolean
  right: boolean
}

export interface Kayak {
  x: number
  z: number
  heading: number
  /** Velocity relative to the water. */
  vx: number
  vz: number
  omega: number
  stroke: { side: Side; t: number } | null
  lastSide: Side
}

export interface FreeDuck {
  id: number
  x: number
  z: number
  vx: number
  vz: number
  golden: boolean
  grabAfter: number
  expires: number | null
  phase: number
}

export interface TrailDuck {
  id: number
  golden: boolean
  x: number
  z: number
  heading: number
}

export interface MovingBoat {
  kind: "felucca" | "motorboat"
  route: number
  offset: number
  speed: number
  x: number
  z: number
  heading: number
  vx: number
  vz: number
  halfLen: number
  radius: number
}

export type SimEvent =
  | { type: "stroke"; side: Side }
  | { type: "pickup"; golden: boolean; x: number; z: number; trail: number }
  | { type: "deliver"; nest: LandmarkId; count: number; golden: number; points: number; x: number; z: number }
  | { type: "scatter"; count: number; x: number; z: number }
  | { type: "bump"; strength: number; x: number; z: number }
  | { type: "discover"; id: LandmarkId; points: number }
  | { type: "golden"; x: number; z: number }
  | { type: "goldenGone" }
  | { type: "edge" }
  | { type: "end" }

export interface SimStats {
  rescued: number
  golden: number
  bestLine: number
  deliveries: number
  scatters: number
}

export interface SimState {
  seed: number
  tick: number
  time: number
  over: boolean
  score: number
  kayak: Kayak
  free: FreeDuck[]
  trail: TrailDuck[]
  boats: MovingBoat[]
  discovered: LandmarkId[]
  stats: SimStats
  invulnerableUntil: number
  lastEdgeWarning: number
  goldenIndex: number
  /** [tick, bits] whenever the input changes: bit 1 = left, bit 2 = right. */
  inputLog: [number, number][]
  lastInputBits: number
  nextId: number
}

export interface Sim {
  map: GameMap
  shore: ShoreField
  rng: Rng
  path: TrailPath
  state: SimState
  routes: RouteTable[]
  cataractZ: number
}

// ---------------------------------------------------------------------------
// Breadcrumb path the duckling line follows

class TrailPath {
  private readonly cap = 512
  private readonly xs = new Float64Array(this.cap)
  private readonly zs = new Float64Array(this.cap)
  private head = -1
  private count = 0

  reset(x: number, z: number, heading: number) {
    // Seed a straight line behind the start so the first ducklings have somewhere to sit.
    this.head = -1
    this.count = 0
    for (let d = 60; d >= 0; d -= 1) this.push(x - Math.sin(heading) * d, z - Math.cos(heading) * d, true)
  }

  push(x: number, z: number, force = false) {
    if (!force && this.count > 0) {
      const dx = x - this.xs[this.head]
      const dz = z - this.zs[this.head]
      if (dx * dx + dz * dz < 0.3 * 0.3) return
    }
    this.head = (this.head + 1) % this.cap
    this.xs[this.head] = x
    this.zs[this.head] = z
    this.count = Math.min(this.count + 1, this.cap)
  }

  /** Point `dist` units back along the path from (hx, hz). */
  pointAt(hx: number, hz: number, dist: number, out: { x: number; z: number; heading: number }) {
    let px = hx
    let pz = hz
    let remaining = dist
    for (let i = 0; i < this.count; i++) {
      const idx = (this.head - i + this.cap) % this.cap
      const qx = this.xs[idx]
      const qz = this.zs[idx]
      const seg = Math.hypot(qx - px, qz - pz)
      if (seg >= remaining && seg > 1e-6) {
        const t = remaining / seg
        out.x = px + (qx - px) * t
        out.z = pz + (qz - pz) * t
        out.heading = Math.atan2(px - qx, pz - qz)
        return out
      }
      remaining -= seg
      px = qx
      pz = qz
    }
    out.x = px
    out.z = pz
    return out
  }
}

// ---------------------------------------------------------------------------
// Felucca / motorboat routes

interface RouteTable {
  xs: Float64Array
  zs: Float64Array
  cum: Float64Array
  length: number
}

function buildRoute(points: [number, number][]): RouteTable {
  const n = points.length
  const xs = new Float64Array(n + 1)
  const zs = new Float64Array(n + 1)
  const cum = new Float64Array(n + 1)
  for (let i = 0; i <= n; i++) {
    const [x, z] = points[i % n]
    xs[i] = x
    zs[i] = z
    if (i > 0) cum[i] = cum[i - 1] + Math.hypot(x - xs[i - 1], z - zs[i - 1])
  }
  return { xs, zs, cum, length: cum[n] }
}

function placeOnRoute(r: RouteTable, s: number, boat: MovingBoat) {
  const d = ((s % r.length) + r.length) % r.length
  let lo = 0
  let hi = r.cum.length - 1
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (r.cum[mid] <= d) lo = mid
    else hi = mid
  }
  const seg = r.cum[hi] - r.cum[lo] || 1
  const t = (d - r.cum[lo]) / seg
  const dx = r.xs[hi] - r.xs[lo]
  const dz = r.zs[hi] - r.zs[lo]
  boat.x = r.xs[lo] + dx * t
  boat.z = r.zs[lo] + dz * t
  const len = Math.hypot(dx, dz) || 1
  boat.heading = Math.atan2(dx, dz)
  boat.vx = (dx / len) * boat.speed
  boat.vz = (dz / len) * boat.speed
}

// ---------------------------------------------------------------------------

const smoothstep = (a: number, b: number, v: number) => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

export function lineMultiplier(n: number) {
  return Math.min(T.ducks.multiplierCap, 1 + T.ducks.multiplierStep * Math.max(0, n - 1))
}

export function lineValue(trail: { golden: boolean }[]) {
  let v = 0
  for (const d of trail) v += d.golden ? T.ducks.goldenValue : 1
  return v
}

/** Points the current line would bank right now. */
export function linePoints(trail: { golden: boolean }[]) {
  return Math.round(lineValue(trail) * T.ducks.points * lineMultiplier(trail.length))
}

export function createSim(map: GameMap, shore: ShoreField, seed: number): Sim {
  const rng = createRng(seed)
  const routes = map.routes.map((r) => buildRoute(r.points))
  const boats: MovingBoat[] = []
  // Two boats per lane, half a loop apart. The long east lane carries water taxis.
  routes.forEach((r, i) => {
    const kind = i === 1 ? "motorboat" : "felucca"
    for (let k = 0; k < 2; k++) {
      boats.push({
        kind,
        route: i,
        offset: (r.length / 2) * k + rng.range(0, 30),
        speed: kind === "motorboat" ? T.boats.motorboatSpeed : T.boats.feluccaSpeed,
        x: 0,
        z: 0,
        heading: 0,
        vx: 0,
        vz: 0,
        halfLen: kind === "motorboat" ? 5.2 : 4.3,
        radius: kind === "motorboat" ? 1.6 : 1.5,
      })
    }
  })
  boats.forEach((b) => placeOnRoute(routes[b.route], b.offset, b))

  const cataract = map.landmarks.find((l) => l.id === "firstCataract")
  const sim: Sim = {
    map,
    shore,
    rng,
    path: new TrailPath(),
    routes,
    cataractZ: cataract ? cataract.site.z - 90 : 100,
    state: {
      seed,
      tick: 0,
      time: 0,
      over: false,
      score: 0,
      kayak: {
        x: map.start.x,
        z: map.start.z,
        heading: map.start.heading,
        vx: Math.sin(map.start.heading) * T.kayak.startSpeed,
        vz: Math.cos(map.start.heading) * T.kayak.startSpeed,
        omega: 0,
        stroke: null,
        lastSide: 1,
      },
      free: [],
      trail: [],
      boats,
      discovered: [],
      stats: { rescued: 0, golden: 0, bestLine: 0, deliveries: 0, scatters: 0 },
      invulnerableUntil: 0,
      lastEdgeWarning: -99,
      goldenIndex: 0,
      inputLog: [],
      lastInputBits: 0,
      nextId: 1,
    },
  }
  sim.path.reset(map.start.x, map.start.z, map.start.heading)

  // A few ducklings straight ahead teach the loop before the player has to search.
  const k = sim.state.kayak
  for (const d of [10, 17, 24]) {
    const x = k.x + Math.sin(k.heading) * d + rng.range(-3, 3)
    const z = k.z + Math.cos(k.heading) * d
    if (shore.sample(x, z) < -3) addFree(sim, x, z, false)
  }
  for (let i = 0; i < T.ducks.freeTarget * 3 && regularCount(sim) < T.ducks.freeTarget; i++) spawnRegular(sim)
  return sim
}

function addFree(sim: Sim, x: number, z: number, golden: boolean, expires: number | null = null): FreeDuck {
  const duck: FreeDuck = {
    id: sim.state.nextId++,
    x,
    z,
    vx: 0,
    vz: 0,
    golden,
    grabAfter: 0,
    expires,
    phase: sim.rng.range(0, Math.PI * 2),
  }
  sim.state.free.push(duck)
  return duck
}

const regularCount = (sim: Sim) => sim.state.free.reduce((n, d) => n + (d.golden ? 0 : 1), 0)

function spawnPoint(sim: Sim, minDist: number, maxDist: number) {
  const { map, shore, rng, state } = sim
  const { play } = map
  for (let attempt = 0; attempt < 40; attempt++) {
    const x = rng.range(play.minX + 18, play.maxX - 18)
    const z = rng.range(play.minZ + 18, play.maxZ - 18)
    if (shore.sample(x, z) > -T.ducks.spawnMinDepth) continue
    const dk = Math.hypot(x - state.kayak.x, z - state.kayak.z)
    if (dk < minDist || dk > maxDist) continue
    if (state.free.some((d) => Math.hypot(d.x - x, d.z - z) < T.ducks.spawnSpacing)) continue
    if (map.waterRocks.some(([rx, rz, rr]) => Math.hypot(rx - x, rz - z) < rr + 3)) continue
    if (map.landmarks.some((l) => l.nest && Math.hypot(l.nest.x - x, l.nest.z - z) < 14)) continue
    return { x, z }
  }
  return null
}

function spawnRegular(sim: Sim) {
  const p = spawnPoint(sim, T.ducks.spawnMinDistance, Infinity)
  if (p) addFree(sim, p.x, p.z, false)
}

// ---------------------------------------------------------------------------
// Collisions

const tmpN = { x: 0, z: 0 }

interface Contact {
  impact: number
  x: number
  z: number
}

function resolve(
  sim: Sim,
  lever: number,
  nx: number,
  nz: number,
  pen: number,
  ovx: number,
  ovz: number,
  current: { x: number; z: number },
  contact: Contact,
  cx: number,
  cz: number,
) {
  const k = sim.state.kayak
  k.x += nx * pen
  k.z += nz * pen
  // Relative velocity in the ground frame.
  const gx = k.vx + current.x - ovx
  const gz = k.vz + current.z - ovz
  const vn = gx * nx + gz * nz
  if (vn >= 0) return
  const j = -(1 + T.kayak.restitution) * vn
  k.vx += nx * j
  k.vz += nz * j
  // Off-centre hits spin the kayak: a bow knocked right swings the nose right.
  const lx = Math.sin(k.heading) * lever
  const lz = Math.cos(k.heading) * lever
  k.omega -= (lx * nz * j - lz * nx * j) * 0.1
  if (-vn > contact.impact) {
    contact.impact = -vn
    contact.x = cx
    contact.z = cz
  }
}

function collide(sim: Sim, current: { x: number; z: number }): Contact {
  const { shore, map, state } = sim
  const k = state.kayak
  const contact: Contact = { impact: 0, x: k.x, z: k.z }
  const r = T.kayak.circleRadius
  for (const lever of [T.kayak.circleOffset, -T.kayak.circleOffset]) {
    let cx = k.x + Math.sin(k.heading) * lever
    let cz = k.z + Math.cos(k.heading) * lever

    // Shore.
    const s = shore.sample(cx, cz)
    if (s > -r) {
      shore.gradient(cx, cz, tmpN)
      resolve(sim, lever, -tmpN.x, -tmpN.z, s + r, 0, 0, current, contact, cx, cz)
      cx = k.x + Math.sin(k.heading) * lever
      cz = k.z + Math.cos(k.heading) * lever
    }

    // Granite boulders.
    for (const [rx, rz, rr] of map.waterRocks) {
      const dx = cx - rx
      const dz = cz - rz
      const min = r + rr * 0.92
      const d2 = dx * dx + dz * dz
      if (d2 >= min * min) continue
      const d = Math.sqrt(d2) || 1e-4
      resolve(sim, lever, dx / d, dz / d, min - d, 0, 0, current, contact, cx, cz)
    }

    // Moored and sailing boats (capsules).
    const capsule = (bx: number, bz: number, yaw: number, halfLen: number, radius: number, vx: number, vz: number) => {
      const fx = Math.sin(yaw)
      const fz = Math.cos(yaw)
      const seg = Math.max(0, halfLen - radius)
      let t = (cx - bx) * fx + (cz - bz) * fz
      t = Math.max(-seg, Math.min(seg, t))
      const qx = bx + fx * t
      const qz = bz + fz * t
      const dx = cx - qx
      const dz = cz - qz
      const min = r + radius
      const d2 = dx * dx + dz * dz
      if (d2 >= min * min) return
      const d = Math.sqrt(d2) || 1e-4
      resolve(sim, lever, dx / d, dz / d, min - d, vx, vz, current, contact, cx, cz)
    }
    for (const b of map.boats) capsule(b.x, b.z, b.yaw, b.len / 2, b.radius, 0, 0)
    for (const b of state.boats) capsule(b.x, b.z, b.heading, b.halfLen, b.radius, b.vx, b.vz)
  }
  return contact
}

function currentAt(sim: Sim, x: number, z: number, out: { x: number; z: number }) {
  const depth = -sim.shore.sample(x, z)
  const mag = (T.current.base + T.current.cataract * smoothstep(sim.cataractZ - 40, sim.cataractZ + 70, z)) * smoothstep(0, 10, depth)
  out.x = 0
  out.z = -mag
  return out
}

// ---------------------------------------------------------------------------
// Step

const current = { x: 0, z: 0 }
const pt = { x: 0, z: 0, heading: 0 }

export function step(sim: Sim, input: StrokeInput): SimEvent[] {
  const events: SimEvent[] = []
  const { state, map, rng } = sim
  if (state.over) return events
  const dt = T.dt
  state.tick++
  state.time += dt
  const k = state.kayak

  // Input log (for replay validation).
  const bits = (input.left ? 1 : 0) | (input.right ? 2 : 0)
  if (bits !== state.lastInputBits) {
    state.inputLog.push([state.tick, bits])
    state.lastInputBits = bits
  }

  // --- Strokes -------------------------------------------------------------
  const wants: Side | 0 =
    input.left && input.right ? ((-k.lastSide) as Side) : input.left ? -1 : input.right ? 1 : 0
  if (wants) {
    const s = k.stroke
    const canStart = !s || (s.side !== wants && s.t > T.kayak.strokeTime * T.kayak.alternateAt)
    if (canStart) {
      k.stroke = { side: wants, t: 0 }
      k.lastSide = wants
      events.push({ type: "stroke", side: wants })
    }
  }

  let fx = Math.sin(k.heading)
  let fz = Math.cos(k.heading)
  if (k.stroke) {
    const f = Math.sin((Math.PI * k.stroke.t) / T.kayak.strokeTime)
    k.vx += fx * T.kayak.strokeThrust * f * dt
    k.vz += fz * T.kayak.strokeThrust * f * dt
    k.omega += k.stroke.side * T.kayak.strokeYaw * f * dt
    k.stroke.t += dt
    if (k.stroke.t >= T.kayak.strokeTime) k.stroke = null
  }

  // --- Hull drag: slides forward easily, resists sideways ------------------
  const vf = k.vx * fx + k.vz * fz
  const vl = k.vx * fz - k.vz * fx
  const vf2 = vf * Math.exp(-(T.kayak.dragForward + T.kayak.dragQuadratic * Math.abs(vf)) * dt)
  const vl2 = vl * Math.exp(-T.kayak.dragLateral * dt)
  k.vx = fx * vf2 + fz * vl2
  k.vz = fz * vf2 - fx * vl2
  k.omega *= Math.exp(-T.kayak.dragAngular * dt)
  k.heading += k.omega * dt
  fx = Math.sin(k.heading)
  fz = Math.cos(k.heading)

  // --- Boats sail their lanes ---------------------------------------------
  for (const b of state.boats) placeOnRoute(sim.routes[b.route], b.offset + b.speed * state.time, b)

  // --- Move with the Nile's current ---------------------------------------
  currentAt(sim, k.x, k.z, current)
  k.x += (k.vx + current.x) * dt
  k.z += (k.vz + current.z) * dt

  const contact = collide(sim, current)
  if (contact.impact > 0.8) events.push({ type: "bump", strength: contact.impact, x: contact.x, z: contact.z })

  // --- Soft edge of the tour area -----------------------------------------
  const { play } = map
  const m = T.edgeMargin
  const ex = k.x < play.minX + m ? play.minX + m - k.x : k.x > play.maxX - m ? play.maxX - m - k.x : 0
  const ez = k.z < play.minZ + m ? play.minZ + m - k.z : k.z > play.maxZ - m ? play.maxZ - m - k.z : 0
  if (ex || ez) {
    k.vx += ex * 3 * dt
    k.vz += ez * 3 * dt
    k.x += ex * 0.8 * dt
    k.z += ez * 0.8 * dt
    if (state.time - state.lastEdgeWarning > 4) {
      state.lastEdgeWarning = state.time
      events.push({ type: "edge" })
    }
  }

  // --- Duckling line --------------------------------------------------------
  sim.path.push(k.x, k.z)
  for (let i = 0; i < state.trail.length; i++) {
    const d = state.trail[i]
    sim.path.pointAt(k.x, k.z, T.ducks.trailFirst + i * T.ducks.trailGap, pt)
    d.x = pt.x
    d.z = pt.z
    d.heading = pt.heading
  }

  // Hard hits scatter the tail of the line.
  if (contact.impact > T.hits.scatterSpeed && state.time >= state.invulnerableUntil && state.trail.length > 0) {
    const lose = Math.max(1, Math.ceil(state.trail.length * T.hits.scatterFraction))
    const lost = state.trail.splice(state.trail.length - lose, lose)
    for (const d of lost) {
      const ang = Math.atan2(d.x - k.x, d.z - k.z) + rng.range(-0.9, 0.9)
      const sp = rng.range(2.5, 5)
      state.free.push({
        id: d.id,
        x: d.x,
        z: d.z,
        vx: Math.sin(ang) * sp,
        vz: Math.cos(ang) * sp,
        golden: d.golden,
        grabAfter: state.time + T.hits.regrabDelay,
        expires: null,
        phase: rng.range(0, Math.PI * 2),
      })
    }
    state.invulnerableUntil = state.time + T.hits.invulnerable
    state.stats.scatters++
    events.push({ type: "scatter", count: lose, x: contact.x, z: contact.z })
  }

  // --- Free ducklings: drift (if scattered), pickups, expiry ---------------
  const bowX = k.x + fx * T.kayak.circleOffset
  const bowZ = k.z + fz * T.kayak.circleOffset
  for (let i = state.free.length - 1; i >= 0; i--) {
    const d = state.free[i]
    if (d.vx || d.vz) {
      d.x += d.vx * dt
      d.z += d.vz * dt
      const decay = Math.exp(-1.6 * dt)
      d.vx *= decay
      d.vz *= decay
      if (Math.abs(d.vx) + Math.abs(d.vz) < 0.05) d.vx = d.vz = 0
      // Paddle away from the bank rather than beaching.
      const s = sim.shore.sample(d.x, d.z)
      if (s > -1.5) {
        sim.shore.gradient(d.x, d.z, tmpN)
        d.x -= tmpN.x * (s + 1.5)
        d.z -= tmpN.z * (s + 1.5)
      }
    }
    if (d.expires !== null && state.time > d.expires) {
      state.free.splice(i, 1)
      events.push({ type: "goldenGone" })
      continue
    }
    if (state.time < d.grabAfter || state.trail.length >= T.ducks.maxTrail) continue
    const near =
      Math.hypot(d.x - k.x, d.z - k.z) < T.ducks.pickupRadius || Math.hypot(d.x - bowX, d.z - bowZ) < T.ducks.pickupRadius
    if (!near) continue
    state.free.splice(i, 1)
    sim.path.pointAt(k.x, k.z, T.ducks.trailFirst + state.trail.length * T.ducks.trailGap, pt)
    state.trail.push({ id: d.id, golden: d.golden, x: d.x, z: d.z, heading: pt.heading })
    state.stats.bestLine = Math.max(state.stats.bestLine, state.trail.length)
    events.push({ type: "pickup", golden: d.golden, x: d.x, z: d.z, trail: state.trail.length })
  }

  // --- Nests bank the line --------------------------------------------------
  if (state.trail.length > 0) {
    for (const lm of map.landmarks) {
      if (!lm.nest) continue
      if (Math.hypot(k.x - lm.nest.x, k.z - lm.nest.z) > lm.nest.r + 1.5) continue
      const points = linePoints(state.trail)
      const golden = state.trail.filter((d) => d.golden).length
      state.score += points
      state.stats.rescued += state.trail.length
      state.stats.golden += golden
      state.stats.deliveries++
      events.push({ type: "deliver", nest: lm.id, count: state.trail.length, golden, points, x: lm.nest.x, z: lm.nest.z })
      state.trail.length = 0
      break
    }
  }

  // --- Landmarks ------------------------------------------------------------
  for (const lm of map.landmarks) {
    if (state.discovered.includes(lm.id)) continue
    if (Math.hypot(k.x - lm.anchor.x, k.z - lm.anchor.z) > lm.discoverRadius) continue
    state.discovered.push(lm.id)
    state.score += T.landmarks.discoverPoints
    events.push({ type: "discover", id: lm.id, points: T.landmarks.discoverPoints })
  }

  // --- Keep the river stocked -----------------------------------------------
  if (state.tick % 20 === 0 && regularCount(sim) < T.ducks.freeTarget) spawnRegular(sim)
  const goldenAt = T.ducks.goldenAt[state.goldenIndex]
  if (goldenAt !== undefined && state.time >= goldenAt) {
    state.goldenIndex++
    const p = spawnPoint(sim, 60, 180)
    if (p) {
      addFree(sim, p.x, p.z, true, state.time + T.ducks.goldenLife)
      events.push({ type: "golden", x: p.x, z: p.z })
    }
  }

  // --- Sunset ends the run --------------------------------------------------
  if (state.time >= T.duration) {
    state.over = true
    events.push({ type: "end" })
  }
  return events
}
