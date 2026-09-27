"use client"

import { useEffect, useRef } from "react"
import type { GameRuntime } from "../runtime/runtime"

const W = 104
const H = 128

/** North-up map of the tour area: nests, landmarks, ducklings and you. */
export function Minimap({ runtime }: { runtime: GameRuntime }) {
  const canvas = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const el = canvas.current
    if (!el) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    el.width = W * dpr
    el.height = H * dpr
    const g = el.getContext("2d")
    if (!g) return
    const { map, shore } = runtime.data
    const { play } = map
    const sx = W / (play.maxX - play.minX)
    const sz = H / (play.maxZ - play.minZ)
    const s = Math.min(sx, sz)
    const ox = (W - (play.maxX - play.minX) * s) / 2
    const oz = (H - (play.maxZ - play.minZ) * s) / 2
    const toX = (x: number) => (ox + (x - play.minX) * s) * dpr
    const toY = (z: number) => (oz + (z - play.minZ) * s) * dpr

    // Pre-render land/water once.
    const base = document.createElement("canvas")
    base.width = el.width
    base.height = el.height
    const bg = base.getContext("2d")!
    const img = bg.createImageData(base.width, base.height)
    for (let py = 0; py < base.height; py++) {
      for (let px = 0; px < base.width; px++) {
        const x = play.minX + (px / dpr - ox) / s
        const z = play.minZ + (py / dpr - oz) / s
        const d = shore.sample(x, z)
        const i = (py * base.width + px) * 4
        if (d < 0) {
          const shallow = Math.min(1, -d / 12)
          img.data[i] = 40 - shallow * 14
          img.data[i + 1] = 130 - shallow * 30
          img.data[i + 2] = 160 - shallow * 20
        } else {
          img.data[i] = 222
          img.data[i + 1] = 196
          img.data[i + 2] = 150
        }
        img.data[i + 3] = 235
      }
    }
    bg.putImageData(img, 0, 0)

    let raf = 0
    let last = 0
    const draw = (now: number) => {
      raf = requestAnimationFrame(draw)
      if (now - last < 120) return
      last = now
      const st = runtime.sim.state
      g.clearRect(0, 0, el.width, el.height)
      g.drawImage(base, 0, 0)
      const r = dpr
      for (const lm of map.landmarks) {
        const found = st.discovered.includes(lm.id)
        g.beginPath()
        g.arc(toX(lm.anchor.x), toY(lm.anchor.z), 2.6 * r, 0, Math.PI * 2)
        g.strokeStyle = found ? "#067ba1" : "rgba(255,255,255,0.9)"
        g.lineWidth = 1.2 * r
        g.stroke()
        if (found) {
          g.fillStyle = "#067ba1"
          g.fill()
        }
      }
      const carrying = st.trail.length > 0
      for (const lm of map.landmarks) {
        if (!lm.nest) continue
        g.beginPath()
        g.arc(toX(lm.nest.x), toY(lm.nest.z), (carrying ? 4 + Math.sin(now / 150) : 3.2) * r, 0, Math.PI * 2)
        g.fillStyle = "#f5e847"
        g.fill()
        g.strokeStyle = "#121528"
        g.lineWidth = 1 * r
        g.stroke()
      }
      for (const d of st.free) {
        g.beginPath()
        g.arc(toX(d.x), toY(d.z), (d.golden ? 3 : 1.6) * r, 0, Math.PI * 2)
        g.fillStyle = d.golden ? "#ffb300" : "#fff59a"
        g.fill()
      }
      // You: an arrow along the heading.
      const k = st.kayak
      const kx = toX(k.x)
      const ky = toY(k.z)
      const fx = Math.sin(k.heading)
      const fz = Math.cos(k.heading)
      g.beginPath()
      g.moveTo(kx + fx * 6 * r, ky + fz * 6 * r)
      g.lineTo(kx - fx * 4 * r - fz * 3.5 * r, ky - fz * 4 * r + fx * 3.5 * r)
      g.lineTo(kx - fx * 4 * r + fz * 3.5 * r, ky - fz * 4 * r - fx * 3.5 * r)
      g.closePath()
      g.fillStyle = "#ff5a36"
      g.fill()
      g.strokeStyle = "#fff"
      g.lineWidth = 1 * r
      g.stroke()
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [runtime])

  return (
    <canvas
      ref={canvas}
      style={{ width: W, height: H }}
      className="rounded-xl border-2 border-white/70 shadow-lg"
      aria-hidden
    />
  )
}
