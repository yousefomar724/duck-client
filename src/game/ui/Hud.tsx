"use client"

import { Pause, Sun } from "lucide-react"
import { useTranslations } from "next-intl"
import { useEffect, useRef } from "react"
import { sfx } from "../audio/sfx"
import type { GameRuntime } from "../runtime/runtime"
import { Minimap } from "./Minimap"
import { type Toast, useGameUI } from "./store"

const fmtTime = (s: number) => {
  const whole = Math.ceil(s)
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`
}

export function Hud({ runtime, totalLandmarks }: { runtime: GameRuntime; totalLandmarks: number }) {
  const t = useTranslations("game")
  const hud = useGameUI((s) => s.hud)
  const setPhase = useGameUI((s) => s.setPhase)
  const lastTick = useRef(-1)

  // Countdown ticks in the last ten seconds of sunlight.
  useEffect(() => {
    const whole = Math.ceil(hud.timeLeft)
    if (whole <= 10 && whole > 0 && whole !== lastTick.current) {
      lastTick.current = whole
      sfx.tick()
    }
  }, [hud.timeLeft])

  const urgent = hud.timeLeft <= 15
  return (
    <div className="pointer-events-none absolute inset-0 z-20 p-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
      <div className="flex items-start justify-between gap-2">
        {/* Score */}
        <div className="rounded-2xl bg-[#121528]/70 px-3 py-2 text-white shadow-lg backdrop-blur-sm">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-white/70">{t("score")}</div>
          <div className="text-2xl font-black tabular-nums leading-none text-[#f5e847]">{hud.score}</div>
          <div className="mt-1 text-[11px] font-semibold text-white/80">
            🏛️ {hud.landmarks}/{totalLandmarks}
          </div>
        </div>

        {/* Sunset clock */}
        <div
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 font-bold tabular-nums text-white shadow-lg backdrop-blur-sm ${
            urgent ? "animate-pulse bg-[#c8362c]/85" : "bg-[#121528]/70"
          }`}
          aria-label={t("timeLeft")}
        >
          <Sun className="h-4 w-4 text-[#f5e847]" aria-hidden />
          <span className="text-lg">{fmtTime(hud.timeLeft)}</span>
        </div>

        {/* Pause + minimap */}
        <div className="flex flex-col items-end gap-2">
          <button
            type="button"
            onClick={() => {
              sfx.click()
              setPhase("paused")
            }}
            className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full bg-[#121528]/70 text-white shadow-lg backdrop-blur-sm active:scale-95"
            aria-label={t("pause")}
          >
            <Pause className="h-5 w-5" aria-hidden />
          </button>
          <Minimap runtime={runtime} />
        </div>
      </div>

      <Toasts />

      {/* The duckling line and what it's worth right now. */}
      {hud.trail > 0 && (
        <div className="absolute bottom-[max(1.5rem,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2">
          <div className="flex items-center gap-2 rounded-full bg-[#f5e847] px-4 py-2 font-bold text-[#121528] shadow-xl">
            <span className="text-xl leading-none">🦆</span>
            <span className="text-xl tabular-nums leading-none">{hud.trail}</span>
            <span className="text-sm font-semibold opacity-80">
              {t("line", { multiplier: hud.multiplier.toFixed(1), points: hud.linePoints })}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

function Toasts() {
  const toasts = useGameUI((s) => s.toasts)
  return (
    <div className="absolute inset-x-0 top-[calc(max(0.75rem,env(safe-area-inset-top))+3.5rem)] flex flex-col items-center gap-2 px-28 max-sm:px-3 max-sm:top-[calc(max(0.75rem,env(safe-area-inset-top))+9.5rem)]">
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} />
      ))}
    </div>
  )
}

function ToastCard({ toast }: { toast: Toast }) {
  const t = useTranslations("game")
  const dismiss = useGameUI((s) => s.dismissToast)
  useEffect(() => {
    const id = setTimeout(() => dismiss(toast.id), toast.kind === "landmark" ? 5200 : 2800)
    return () => clearTimeout(id)
  }, [toast, dismiss])

  if (toast.kind === "landmark") {
    return (
      <div className="w-full max-w-sm animate-[toastIn_.35s_ease-out] rounded-2xl border-2 border-[#067ba1] bg-white/95 p-3 text-[#121528] shadow-2xl">
        <div className="text-[11px] font-bold uppercase tracking-wide text-[#067ba1]">
          {t("toastLandmark", { points: toast.points })}
        </div>
        <div className="text-base font-black">{t(`landmarks.${toast.landmark}.name`)}</div>
        <p className="mt-0.5 text-[13px] leading-snug text-[#121528]/80">{t(`landmarks.${toast.landmark}.fact`)}</p>
      </div>
    )
  }
  const text =
    toast.kind === "deliver"
      ? t("toastDeliver", { count: toast.count, points: toast.points }) + (toast.golden ? ` ${t("toastDeliverGolden")}` : "")
      : toast.kind === "scatter"
        ? t("toastScatter", { count: toast.count })
        : toast.kind === "golden"
          ? t("toastGolden")
          : toast.kind === "goldenGone"
            ? t("toastGoldenGone")
            : t("toastEdge")
  const tone =
    toast.kind === "deliver"
      ? "bg-[#f5e847] text-[#121528]"
      : toast.kind === "golden"
        ? "bg-gradient-to-r from-[#ffb300] to-[#f5e847] text-[#121528]"
        : toast.kind === "scatter"
          ? "bg-[#c8362c] text-white"
          : "bg-[#121528]/85 text-white"
  return (
    <div className={`animate-[toastIn_.3s_ease-out] rounded-full px-4 py-2 text-center text-sm font-bold shadow-xl ${tone}`}>
      {text}
    </div>
  )
}
