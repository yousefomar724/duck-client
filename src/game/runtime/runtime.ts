import { ShoreField } from "../core/sdf"
import { createSim, step, type Sim, type SimEvent } from "../core/sim"
import { TUNING } from "../core/tuning"
import type { GameMap } from "../core/types"
import { InputController } from "./input"

export interface GameData {
  map: GameMap
  shore: ShoreField
}

let dataPromise: Promise<GameData> | null = null

/** Fetches map.json + the shoreline SDF once per page load. */
export function loadGameData(): Promise<GameData> {
  dataPromise ??= (async () => {
    const map = (await fetch("/game/data/map.json").then((r) => {
      if (!r.ok) throw new Error(`map.json: HTTP ${r.status}`)
      return r.json()
    })) as GameMap
    const buf = await fetch(map.sdf.url).then((r) => {
      if (!r.ok) throw new Error(`sdf.bin: HTTP ${r.status}`)
      return r.arrayBuffer()
    })
    return { map, shore: new ShoreField(map.sdf, new Int16Array(buf)) }
  })().catch((err) => {
    dataPromise = null
    throw err
  })
  return dataPromise
}

type Listener = (e: SimEvent) => void

/** Kayak pose from the previous step, for smooth rendering between 60 Hz ticks. */
export interface Pose {
  x: number
  z: number
  heading: number
}

/**
 * Owns one run: the sim, the input controller and the fixed-step clock.
 * Render components read `sim.state` (and `alpha` to interpolate); UI
 * listens to events.
 */
export class GameRuntime {
  readonly data: GameData
  readonly input = new InputController()
  sim: Sim
  running = false
  /** 0..1 progress between the previous and current step. */
  alpha = 0
  readonly prev: Pose = { x: 0, z: 0, heading: 0 }
  private acc = 0
  private listeners = new Set<Listener>()

  constructor(data: GameData, seed: number) {
    this.data = data
    this.sim = createSim(data.map, data.shore, seed)
    this.snapshot()
  }

  restart(seed: number) {
    this.sim = createSim(this.data.map, this.data.shore, seed)
    this.input.reset()
    this.acc = 0
    this.alpha = 0
    this.snapshot()
  }

  on(fn: Listener) {
    this.listeners.add(fn)
    return () => {
      this.listeners.delete(fn)
    }
  }

  private snapshot() {
    const k = this.sim.state.kayak
    this.prev.x = k.x
    this.prev.z = k.z
    this.prev.heading = k.heading
  }

  /** Advance by a frame's real time; runs 0+ fixed steps. */
  update(frameDt: number) {
    if (!this.running || this.sim.state.over) return
    // Clamp long frames (tab switches) so the sim never fast-forwards.
    this.acc += Math.min(frameDt, 0.1)
    const dt = TUNING.dt
    while (this.acc >= dt) {
      this.acc -= dt
      this.snapshot()
      const events = step(this.sim, this.input.sample(this.sim.state.kayak))
      for (const e of events) {
        if (e.type === "stroke") this.input.consume(e.side)
        for (const fn of this.listeners) fn(e)
      }
      if (this.sim.state.over) {
        this.acc = 0
        break
      }
    }
    this.alpha = this.acc / dt
  }

  /** Interpolated kayak pose for rendering. */
  pose(out: Pose): Pose {
    const k = this.sim.state.kayak
    const a = this.alpha
    out.x = this.prev.x + (k.x - this.prev.x) * a
    out.z = this.prev.z + (k.z - this.prev.z) * a
    let dh = k.heading - this.prev.heading
    dh = Math.atan2(Math.sin(dh), Math.cos(dh))
    out.heading = this.prev.heading + dh * a
    return out
  }
}
