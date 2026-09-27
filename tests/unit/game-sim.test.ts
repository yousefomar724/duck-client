import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { ShoreField } from "@/game/core/sdf"
import { createSim, lineMultiplier, linePoints, step, type StrokeInput } from "@/game/core/sim"
import { TUNING } from "@/game/core/tuning"
import type { GameMap } from "@/game/core/types"

const DATA = join(process.cwd(), "public", "game", "data")
const map = JSON.parse(readFileSync(join(DATA, "map.json"), "utf8")) as GameMap
const buf = readFileSync(join(DATA, "sdf.bin"))
const shore = new ShoreField(map.sdf, new Int16Array(buf.buffer, buf.byteOffset, buf.byteLength / 2))

/** Alternate strokes every ~0.3 s — the "go straight" rhythm. */
function alternating(tick: number): StrokeInput {
  const phase = Math.floor(tick / 18) % 2
  return { left: phase === 0, right: phase === 1 }
}

describe("game map data", () => {
  it("starts the kayak on open water", () => {
    expect(shore.sample(map.start.x, map.start.z)).toBeLessThan(-3)
  })

  it("puts every nest on the water", () => {
    for (const lm of map.landmarks) {
      if (lm.nest) expect(shore.sample(lm.nest.x, lm.nest.z), lm.id).toBeLessThan(-2)
    }
  })

  it("keeps land on the islands", () => {
    const elephantine = map.landmarks.find((l) => l.id === "khnumTemple")!
    expect(shore.sample(elephantine.site.x, elephantine.site.z)).toBeGreaterThan(0)
  })
})

describe("duckling rescue sim", () => {
  it("paddles forward when strokes alternate", () => {
    const sim = createSim(map, shore, 1)
    const { x, z } = sim.state.kayak
    for (let t = 0; t < 180; t++) step(sim, alternating(t))
    const moved = Math.hypot(sim.state.kayak.x - x, sim.state.kayak.z - z)
    expect(moved).toBeGreaterThan(8)
  })

  it("turns right on left strokes and left on right strokes", () => {
    const left = createSim(map, shore, 1)
    const right = createSim(map, shore, 1)
    const h0 = left.state.kayak.heading
    for (let t = 0; t < 60; t++) {
      step(left, { left: true, right: false })
      step(right, { left: false, right: true })
    }
    // Heading grows when turning left, so a left stroke must lower it.
    expect(left.state.kayak.heading).toBeLessThan(h0)
    expect(right.state.kayak.heading).toBeGreaterThan(h0)
  })

  it("leads the first ducklings straight into the village nest", () => {
    const sim = createSim(map, shore, 1)
    const events = []
    for (let t = 0; t < 60 * 10; t++) events.push(...step(sim, alternating(t)))
    const pickups = events.filter((e) => e.type === "pickup")
    const deliver = events.find((e) => e.type === "deliver")
    expect(pickups.length).toBeGreaterThanOrEqual(2)
    expect(deliver).toMatchObject({ nest: "nubianVillage" })
    expect(sim.state.score).toBeGreaterThan(0)
  })

  it("never lets the kayak leave the water", () => {
    const sim = createSim(map, shore, 7)
    // Hold one side: the kayak circles and scrapes along whatever is nearby.
    for (let t = 0; t < 60 * 30; t++) {
      step(sim, t % 400 < 200 ? alternating(t) : { left: true, right: false })
      expect(shore.sample(sim.state.kayak.x, sim.state.kayak.z)).toBeLessThan(0.5)
    }
  })

  it("is deterministic for the same seed and inputs", () => {
    const a = createSim(map, shore, 42)
    const b = createSim(map, shore, 42)
    for (let t = 0; t < 60 * 20; t++) {
      const input = alternating(t + (t > 300 ? 9 : 0))
      step(a, input)
      step(b, input)
    }
    expect(a.state.kayak).toEqual(b.state.kayak)
    expect(a.state.free.map((d) => [d.x, d.z])).toEqual(b.state.free.map((d) => [d.x, d.z]))
    expect(a.state.score).toBe(b.state.score)
    expect(a.state.inputLog).toEqual(b.state.inputLog)
  })

  it("ends at sunset", () => {
    const sim = createSim(map, shore, 3)
    let ended = false
    for (let t = 0; t < TUNING.duration * 60 + 5; t++) {
      if (step(sim, { left: false, right: false }).some((e) => e.type === "end")) ended = true
    }
    expect(ended).toBe(true)
    expect(sim.state.over).toBe(true)
  })

  it("rewards long lines with a multiplier", () => {
    expect(lineMultiplier(1)).toBe(1)
    expect(lineMultiplier(11)).toBeCloseTo(2)
    expect(lineMultiplier(100)).toBe(TUNING.ducks.multiplierCap)
    const five = Array.from({ length: 5 }, () => ({ golden: false }))
    expect(linePoints(five)).toBe(Math.round(5 * TUNING.ducks.points * 1.4))
    expect(linePoints([{ golden: true }])).toBe(TUNING.ducks.goldenValue * TUNING.ducks.points)
  })
})
