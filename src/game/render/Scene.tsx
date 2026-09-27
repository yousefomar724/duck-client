"use client"

import { PerformanceMonitor } from "@react-three/drei"
import { Canvas, useFrame } from "@react-three/fiber"
import { Suspense, useRef, useState } from "react"
import { TUNING } from "../core/tuning"
import { linePoints, lineMultiplier } from "../core/sim"
import { useGameUI } from "../ui/store"
import { Atmosphere } from "./Atmosphere"
import { CameraRig } from "./CameraRig"
import { GameContext, type GameContextValue, useGame } from "./context"
import { Boats, Ducklings, NestBeacons } from "./Ducklings"
import { Effects } from "./Effects"
import { Player } from "./Player"
import { Water } from "./Water"
import { World } from "./World"

/** Drives the fixed-step sim, the sunset clock, and throttled HUD updates. */
function GameLoop() {
  const { runtime, frame } = useGame()
  const lastHud = useRef(0)
  useFrame((_, delta) => {
    frame.clock += Math.min(delta, 0.1)
    const { phase, setHud } = useGameUI.getState()
    runtime.running = phase === "playing"
    runtime.update(delta)
    const s = runtime.sim.state
    frame.u = phase === "title" || phase === "loading" ? 0.45 : s.time / TUNING.duration
    if (phase === "playing" && frame.clock - lastHud.current > 0.1) {
      lastHud.current = frame.clock
      setHud({
        score: s.score,
        timeLeft: Math.max(0, TUNING.duration - s.time),
        trail: s.trail.length,
        linePoints: linePoints(s.trail),
        multiplier: lineMultiplier(s.trail.length),
        landmarks: s.discovered.length,
      })
    }
  })
  return null
}

function SceneContents() {
  return (
    <>
      <GameLoop />
      <Atmosphere />
      <Water />
      <World />
      <NestBeacons />
      <Boats />
      <Ducklings />
      <Player />
      <Effects />
      <CameraRig />
    </>
  )
}

export function GameScene({ value, onReady }: { value: GameContextValue; onReady: () => void }) {
  // Start sharp; step down if the device struggles.
  const maxDpr = typeof window === "undefined" ? 1.5 : Math.min(window.devicePixelRatio || 1, 2)
  const [dpr, setDpr] = useState(Math.min(maxDpr, 1.75))
  const dprRef = useRef(dpr)
  // Last resort on weak GPUs: drop real-time shadows (baked AO keeps the look grounded).
  const [shadows, setShadows] = useState(true)
  return (
    <Canvas
      shadows={shadows}
      dpr={dpr}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      camera={{ fov: 55, near: 0.5, far: 3000, position: [0, 120, 260] }}
      onCreated={(state) => {
        state.gl.toneMappingExposure = 1.05
        // Dev-only handle for profiling (draw calls, triangles) from the console.
        if (process.env.NODE_ENV !== "production") (window as unknown as { __duckR3F?: typeof state }).__duckR3F = state
      }}
      style={{ position: "absolute", inset: 0, touchAction: "none" }}
    >
      <PerformanceMonitor
        onDecline={() => {
          if (dprRef.current <= 1) setShadows(false)
          dprRef.current = Math.max(1, dprRef.current - 0.25)
          setDpr(dprRef.current)
        }}
        onIncline={() => {
          dprRef.current = Math.min(maxDpr, dprRef.current + 0.25)
          setDpr(dprRef.current)
        }}
      />
      <GameContext.Provider value={value}>
        <Suspense fallback={null}>
          <SceneContents />
          <Ready onReady={onReady} />
        </Suspense>
      </GameContext.Provider>
    </Canvas>
  )
}

/** Mounted after the models resolve; tells the UI the world is on screen. */
function Ready({ onReady }: { onReady: () => void }) {
  const done = useRef(false)
  useFrame(() => {
    if (done.current) return
    done.current = true
    onReady()
  })
  return null
}
