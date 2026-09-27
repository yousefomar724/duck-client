/** Small seeded PRNG (mulberry32). The sim only ever draws randomness from here. */
export function createRng(seed: number) {
  let a = seed >>> 0
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  return {
    next,
    range: (lo: number, hi: number) => lo + next() * (hi - lo),
    int: (n: number) => Math.floor(next() * n),
    /** Serialisable state, so a run can be snapshotted. */
    get state() {
      return a
    },
  }
}

export type Rng = ReturnType<typeof createRng>
