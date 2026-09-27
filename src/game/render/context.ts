"use client"

import { createContext, useContext } from "react"
import type { GameRuntime } from "../runtime/runtime"
import { createSkyState, type SkyState } from "./timeOfDay"

/** Per-frame values shared between scene components without React re-renders. */
export interface FrameState {
  /** 0..1 through the run (sunset clock). */
  u: number
  /** Seconds since the scene mounted (animation clock, runs in menus too). */
  clock: number
  sky: SkyState
  /** Camera yaw in heading convention, for the joystick. */
  cameraYaw: number
  /** Screen shake amount, decays each frame. */
  shake: number
}

export function createFrameState(): FrameState {
  return { u: 0.35, clock: 0, sky: createSkyState(), cameraYaw: 0, shake: 0 }
}

export interface GameContextValue {
  runtime: GameRuntime
  frame: FrameState
}

export const GameContext = createContext<GameContextValue | null>(null)

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext)
  if (!ctx) throw new Error("useGame must be used inside <GameContext>")
  return ctx
}
