"use client"

import { useFrame } from "@react-three/fiber"
import { useMemo } from "react"
import {
  AdditiveBlending,
  Color,
  CylinderGeometry,
  DynamicDrawUsage,
  InstancedMesh,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  RingGeometry,
} from "three"
import { propMaterial, usePropGeometries } from "./assets"
import { useGame } from "./context"

const MAX = 64
const DUCK_SCALE = 1.25
const WHITE = new Color(1, 1, 1)
const GOLD = new Color(1.25, 0.85, 0.25)

/** Free ducklings bobbing on the river, the line following the kayak, and their markers. */
export function Ducklings() {
  const { runtime, frame } = useGame()
  const geos = usePropGeometries()

  const { ducks, rings, beacon } = useMemo(() => {
    const d = new InstancedMesh(geos.duckling, propMaterial("glossy"), MAX)
    d.castShadow = true
    d.instanceMatrix.setUsage(DynamicDrawUsage)
    d.frustumCulled = false
    const ringGeo = new RingGeometry(1.5, 1.9, 24)
    ringGeo.rotateX(-Math.PI / 2)
    const r = new InstancedMesh(
      ringGeo,
      new MeshBasicMaterial({ color: "#fff3a0", transparent: true, opacity: 0.55, blending: AdditiveBlending, depthWrite: false, toneMapped: false }),
      MAX,
    )
    r.frustumCulled = false
    r.renderOrder = 2
    // A tall shaft of light marks the golden duckling across the river.
    const beamGeo = new CylinderGeometry(0.9, 1.6, 60, 12, 1, true)
    beamGeo.translate(0, 30, 0)
    const b = new Mesh(
      beamGeo,
      new MeshBasicMaterial({ color: "#ffd23a", transparent: true, opacity: 0.28, blending: AdditiveBlending, depthWrite: false, toneMapped: false }),
    )
    b.visible = false
    return { ducks: d, rings: r, beacon: b }
  }, [geos.duckling])

  const dummy = useMemo(() => new Object3D(), [])

  useFrame(() => {
    const { free, trail, time } = runtime.sim.state
    const t = frame.clock
    let n = 0
    let golden: { x: number; z: number } | null = null
    for (const d of free) {
      if (n >= MAX) break
      const bob = Math.sin(t * 2.4 + d.phase) * 0.08
      dummy.position.set(d.x, bob + 0.02, d.z)
      dummy.rotation.set(Math.sin(t * 1.7 + d.phase) * 0.08, d.phase + t * 0.35, 0)
      dummy.scale.setScalar(DUCK_SCALE * (d.golden ? 1.25 : 1))
      dummy.updateMatrix()
      ducks.setMatrixAt(n, dummy.matrix)
      ducks.setColorAt(n, d.golden ? GOLD : WHITE)
      // Pulsing ring; blinks while a just-scattered duckling can't be regrabbed.
      const grabbable = time >= d.grabAfter
      const pulse = 1 + Math.sin(t * 3 + d.phase) * 0.12
      dummy.position.y = 0.06
      dummy.rotation.set(0, 0, 0)
      dummy.scale.setScalar((d.golden ? 1.6 : 1) * pulse * (grabbable ? 1 : 0.6 + 0.4 * Math.abs(Math.sin(t * 10))))
      dummy.updateMatrix()
      rings.setMatrixAt(n, dummy.matrix)
      if (d.golden) golden = d
      n++
    }
    rings.count = n
    for (let i = 0; i < trail.length && n < MAX; i++) {
      const d = trail[i]
      const bob = Math.sin(t * 3 - i * 0.6) * 0.06
      dummy.position.set(d.x, bob + 0.02, d.z)
      dummy.rotation.set(0, d.heading, Math.sin(t * 4 - i) * 0.06)
      dummy.scale.setScalar(DUCK_SCALE * (d.golden ? 1.05 : 0.78))
      dummy.updateMatrix()
      ducks.setMatrixAt(n, dummy.matrix)
      ducks.setColorAt(n, d.golden ? GOLD : WHITE)
      n++
    }
    ducks.count = n
    ducks.instanceMatrix.needsUpdate = true
    if (ducks.instanceColor) ducks.instanceColor.needsUpdate = true
    rings.instanceMatrix.needsUpdate = true

    beacon.visible = golden !== null
    if (golden) {
      beacon.position.set(golden.x, 0, golden.z)
      ;(beacon.material as MeshBasicMaterial).opacity = 0.2 + Math.sin(t * 4) * 0.08
    }
  })

  return (
    <>
      <primitive object={ducks} />
      <primitive object={rings} />
      <primitive object={beacon} />
    </>
  )
}

/** Light pillars over the nests — brighter while you're carrying ducklings. */
export function NestBeacons() {
  const { runtime, frame } = useGame()
  const nests = useMemo(() => runtime.data.map.landmarks.filter((l) => l.nest), [runtime.data.map])
  const { mesh, material } = useMemo(() => {
    const geo = new CylinderGeometry(2.2, 3.2, 70, 16, 1, true)
    geo.translate(0, 35, 0)
    const mat = new MeshBasicMaterial({ color: "#f5e847", transparent: true, opacity: 0.12, blending: AdditiveBlending, depthWrite: false, toneMapped: false })
    const m = new InstancedMesh(geo, mat, nests.length)
    const o = new Object3D()
    nests.forEach((l, i) => {
      o.position.set(l.nest!.x, 0, l.nest!.z)
      o.updateMatrix()
      m.setMatrixAt(i, o.matrix)
    })
    m.frustumCulled = false
    m.renderOrder = 3
    return { mesh: m, material: mat }
  }, [nests])

  useFrame(() => {
    const carrying = runtime.sim.state.trail.length > 0
    const target = carrying ? 0.24 + Math.sin(frame.clock * 3) * 0.06 : 0.08
    material.opacity += (target - material.opacity) * 0.1
  })
  return <primitive object={mesh} />
}

/** Feluccas and water taxis sailing their lanes. */
export function Boats() {
  const { runtime, frame } = useGame()
  const geos = usePropGeometries()
  const boats = runtime.sim.state.boats
  const meshes = useMemo(
    () =>
      boats.map((b) => {
        const m = new Mesh(b.kind === "felucca" ? geos.felucca : geos.motorboat, propMaterial("satin"))
        m.castShadow = true
        return m
      }),
    // The set of boats is fixed per map; restarts reuse the same lanes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [geos, boats.length],
  )

  useFrame(() => {
    const t = frame.clock
    const state = runtime.sim.state.boats
    meshes.forEach((m, i) => {
      const b = state[i]
      if (!b) return
      m.position.set(b.x, Math.sin(t * 1.4 + i) * 0.06, b.z)
      // Feluccas heel a little in the breeze.
      m.rotation.set(Math.sin(t * 0.9 + i) * 0.02, b.heading, b.kind === "felucca" ? 0.06 + Math.sin(t * 0.7 + i) * 0.03 : Math.sin(t * 1.1 + i) * 0.015)
    })
  })

  return (
    <>
      {meshes.map((m, i) => (
        <primitive key={i} object={m} />
      ))}
    </>
  )
}

