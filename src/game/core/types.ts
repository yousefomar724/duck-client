/** Shape of public/game/data/map.json (written by scripts/game/build-map.mjs). */

export interface Rect {
  minX: number
  maxX: number
  minZ: number
  maxZ: number
}

export type LandmarkId =
  | "nubianVillage"
  | "nilometer"
  | "khnumTemple"
  | "oldCataract"
  | "firstCataract"
  | "agaKhan"
  | "botanicalGarden"
  | "tombsNobles"
  | "corniche"

export interface MapLandmark {
  id: LandmarkId
  model: string | null
  site: { x: number; y: number; z: number }
  faceYaw: number
  anchor: { x: number; z: number }
  discoverRadius: number
  nest: { x: number; z: number; r: number } | null
}

export interface MapBoat {
  kind: "cruise" | "felucca"
  x: number
  z: number
  yaw: number
  len: number
  radius: number
}

export type PropKind =
  | "house"
  | "block"
  | "tower"
  | "palm"
  | "tree"
  | "rock"
  | "camel"
  | "reeds"
  | "railing"
  | "lamp"
  | "bench"

/** [x, y, z, yaw, scale, variant] */
export type PropPlacement = [number, number, number, number, number, number]
/** [x, z, radius, variant, yaw] */
export type WaterRock = [number, number, number, number, number]

export interface GameMap {
  version: number
  attribution: string
  scale: number
  play: Rect
  world: Rect
  sdf: { url: string; minX: number; minZ: number; cell: number; nx: number; nz: number; unit: number }
  start: { x: number; z: number; heading: number }
  landmarks: MapLandmark[]
  waterRocks: WaterRock[]
  boats: MapBoat[]
  routes: { points: [number, number][]; length: number }[]
  props: Record<PropKind, PropPlacement[]>
}
