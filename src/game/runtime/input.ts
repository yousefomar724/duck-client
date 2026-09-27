import type { Kayak, Side, StrokeInput } from "../core/sim"

export type ControlMode = "paddle" | "joystick"

/**
 * Turns touches and keys into per-tick stroke intents for the sim.
 *
 * Paddle mode is the real thing: tap the left half to paddle on the left
 * (which turns you right), the right half for the right; alternate — or hold
 * both — to go straight. Joystick mode is an autopilot that chooses strokes
 * to steer toward where the stick points, for players who just want to go.
 */
export class InputController {
  mode: ControlMode = "paddle"
  /** Camera yaw in the kayak's heading convention (joystick is screen-relative). */
  cameraYaw = 0

  private held = { left: 0, right: 0 }
  private queued = { left: 0, right: 0 }
  private keys = new Set<string>()
  private stick = { x: 0, y: 0, active: false }
  /** Which side each active pointer is holding. */
  private pointers = new Map<number, Side>()

  pressSide(pointerId: number, side: Side) {
    this.pointers.set(pointerId, side)
    if (side < 0) {
      this.held.left++
      this.queued.left = 1
    } else {
      this.held.right++
      this.queued.right = 1
    }
  }

  releasePointer(pointerId: number) {
    const side = this.pointers.get(pointerId)
    if (side === undefined) return
    this.pointers.delete(pointerId)
    if (side < 0) this.held.left = Math.max(0, this.held.left - 1)
    else this.held.right = Math.max(0, this.held.right - 1)
  }

  setStick(x: number, y: number, active: boolean) {
    this.stick.x = x
    this.stick.y = y
    this.stick.active = active
  }

  keyDown(code: string) {
    if (this.keys.has(code)) return
    this.keys.add(code)
    if (code === "ArrowLeft" || code === "KeyA") this.queued.left = 1
    if (code === "ArrowRight" || code === "KeyD") this.queued.right = 1
  }

  keyUp(code: string) {
    this.keys.delete(code)
  }

  reset() {
    this.held.left = this.held.right = 0
    this.queued.left = this.queued.right = 0
    this.keys.clear()
    this.pointers.clear()
    this.stick.active = false
  }

  /** The sim started a stroke on `side`: that queued tap is spent. */
  consume(side: Side) {
    if (side < 0) this.queued.left = 0
    else this.queued.right = 0
  }

  sample(kayak: Kayak): StrokeInput {
    const k = this.keys
    const cruise = k.has("ArrowUp") || k.has("KeyW") || k.has("Space")
    let left = this.held.left > 0 || this.queued.left > 0 || k.has("ArrowLeft") || k.has("KeyA") || cruise
    let right = this.held.right > 0 || this.queued.right > 0 || k.has("ArrowRight") || k.has("KeyD") || cruise

    if (this.mode === "joystick" && this.stick.active) {
      const mag = Math.hypot(this.stick.x, this.stick.y)
      if (mag > 0.22) {
        // Screen-up is the camera's forward; stick-right turns right (heading decreases).
        const target = this.cameraYaw - Math.atan2(this.stick.x, -this.stick.y)
        let err = target - kayak.heading - kayak.omega * 0.35
        err = Math.atan2(Math.sin(err), Math.cos(err))
        if (err > 0.3) {
          left = false
          right = true // right strokes turn left
        } else if (err < -0.3) {
          left = true
          right = false
        } else {
          left = right = true
        }
      }
    }
    return { left, right }
  }
}
