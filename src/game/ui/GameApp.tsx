"use client"

import { useProgress } from "@react-three/drei"
import { useCallback, useEffect, useMemo, useState } from "react"
import { sfx } from "../audio/sfx"
import { createFrameState, type GameContextValue } from "../render/context"
import { preloadModels } from "../render/assets"
import { fx } from "../render/fxBus"
import { GameScene } from "../render/Scene"
import { GameRuntime, loadGameData } from "../runtime/runtime"
import { Hud } from "./Hud"
import { Hint, LoadingScreen, PauseMenu, Results, TitleScreen } from "./Menus"
import { hydrateGameUI, useGameUI } from "./store"
import { TouchControls } from "./TouchControls"

const vibrate = (pattern: number | number[]) => {
  try {
    navigator.vibrate?.(pattern)
  } catch {
    // Not supported (iOS) — fine.
  }
}

const newSeed = () => (Math.random() * 0xffffffff) >>> 0

export default function GameApp() {
  const phase = useGameUI((s) => s.phase)
  const runId = useGameUI((s) => s.runId)
  const settings = useGameUI((s) => s.settings)
  const hintDone = useGameUI((s) => s.hintDone)
  const loadError = useGameUI((s) => s.loadError)
  const [runtime, setRuntime] = useState<GameRuntime | null>(null)
  const [sceneReady, setSceneReady] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const frame = useMemo(() => createFrameState(), [])
  const { progress } = useProgress()

  // Load persisted settings, map data and models.
  useEffect(() => {
    hydrateGameUI()
    preloadModels()
  }, [])
  useEffect(() => {
    let cancelled = false
    useGameUI.getState().setLoadError(null)
    loadGameData()
      .then((data) => {
        if (cancelled) return
        const rt = new GameRuntime(data, newSeed())
        // Dev-only handle for QA from the console (e.g. skipping to sunset).
        if (process.env.NODE_ENV !== "production") (window as unknown as { __duckGame?: GameRuntime }).__duckGame = rt
        setRuntime(rt)
      })
      .catch((err: unknown) => {
        if (!cancelled) useGameUI.getState().setLoadError(err instanceof Error ? err.message : String(err))
      })
    return () => {
      cancelled = true
    }
  }, [attempt])

  useEffect(() => {
    if (sceneReady && phase === "loading") useGameUI.getState().setPhase("title")
  }, [sceneReady, phase])

  useEffect(() => {
    sfx.setEnabled(settings.sound)
    if (runtime) runtime.input.mode = settings.controls
  }, [settings, runtime])

  // A new run: fresh seed, fresh river.
  useEffect(() => {
    if (!runtime || runId === 0) return
    runtime.restart(newSeed())
    runtime.input.mode = useGameUI.getState().settings.controls
    frame.shake = 0
    sfx.startAmbience()
  }, [runId, runtime, frame])

  // Sim events → sound, particles, toasts, results.
  useEffect(() => {
    if (!runtime) return
    return runtime.on((e) => {
      const ui = useGameUI.getState()
      switch (e.type) {
        case "stroke":
          sfx.stroke()
          break
        case "pickup":
          sfx.pickup(e.golden, e.trail)
          fx.emit({ type: "sparkle", x: e.x, z: e.z, golden: e.golden })
          vibrate(12)
          break
        case "deliver":
          sfx.deliver(e.count)
          fx.emit({ type: "confetti", x: e.x, z: e.z })
          ui.pushToast({ kind: "deliver", count: e.count, golden: e.golden, points: e.points })
          vibrate([20, 40, 20])
          break
        case "scatter":
          sfx.scatter()
          fx.emit({ type: "spray", x: e.x, z: e.z })
          ui.pushToast({ kind: "scatter", count: e.count })
          frame.shake = 0.7
          vibrate(70)
          break
        case "bump":
          sfx.bump(e.strength)
          frame.shake = Math.max(frame.shake, Math.min(0.45, e.strength * 0.08))
          if (e.strength > 2) fx.emit({ type: "spray", x: e.x, z: e.z })
          break
        case "discover":
          sfx.discover()
          ui.pushToast({ kind: "landmark", landmark: e.id, points: e.points })
          break
        case "golden":
          sfx.golden()
          ui.pushToast({ kind: "golden" })
          break
        case "goldenGone":
          ui.pushToast({ kind: "goldenGone" })
          break
        case "edge":
          ui.pushToast({ kind: "edge" })
          break
        case "end": {
          sfx.end()
          sfx.stopAmbience()
          const s = runtime.sim.state
          ui.finish({
            score: s.score,
            rescued: s.stats.rescued,
            golden: s.stats.golden,
            landmarks: s.discovered.length,
            totalLandmarks: runtime.data.map.landmarks.length,
            bestLine: s.stats.bestLine,
          })
          break
        }
      }
    })
  }, [runtime, frame])

  // Keyboard, and pausing when the tab is hidden.
  useEffect(() => {
    if (!runtime) return
    const down = (e: KeyboardEvent) => {
      const { phase: p, setPhase } = useGameUI.getState()
      if (e.code === "Escape" || e.code === "KeyP") {
        if (p === "playing") setPhase("paused")
        else if (p === "paused") setPhase("playing")
        return
      }
      if (p !== "playing") return
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "KeyA", "KeyD", "KeyW", "Space"].includes(e.code)) {
        e.preventDefault()
        runtime.input.keyDown(e.code)
      }
    }
    const up = (e: KeyboardEvent) => runtime.input.keyUp(e.code)
    const hide = () => {
      if (document.hidden && useGameUI.getState().phase === "playing") useGameUI.getState().setPhase("paused")
    }
    window.addEventListener("keydown", down)
    window.addEventListener("keyup", up)
    document.addEventListener("visibilitychange", hide)
    return () => {
      window.removeEventListener("keydown", down)
      window.removeEventListener("keyup", up)
      document.removeEventListener("visibilitychange", hide)
    }
  }, [runtime])

  // Drop held inputs whenever play stops, so nothing is "stuck" on resume.
  useEffect(() => {
    if (phase !== "playing") runtime?.input.reset()
  }, [phase, runtime])

  const contextValue = useMemo<GameContextValue | null>(() => (runtime ? { runtime, frame } : null), [runtime, frame])
  const onReady = useCallback(() => setSceneReady(true), [])
  const start = useCallback(() => useGameUI.getState().startRun(), [])
  const quit = useCallback(() => {
    sfx.stopAmbience()
    useGameUI.getState().setPhase("title")
  }, [])

  return (
    <div
      dir="ltr"
      className="fixed inset-0 h-[100dvh] w-screen select-none overflow-hidden bg-[#121528] font-sans [-webkit-touch-callout:none] [-webkit-tap-highlight-color:transparent]"
      style={{ overscrollBehavior: "none" }}
    >
      <style>{`@keyframes toastIn{from{opacity:0;transform:translateY(-8px) scale(.96)}to{opacity:1;transform:none}}`}</style>
      {contextValue && <GameScene value={contextValue} onReady={onReady} />}

      {runtime && phase === "playing" && <TouchControls runtime={runtime} mode={settings.controls} />}
      {runtime && (phase === "playing" || phase === "paused") && (
        <Hud runtime={runtime} totalLandmarks={runtime.data.map.landmarks.length} />
      )}
      {phase === "playing" && !hintDone && (
        <Hint mode={settings.controls} onDone={() => useGameUI.getState().setHintDone()} />
      )}

      {phase === "loading" && (
        <LoadingScreen
          progress={progress}
          error={loadError}
          onRetry={() => setAttempt((a) => a + 1)}
        />
      )}
      {phase === "title" && <TitleScreen onPlay={start} />}
      {phase === "paused" && (
        <PauseMenu onResume={() => useGameUI.getState().setPhase("playing")} onRestart={start} onQuit={quit} />
      )}
      {phase === "over" && <Results onAgain={start} onQuit={quit} />}
    </div>
  )
}
