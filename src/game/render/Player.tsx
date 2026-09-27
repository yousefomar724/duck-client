"use client"

import { useGLTF } from "@react-three/drei"
import { useFrame } from "@react-three/fiber"
import { useEffect, useMemo, useRef } from "react"
import {
  AnimationMixer,
  CanvasTexture,
  type Group,
  type Mesh,
  MeshBasicMaterial,
  type Object3D,
  PlaneGeometry,
  Vector3,
} from "three"
import { TUNING } from "../core/tuning"
import type { Pose } from "../runtime/runtime"
import { MODEL_URLS } from "./assets"
import { useGame } from "./context"
import { fx } from "./fxBus"

/** Soft round shadow for things sitting on the water. */
let blobTex: CanvasTexture | null = null
export function blobShadowMaterial(opacity = 0.35) {
  if (!blobTex && typeof document !== "undefined") {
    const c = document.createElement("canvas")
    c.width = c.height = 64
    const g = c.getContext("2d")!
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32)
    grad.addColorStop(0, "rgba(0,0,0,1)")
    grad.addColorStop(1, "rgba(0,0,0,0)")
    g.fillStyle = grad
    g.fillRect(0, 0, 64, 64)
    blobTex = new CanvasTexture(c)
  }
  return new MeshBasicMaterial({ map: blobTex, transparent: true, opacity, depthWrite: false })
}

/** Paddle clip layout (see scripts/game/blender/build_player.py). */
const PADDLE_CLIP = { leftStart: 0, rightStart: 0.5, strokeLength: 0.5 }
const BLADE_REACH = 1.27

/**
 * The kayak and the rigged kayaker from player.glb. The Paddle clip is
 * scrubbed by the sim's stroke phase, so the blade is always where the
 * physics says the stroke is; between strokes the rig eases into Idle.
 */
export function Player() {
  const { runtime, frame } = useGame()
  const gltf = useGLTF(MODEL_URLS.player)
  const root = useRef<Group>(null)
  const hull = useRef<Group>(null)
  const pose = useMemo<Pose>(() => ({ x: 0, z: 0, heading: 0 }), [])
  const shadowGeo = useMemo(() => {
    const g = new PlaneGeometry(1.7, 4.8)
    g.rotateX(-Math.PI / 2)
    return g
  }, [])
  const shadowMat = useMemo(() => blobShadowMaterial(0.3), [])

  const { mixer, paddle, idle, paddleBone } = useMemo(() => {
    const m = new AnimationMixer(gltf.scene)
    const clip = (name: string) => gltf.animations.find((a) => a.name === name)
    const p = m.clipAction(clip("Paddle")!)
    const i = m.clipAction(clip("Idle")!)
    for (const a of [p, i]) {
      a.play()
      a.paused = true
    }
    p.setEffectiveWeight(0)
    i.setEffectiveWeight(1)
    let bone: Object3D | null = null
    gltf.scene.traverse((o) => {
      if (o.name === "paddle") bone = o
      const mesh = o as Mesh
      if (mesh.isMesh) {
        mesh.castShadow = true
        mesh.frustumCulled = false // skinned bounds don't follow the rig
      }
    })
    return { mixer: m, paddle: p, idle: i, paddleBone: bone as Object3D | null }
  }, [gltf])

  useEffect(() => () => void mixer.stopAllAction(), [mixer])

  const blend = useRef(0) // 0 = idle, 1 = paddling
  const idleTime = useRef(0)
  const splashed = useRef<{ tick: number; side: number }>({ tick: -99, side: 0 })
  const tipA = useMemo(() => new Vector3(), [])
  const tipB = useMemo(() => new Vector3(), [])

  useFrame((_, delta) => {
    if (!root.current || !hull.current) return
    const dt = Math.min(delta, 0.05)
    runtime.pose(pose)
    const k = runtime.sim.state.kayak
    const t = frame.clock
    root.current.position.set(pose.x, 0, pose.z)
    root.current.rotation.y = pose.heading

    // Bob with the ripples, lean into turns, pitch a touch on each stroke.
    const stroke = k.stroke
    const phase = stroke ? Math.min(1, stroke.t / TUNING.kayak.strokeTime) : 0
    hull.current.position.y = Math.sin(t * 2.1) * 0.03 - 0.02
    hull.current.rotation.z = -k.omega * 0.1 + Math.sin(t * 1.3) * 0.015 + (stroke ? stroke.side * 0.03 * Math.sin(Math.PI * phase) : 0)
    hull.current.rotation.x = stroke ? -Math.sin(Math.PI * phase) * 0.025 : Math.sin(t * 1.7) * 0.01

    // Drive the rig from the sim.
    if (stroke) {
      paddle.time = (stroke.side < 0 ? PADDLE_CLIP.leftStart : PADDLE_CLIP.rightStart) + phase * PADDLE_CLIP.strokeLength
    }
    const target = stroke ? 1 : 0
    blend.current += (target - blend.current) * (1 - Math.exp(-dt * (stroke ? 18 : 5)))
    paddle.setEffectiveWeight(blend.current)
    idle.setEffectiveWeight(1 - blend.current)
    idleTime.current = (idleTime.current + dt) % idle.getClip().duration
    idle.time = idleTime.current
    mixer.update(0)

    // Splash where the working blade catches the water.
    if (stroke && paddleBone && phase > 0.1 && phase < 0.8) {
      const tick = runtime.sim.state.tick
      if (splashed.current.side !== stroke.side || tick - splashed.current.tick > 24) {
        splashed.current = { tick, side: stroke.side }
        paddleBone.updateWorldMatrix(true, false)
        paddleBone.localToWorld(tipA.set(BLADE_REACH, 0, 0))
        paddleBone.localToWorld(tipB.set(-BLADE_REACH, 0, 0))
        const tip = tipA.y < tipB.y ? tipA : tipB
        fx.emit({ type: "splash", x: tip.x, z: tip.z, amount: 8 })
      }
    }
    if (!stroke) splashed.current.side = 0
  })

  return (
    // A touch larger than life so the paddler reads clearly on a phone.
    <group ref={root} scale={1.15}>
      <mesh geometry={shadowGeo} material={shadowMat} position={[0, 0.03, 0]} renderOrder={1} />
      <group ref={hull}>
        <primitive object={gltf.scene} />
      </group>
    </group>
  )
}
