"use client"

import { useFrame, useThree } from "@react-three/fiber"
import { useMemo, useRef } from "react"
import { PerspectiveCamera, Vector3 } from "three"
import type { Pose } from "../runtime/runtime"
import { useGameUI } from "../ui/store"
import { useGame } from "./context"

/**
 * Chase camera behind the kayak during play; a slow orbit over Elephantine
 * on the title screen. Portrait screens get a higher, wider view so the
 * river ahead stays visible on phones.
 */
export function CameraRig() {
  const { runtime, frame } = useGame()
  const camera = useThree((s) => s.camera) as PerspectiveCamera
  const size = useThree((s) => s.size)
  const pose = useMemo<Pose>(() => ({ x: 0, z: 0, heading: 0 }), [])
  const yaw = useRef<number | null>(null)
  const pos = useMemo(() => new Vector3(), [])
  const look = useMemo(() => new Vector3(), [])
  const target = useMemo(() => new Vector3(), [])
  const lookTarget = useMemo(() => new Vector3(), [])
  const intro = useRef(0)

  useFrame((_, delta) => {
    const phase = useGameUI.getState().phase
    const dt = Math.min(delta, 0.05)
    const portrait = size.height > size.width
    const map = runtime.data.map
    const eleph = map.landmarks.find((l) => l.id === "nubianVillage")!.site

    if (phase === "title" || phase === "loading") {
      intro.current = 0
      const a = frame.clock * 0.05
      const r = portrait ? 260 : 220
      target.set(eleph.x + Math.cos(a) * r, portrait ? 120 : 85, eleph.z + Math.sin(a) * r)
      lookTarget.set(eleph.x, 0, eleph.z - 40)
      camera.fov = portrait ? 62 : 48
      yaw.current = null
    } else {
      runtime.pose(pose)
      if (yaw.current === null) yaw.current = pose.heading
      // Follow the heading with a little lag, so turns read on screen.
      let dy = pose.heading - yaw.current
      dy = Math.atan2(Math.sin(dy), Math.cos(dy))
      yaw.current += dy * (1 - Math.exp(-dt * 2.8))
      const back = portrait ? 14 : 11
      const up = portrait ? 9.5 : 6
      const ahead = portrait ? 9 : 7
      const fx = Math.sin(yaw.current)
      const fz = Math.cos(yaw.current)
      target.set(pose.x - fx * back, up, pose.z - fz * back)
      lookTarget.set(pose.x + fx * ahead, 0.8, pose.z + fz * ahead)
      camera.fov = portrait ? 66 : 52
      intro.current = Math.min(1, intro.current + dt * 0.8)
    }

    // Swoop in from the title orbit, then track tightly.
    const rate = phase === "playing" || phase === "paused" || phase === "over" ? (intro.current < 1 ? 1.8 : 6) : 1.2
    const k = 1 - Math.exp(-dt * rate)
    if (pos.lengthSq() === 0) {
      pos.copy(target)
      look.copy(lookTarget)
    }
    pos.lerp(target, k)
    look.lerp(lookTarget, 1 - Math.exp(-dt * rate * 1.3))

    camera.position.copy(pos)
    if (frame.shake > 0.001) {
      camera.position.x += (Math.random() - 0.5) * frame.shake
      camera.position.y += (Math.random() - 0.5) * frame.shake
      frame.shake *= Math.exp(-dt * 8)
    }
    camera.lookAt(look)
    camera.updateProjectionMatrix()
    frame.cameraYaw = Math.atan2(look.x - pos.x, look.z - pos.z)
    runtime.input.cameraYaw = frame.cameraYaw
  })
  return null
}
