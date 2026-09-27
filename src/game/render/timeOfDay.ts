import { Color, Vector3 } from "three"

/**
 * A run lasts from late-afternoon gold to dusk. `u` goes 0 → 1 over the run;
 * each key blends sky, sun, fog and water colours. The sun sets over the
 * west-bank dunes (−x), exactly where it sets over Aswan.
 */
interface Key {
  u: number
  elevation: number // degrees
  skyTop: string
  skyHorizon: string
  sun: string
  sunIntensity: number
  hemiSky: string
  hemiGround: string
  hemiIntensity: number
  fog: string
  waterDeep: string
  waterShallow: string
}

const KEYS: Key[] = [
  {
    u: 0,
    elevation: 24,
    skyTop: "#4f86cf",
    skyHorizon: "#f1dcb2",
    sun: "#fff0d2",
    sunIntensity: 2.4,
    hemiSky: "#cfe0f5",
    hemiGround: "#c79a64",
    hemiIntensity: 1.25,
    fog: "#e9d9bb",
    waterDeep: "#1d5f7a",
    waterShallow: "#3fa3a6",
  },
  {
    u: 0.5,
    elevation: 11,
    skyTop: "#5a7fc4",
    skyHorizon: "#f6c486",
    sun: "#ffd49a",
    sunIntensity: 2.2,
    hemiSky: "#d8d6e6",
    hemiGround: "#c98f58",
    hemiIntensity: 1.1,
    fog: "#efcfa0",
    waterDeep: "#235a78",
    waterShallow: "#4c9ea0",
  },
  {
    u: 0.82,
    elevation: 3,
    skyTop: "#48589a",
    skyHorizon: "#f59a5e",
    sun: "#ffa262",
    sunIntensity: 1.7,
    hemiSky: "#c9b3c8",
    hemiGround: "#b27a52",
    hemiIntensity: 0.95,
    fog: "#e7a57a",
    waterDeep: "#2e4d72",
    waterShallow: "#5a8b95",
  },
  {
    u: 1,
    elevation: -1.5,
    skyTop: "#2f3570",
    skyHorizon: "#e0745c",
    sun: "#ff7d4d",
    sunIntensity: 1.0,
    hemiSky: "#9c93b8",
    hemiGround: "#8a5a45",
    hemiIntensity: 0.8,
    fog: "#b97a72",
    waterDeep: "#2a3d63",
    waterShallow: "#4c6c82",
  },
]

export interface SkyState {
  sunDir: Vector3
  skyTop: Color
  skyHorizon: Color
  sun: Color
  sunIntensity: number
  hemiSky: Color
  hemiGround: Color
  hemiIntensity: number
  fog: Color
  waterDeep: Color
  waterShallow: Color
}

export function createSkyState(): SkyState {
  return {
    sunDir: new Vector3(),
    skyTop: new Color(),
    skyHorizon: new Color(),
    sun: new Color(),
    sunIntensity: 1,
    hemiSky: new Color(),
    hemiGround: new Color(),
    hemiIntensity: 1,
    fog: new Color(),
    waterDeep: new Color(),
    waterShallow: new Color(),
  }
}

const ca = new Color()
const cb = new Color()
const COLOR_KEYS = ["skyTop", "skyHorizon", "sun", "hemiSky", "hemiGround", "fog", "waterDeep", "waterShallow"] as const

/** Sunset azimuth: due west, a touch south — late-September Aswan. */
const AZIMUTH = (-100 * Math.PI) / 180

export function sampleSky(u: number, out: SkyState): SkyState {
  const t = Math.min(1, Math.max(0, u))
  let i = 0
  while (i < KEYS.length - 2 && t > KEYS[i + 1].u) i++
  const a = KEYS[i]
  const b = KEYS[i + 1]
  const f = (t - a.u) / (b.u - a.u)
  for (const key of COLOR_KEYS) {
    ca.set(a[key])
    cb.set(b[key])
    out[key].copy(ca).lerp(cb, f)
  }
  out.sunIntensity = a.sunIntensity + (b.sunIntensity - a.sunIntensity) * f
  out.hemiIntensity = a.hemiIntensity + (b.hemiIntensity - a.hemiIntensity) * f
  const el = ((a.elevation + (b.elevation - a.elevation) * f) * Math.PI) / 180
  // Heading convention: azimuth measured like the kayak's heading (sin → x, cos → z).
  out.sunDir.set(Math.sin(AZIMUTH) * Math.cos(el), Math.sin(el), Math.cos(AZIMUTH) * Math.cos(el)).normalize()
  return out
}
