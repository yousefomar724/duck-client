import type { GameMap } from "./types"

/**
 * Shoreline signed-distance field: negative on water (distance to the bank),
 * positive on land. Sampled bilinearly; the gradient points inland.
 */
export class ShoreField {
  readonly minX: number
  readonly minZ: number
  readonly cell: number
  readonly nx: number
  readonly nz: number
  readonly data: Float32Array

  constructor(meta: GameMap["sdf"], raw: Int16Array) {
    this.minX = meta.minX
    this.minZ = meta.minZ
    this.cell = meta.cell
    this.nx = meta.nx
    this.nz = meta.nz
    this.data = new Float32Array(raw.length)
    for (let i = 0; i < raw.length; i++) this.data[i] = raw[i] * meta.unit
  }

  /** Distance to shore (game units): < 0 on water, > 0 on land. Outside the grid reads as open water. */
  sample(x: number, z: number): number {
    const fi = (x - this.minX) / this.cell
    const fj = (z - this.minZ) / this.cell
    if (fi < 0 || fj < 0 || fi >= this.nx - 1 || fj >= this.nz - 1) return -50
    const i = Math.floor(fi)
    const j = Math.floor(fj)
    const tx = fi - i
    const tz = fj - j
    const k = j * this.nx + i
    const a = this.data[k]
    const b = this.data[k + 1]
    const c = this.data[k + this.nx]
    const d = this.data[k + this.nx + 1]
    return a + (b - a) * tx + (c - a) * tz + (a - b - c + d) * tx * tz
  }

  /** Unit gradient (points toward land). */
  gradient(x: number, z: number, out: { x: number; z: number }) {
    const e = 0.75
    const gx = this.sample(x + e, z) - this.sample(x - e, z)
    const gz = this.sample(x, z + e) - this.sample(x, z - e)
    const len = Math.hypot(gx, gz) || 1
    out.x = gx / len
    out.z = gz / len
    return out
  }
}
