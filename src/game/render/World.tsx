"use client"

import { useGLTF } from "@react-three/drei"
import { useFrame } from "@react-three/fiber"
import { useLayoutEffect, useMemo } from "react"
import { InstancedMesh, type Mesh, Object3D, Vector3 } from "three"
import type { GameMap, PropKind, PropPlacement } from "../core/types"
import { MODEL_URLS, partsOf, propMaterial, terrainMaterial, usePropParts, type PropParts } from "./assets"
import { useGame } from "./context"

/** Terrain, landmarks and horizon from world.glb. */
function Landscape() {
  const gltf = useGLTF(MODEL_URLS.world)
  useLayoutEffect(() => {
    gltf.scene.traverse((o) => {
      const mesh = o as Mesh
      if (!mesh.isMesh) return
      const landmark = mesh.name === "landmarks"
      mesh.material = landmark ? propMaterial() : terrainMaterial()
      mesh.receiveShadow = mesh.name !== "horizon"
      mesh.castShadow = landmark
      mesh.matrixAutoUpdate = false
      mesh.updateMatrix()
    })
  }, [gltf])
  return <primitive object={gltf.scene} />
}

interface Placement {
  x: number
  y: number
  z: number
  yaw: number
  scale: number
}

/**
 * Instances are grouped by model *and* by a coarse spatial chunk, so each
 * chunk gets its own bounding sphere and three.js frustum-culls whatever is
 * behind or beside the camera instead of drawing the whole island every frame.
 */
const CHUNK = 150

function placementsFor(map: GameMap): Map<string, Placement[]> {
  const groups = new Map<string, Placement[]>()
  const add = (model: string, x: number, y: number, z: number, yaw: number, scale: number) => {
    let list = groups.get(model)
    if (!list) groups.set(model, (list = []))
    list.push({ x, y, z, yaw, scale })
  }
  const naming: Record<PropKind, (v: number) => string> = {
    house: (v) => `house_${v}`,
    block: (v) => `block_${v}`,
    tower: () => "tower",
    palm: (v) => `palm_${v}`,
    tree: (v) => `tree_${v}`,
    rock: (v) => `rock_${v}`,
    camel: () => "camel",
    reeds: () => "reeds",
    railing: () => "railing",
    lamp: () => "lamp",
    bench: () => "bench",
  }
  for (const [kind, list] of Object.entries(map.props) as [PropKind, PropPlacement[]][]) {
    const name = naming[kind]
    if (!name) continue
    // Sink a touch so decimated terrain never leaves props floating.
    const sink = kind === "railing" || kind === "lamp" || kind === "bench" ? 0.05 : 0.25
    for (const [x, y, z, yaw, scale, variant] of list) add(name(variant), x, y - sink, z, yaw, scale)
  }
  // Granite boulders in the river: the rock mesh is ~2.4 units across per unit scale.
  for (const [x, z, r, variant, yaw] of map.waterRocks) add(`rock_${variant % 6}`, x, -0.3, z, yaw, r / 1.15)
  // Moored boats; alternate feluccas with water taxis along the banks.
  map.boats.forEach((b, i) => {
    const model = b.kind === "cruise" ? "cruise" : i % 2 ? "motorboat" : "felucca"
    add(model, b.x, 0, b.z, b.yaw, 1)
  })
  for (const lm of map.landmarks) if (lm.nest) add("nest", lm.nest.x, 0.05, lm.nest.z, lm.faceYaw, 1)
  return groups
}

/** "near" parts swap to their "~lod" twin ("far") beyond LOD_DISTANCE. */
type Band = "always" | "near" | "far"
const LOD_DISTANCE = 140

interface Batch {
  key: string
  part: string
  items: Placement[]
  band: Band
}

function batchesFor(map: GameMap, parts: PropParts): Batch[] {
  const out: Batch[] = []
  for (const [model, items] of placementsFor(map)) {
    const chunks = new Map<string, Placement[]>()
    for (const p of items) {
      const k = `${Math.floor(p.x / CHUNK)},${Math.floor(p.z / CHUNK)}`
      let c = chunks.get(k)
      if (!c) chunks.set(k, (c = []))
      c.push(p)
    }
    const lod = parts[`${model}~lod`] ? `${model}~lod` : null
    for (const part of partsOf(parts, model)) {
      const band: Band = lod && part === model ? "near" : "always"
      for (const [k, list] of chunks) out.push({ key: `${part}@${k}`, part, items: list, band })
    }
    if (lod) for (const [k, list] of chunks) out.push({ key: `${lod}@${k}`, part: lod, items: list, band: "far" })
  }
  return out
}

const NO_SHADOW = new Set(["reeds", "railing", "bench"])

/**
 * Beyond these distances a chunk of small props isn't drawn at all — the fog
 * has already swallowed it, and it saves hundreds of thousands of triangles.
 */
const DRAW_DISTANCE: Record<string, number> = {
  reeds: 150,
  bench: 160,
  railing: 220,
  lamp: 220,
  rock: 280,
  tree: 360,
  palm: 420,
  camel: 250,
  house: 480,
  block: 520,
}
const baseName = (part: string) => part.split(/__|~/)[0]
const drawDistance = (part: string) => DRAW_DISTANCE[baseName(part).replace(/_\d+$/, "")] ?? Infinity

function InstancedBatch({ batch, parts, onMesh }: { batch: Batch; parts: PropParts; onMesh: (m: InstancedMesh) => void }) {
  const part = parts[batch.part]
  const mesh = useMemo(() => {
    if (!part) return null
    const m = new InstancedMesh(part.geometry, part.material, batch.items.length)
    const o = new Object3D()
    batch.items.forEach((t, i) => {
      o.position.set(t.x, t.y, t.z)
      o.rotation.set(0, t.yaw, 0)
      o.scale.setScalar(t.scale)
      o.updateMatrix()
      m.setMatrixAt(i, o.matrix)
    })
    m.instanceMatrix.needsUpdate = true
    m.computeBoundingSphere()
    m.matrixAutoUpdate = false
    m.castShadow = !NO_SHADOW.has(baseName(batch.part))
    m.receiveShadow = true
    return m
  }, [batch, part])
  useLayoutEffect(() => {
    if (mesh) onMesh(mesh)
  }, [mesh, onMesh])
  if (!mesh) return null
  return <primitive object={mesh} />
}

/** Everything that never moves. */
export function World() {
  const { runtime } = useGame()
  const parts = usePropParts()
  const batches = useMemo(() => batchesFor(runtime.data.map, parts), [runtime.data.map, parts])
  const culling = useMemo(
    () =>
      batches.map((b) => {
        const c = new Vector3()
        for (const p of b.items) c.add(new Vector3(p.x, p.y, p.z))
        c.divideScalar(b.items.length)
        return { key: b.key, centre: c, band: b.band, limit: drawDistance(b.part) + CHUNK * 0.75 }
      }),
    [batches],
  )
  const meshes = useMemo(() => new Map<string, InstancedMesh>(), [])

  useFrame(({ camera }) => {
    for (const c of culling) {
      const m = meshes.get(c.key)
      if (!m) continue
      const d = camera.position.distanceTo(c.centre)
      const swap = LOD_DISTANCE + CHUNK * 0.5
      m.visible = d < c.limit && (c.band === "always" || (c.band === "near" ? d < swap : d >= swap))
    }
  })

  return (
    <>
      <Landscape />
      {batches.map((b) => (
        <InstancedBatch key={b.key} batch={b} parts={parts} onMesh={(m) => meshes.set(b.key, m)} />
      ))}
    </>
  )
}
