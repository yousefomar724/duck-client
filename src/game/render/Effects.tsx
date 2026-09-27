"use client"

import { useFrame } from "@react-three/fiber"
import { useEffect, useMemo, useRef } from "react"
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  DynamicDrawUsage,
  IcosahedronGeometry,
  InstancedMesh,
  MeshBasicMaterial,
  Object3D,
} from "three"
import { useGame } from "./context"
import { fx, type FxEvent } from "./fxBus"

const MAX = 220
const PALETTE = {
  water: new Color("#f2f7f7"),
  gold: new Color("#ffd23a"),
  duck: new Color("#f5e847"),
  confetti: ["#f5e847", "#067ba1", "#e23b3b", "#3fae5a", "#ffffff", "#f28a2e"].map((c) => new Color(c)),
}

interface Particle {
  alive: boolean
  x: number
  y: number
  z: number
  vx: number
  vy: number
  vz: number
  life: number
  max: number
  size: number
  gravity: number
  color: Color
}

/** Pooled particle bursts + the kayak's wake ribbon. */
export function Effects() {
  const { runtime, frame } = useGame()
  const particles = useMemo<Particle[]>(
    () =>
      Array.from({ length: MAX }, () => ({
        alive: false,
        x: 0,
        y: 0,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0,
        max: 1,
        size: 1,
        gravity: 9,
        color: PALETTE.water,
      })),
    [],
  )
  const cursor = useRef(0)
  const mesh = useMemo(() => {
    const m = new InstancedMesh(new IcosahedronGeometry(0.12, 0), new MeshBasicMaterial({ toneMapped: false }), MAX)
    m.instanceMatrix.setUsage(DynamicDrawUsage)
    m.frustumCulled = false
    m.count = 0
    return m
  }, [])

  useEffect(() => {
    const rand = (a: number, b: number) => a + Math.random() * (b - a)
    const spawn = (p: Omit<Particle, "alive" | "life">) => {
      const slot = particles[cursor.current]
      cursor.current = (cursor.current + 1) % MAX
      Object.assign(slot, p, { alive: true, life: 0 })
    }
    return fx.on((e: FxEvent) => {
      if (e.type === "splash" || e.type === "spray") {
        const n = e.type === "spray" ? 16 : e.amount
        for (let i = 0; i < n; i++) {
          const a = rand(0, Math.PI * 2)
          const s = rand(0.6, e.type === "spray" ? 4 : 2.2)
          spawn({ x: e.x, y: 0.1, z: e.z, vx: Math.cos(a) * s, vy: rand(1.5, e.type === "spray" ? 5 : 3.5), vz: Math.sin(a) * s, max: rand(0.45, 0.8), size: rand(0.7, 1.3), gravity: 9, color: PALETTE.water })
        }
      } else if (e.type === "sparkle") {
        for (let i = 0; i < (e.golden ? 26 : 12); i++) {
          const a = rand(0, Math.PI * 2)
          const s = rand(1, 3)
          spawn({ x: e.x, y: 0.6, z: e.z, vx: Math.cos(a) * s, vy: rand(2, 5), vz: Math.sin(a) * s, max: rand(0.5, 0.9), size: rand(0.8, 1.4), gravity: 5, color: e.golden ? PALETTE.gold : PALETTE.duck })
        }
      } else if (e.type === "confetti") {
        for (let i = 0; i < 70; i++) {
          const a = rand(0, Math.PI * 2)
          const s = rand(1, 5)
          spawn({ x: e.x, y: 1, z: e.z, vx: Math.cos(a) * s, vy: rand(6, 12), vz: Math.sin(a) * s, max: rand(1.2, 2), size: rand(1, 1.8), gravity: 7, color: PALETTE.confetti[i % PALETTE.confetti.length] })
        }
      }
    })
  }, [particles])

  const dummy = useMemo(() => new Object3D(), [])
  const tmpColor = useMemo(() => new Color(), [])
  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05)
    let n = 0
    for (const p of particles) {
      if (!p.alive) continue
      p.life += dt
      if (p.life >= p.max) {
        p.alive = false
        continue
      }
      p.vy -= p.gravity * dt
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.z += p.vz * dt
      if (p.y < 0) {
        p.y = 0
        p.vy *= -0.2
        p.vx *= 0.6
        p.vz *= 0.6
      }
      const fade = 1 - p.life / p.max
      dummy.position.set(p.x, p.y, p.z)
      dummy.scale.setScalar(p.size * (0.4 + 0.6 * fade))
      dummy.updateMatrix()
      mesh.setMatrixAt(n, dummy.matrix)
      mesh.setColorAt(n, tmpColor.copy(p.color))
      n++
    }
    mesh.count = n
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  })

  return (
    <>
      <primitive object={mesh} />
      <Wake runtime={runtime} clock={() => frame.clock} />
    </>
  )
}

/** Foam ribbon trailing the kayak, fading with age. */
function Wake({ runtime, clock }: { runtime: ReturnType<typeof useGame>["runtime"]; clock: () => number }) {
  const SEG = 40
  const history = useRef<{ x: number; z: number; t: number; speed: number }[]>([])
  const { geometry, material } = useMemo(() => {
    const g = new BufferGeometry()
    const pos = new Float32Array(SEG * 2 * 3)
    const alpha = new Float32Array(SEG * 2)
    const idx: number[] = []
    for (let i = 0; i < SEG - 1; i++) {
      const a = i * 2
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
    }
    g.setAttribute("position", new BufferAttribute(pos, 3).setUsage(DynamicDrawUsage))
    g.setAttribute("alpha", new BufferAttribute(alpha, 1).setUsage(DynamicDrawUsage))
    g.setIndex(idx)
    const m = new MeshBasicMaterial({ color: "#ffffff", transparent: true, depthWrite: false, blending: AdditiveBlending, opacity: 0.16 })
    m.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader
        .replace("void main() {", "attribute float alpha;\nvarying float vAlpha;\nvoid main() {\n  vAlpha = alpha;")
      shader.fragmentShader = shader.fragmentShader
        .replace("void main() {", "varying float vAlpha;\nvoid main() {")
        .replace("vec4 diffuseColor = vec4( diffuse, opacity );", "vec4 diffuseColor = vec4( diffuse, opacity * vAlpha );")
    }
    return { geometry: g, material: m }
  }, [])

  useFrame(() => {
    const k = runtime.sim.state.kayak
    const h = history.current
    const now = clock()
    const speed = Math.hypot(k.vx, k.vz)
    const last = h[0]
    if (!last || Math.hypot(last.x - k.x, last.z - k.z) > 0.6) {
      h.unshift({ x: k.x - Math.sin(k.heading) * 1.6, z: k.z - Math.cos(k.heading) * 1.6, t: now, speed })
      if (h.length > SEG) h.length = SEG
    }
    const pos = geometry.getAttribute("position") as BufferAttribute
    const alpha = geometry.getAttribute("alpha") as BufferAttribute
    for (let i = 0; i < SEG; i++) {
      const p = h[Math.min(i, h.length - 1)]
      const q = h[Math.min(i + 1, h.length - 1)]
      if (!p || !q) continue
      const dx = p.x - q.x
      const dz = p.z - q.z
      const len = Math.hypot(dx, dz) || 1
      const age = now - p.t
      // Two thin foam lines spreading out behind the stern.
      const w = 0.3 + i * 0.06
      const nx = (-dz / len) * w
      const nz = (dx / len) * w
      pos.setXYZ(i * 2, p.x + nx, 0.04, p.z + nz)
      pos.setXYZ(i * 2 + 1, p.x - nx, 0.04, p.z - nz)
      const a = Math.max(0, 1 - age / 2.2) * Math.min(1, p.speed / 5) * (1 - i / SEG) * Math.min(1, i / 3)
      alpha.setX(i * 2, a)
      alpha.setX(i * 2 + 1, a)
    }
    pos.needsUpdate = true
    alpha.needsUpdate = true
    geometry.computeBoundingSphere()
  })

  return <mesh geometry={geometry} material={material} frustumCulled={false} renderOrder={2} />
}
