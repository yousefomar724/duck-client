"use client"

import { create } from "zustand"
import type { LandmarkId } from "../core/types"
import type { ControlMode } from "../runtime/input"

export type Phase = "loading" | "title" | "playing" | "paused" | "over"

export type Toast =
  | { id: number; kind: "landmark"; landmark: LandmarkId; points: number }
  | { id: number; kind: "deliver"; count: number; golden: number; points: number }
  | { id: number; kind: "scatter"; count: number }
  | { id: number; kind: "golden" }
  | { id: number; kind: "goldenGone" }
  | { id: number; kind: "edge" }

type ToastInput = Toast extends infer T ? (T extends Toast ? Omit<T, "id"> : never) : never

export interface Hud {
  score: number
  timeLeft: number
  trail: number
  linePoints: number
  multiplier: number
  landmarks: number
}

export interface Results {
  score: number
  best: number
  isBest: boolean
  rescued: number
  golden: number
  landmarks: number
  totalLandmarks: number
  bestLine: number
}

export interface Settings {
  controls: ControlMode
  sound: boolean
}

interface GameUI {
  phase: Phase
  loadError: string | null
  hud: Hud
  toasts: Toast[]
  results: Results | null
  settings: Settings
  best: number
  /** Bumped to start a fresh run. */
  runId: number
  hintDone: boolean
  setPhase: (p: Phase) => void
  setHud: (h: Hud) => void
  pushToast: (t: ToastInput) => void
  dismissToast: (id: number) => void
  setSettings: (s: Partial<Settings>) => void
  finish: (r: Omit<Results, "best" | "isBest">) => void
  startRun: () => void
  setHintDone: () => void
  setLoadError: (e: string | null) => void
}

const STORAGE_KEY = "duck-game-v1"

interface Saved {
  best?: number
  settings?: Partial<Settings>
  hintDone?: boolean
}

// Browser storage can throw (private mode, blocked site data) — every
// access is guarded and the game works without it.
function readSaved(): Saved {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as Saved
  } catch {
    return {}
  }
}

function writeSaved(patch: Saved) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...readSaved(), ...patch }))
  } catch {
    // Ignore — progress just won't persist.
  }
}

let toastId = 1

export const useGameUI = create<GameUI>((set, get) => ({
  phase: "loading",
  loadError: null,
  hud: { score: 0, timeLeft: 0, trail: 0, linePoints: 0, multiplier: 1, landmarks: 0 },
  toasts: [],
  results: null,
  settings: { controls: "paddle", sound: true },
  best: 0,
  runId: 0,
  hintDone: false,
  setPhase: (phase) => set({ phase }),
  setHud: (hud) => set({ hud }),
  pushToast: (t) => {
    const toast = { ...t, id: toastId++ } as Toast
    // Keep the stack short on small screens.
    set({ toasts: [...get().toasts.slice(-2), toast] })
  },
  dismissToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
  setSettings: (s) => {
    const settings = { ...get().settings, ...s }
    set({ settings })
    writeSaved({ settings })
  },
  finish: (r) => {
    const best = Math.max(get().best, r.score)
    const isBest = r.score > 0 && r.score >= best && r.score > get().best
    set({ results: { ...r, best, isBest }, best, phase: "over" })
    writeSaved({ best })
  },
  startRun: () => set({ runId: get().runId + 1, results: null, toasts: [], phase: "playing" }),
  setHintDone: () => {
    set({ hintDone: true })
    writeSaved({ hintDone: true })
  },
  setLoadError: (loadError) => set({ loadError }),
}))

/** Load persisted best score and settings (call once on the client). */
export function hydrateGameUI() {
  const saved = readSaved()
  useGameUI.setState((s) => ({
    best: saved.best ?? 0,
    hintDone: saved.hintDone ?? false,
    settings: { ...s.settings, ...saved.settings },
  }))
}
