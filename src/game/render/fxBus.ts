/** Fire-and-forget visual effects, emitted by the loop/players and drawn by <Effects/>. */
export type FxEvent =
  | { type: "splash"; x: number; z: number; amount: number }
  | { type: "sparkle"; x: number; z: number; golden: boolean }
  | { type: "confetti"; x: number; z: number }
  | { type: "spray"; x: number; z: number }

type Listener = (e: FxEvent) => void
const listeners = new Set<Listener>()

export const fx = {
  emit(e: FxEvent) {
    for (const l of listeners) l(e)
  },
  on(l: Listener) {
    listeners.add(l)
    return () => {
      listeners.delete(l)
    }
  },
}
