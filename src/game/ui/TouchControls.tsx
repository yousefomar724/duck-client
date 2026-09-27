"use client"

import { useRef, useState } from "react"
import type { GameRuntime } from "../runtime/runtime"
import type { ControlMode } from "../runtime/input"

/**
 * Full-screen touch layer under the HUD.
 * Paddle mode: left half paddles left, right half paddles right (multi-touch:
 * hold both to cruise). Joystick mode: drag anywhere.
 */
export function TouchControls({ runtime, mode }: { runtime: GameRuntime; mode: ControlMode }) {
  const [pressed, setPressed] = useState({ left: false, right: false })
  const [stick, setStick] = useState<{ ox: number; oy: number; x: number; y: number } | null>(null)
  const sides = useRef(new Map<number, -1 | 1>())
  const stickPointer = useRef<number | null>(null)

  const refreshPressed = () => {
    const vals = [...sides.current.values()]
    setPressed({ left: vals.includes(-1), right: vals.includes(1) })
  }

  const onDown = (e: React.PointerEvent<HTMLDivElement>) => {
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      // Capture is a nicety (keeps drags tracked off-element); input works without it.
    }
    if (mode === "paddle") {
      const side = e.clientX < window.innerWidth / 2 ? -1 : 1
      sides.current.set(e.pointerId, side)
      runtime.input.pressSide(e.pointerId, side)
      refreshPressed()
    } else if (stickPointer.current === null) {
      stickPointer.current = e.pointerId
      setStick({ ox: e.clientX, oy: e.clientY, x: 0, y: 0 })
      runtime.input.setStick(0, 0, true)
    }
  }

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (mode !== "joystick" || stickPointer.current !== e.pointerId || !stick) return
    const R = 56
    let dx = (e.clientX - stick.ox) / R
    let dy = (e.clientY - stick.oy) / R
    const m = Math.hypot(dx, dy)
    if (m > 1) {
      dx /= m
      dy /= m
    }
    setStick({ ...stick, x: dx, y: dy })
    runtime.input.setStick(dx, dy, true)
  }

  const onUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (mode === "paddle") {
      sides.current.delete(e.pointerId)
      runtime.input.releasePointer(e.pointerId)
      refreshPressed()
    } else if (stickPointer.current === e.pointerId) {
      stickPointer.current = null
      setStick(null)
      runtime.input.setStick(0, 0, false)
    }
  }

  return (
    <div
      className="absolute inset-0 z-10 touch-none select-none"
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      onContextMenu={(e) => e.preventDefault()}
    >
      {mode === "paddle" ? (
        <>
          <PaddleButton side="left" active={pressed.left} />
          <PaddleButton side="right" active={pressed.right} />
        </>
      ) : (
        stick && (
          <div
            className="pointer-events-none absolute h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/60 bg-black/15"
            style={{ left: stick.ox, top: stick.oy }}
          >
            <div
              className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#f5e847] shadow-lg"
              style={{ transform: `translate(calc(-50% + ${stick.x * 56}px), calc(-50% + ${stick.y * 56}px))` }}
            />
          </div>
        )
      )}
    </div>
  )
}

function PaddleButton({ side, active }: { side: "left" | "right"; active: boolean }) {
  return (
    <div
      className={`pointer-events-none absolute bottom-[max(1.25rem,env(safe-area-inset-bottom))] flex h-20 w-20 items-center justify-center rounded-full border-2 transition-all duration-100 sm:h-24 sm:w-24 ${
        side === "left" ? "left-5" : "right-5"
      } ${active ? "scale-90 border-[#f5e847] bg-[#f5e847]/45" : "border-white/70 bg-black/20"}`}
    >
      <svg viewBox="0 0 48 48" className={`h-11 w-11 ${side === "right" ? "-scale-x-100" : ""}`} aria-hidden>
        {/* A paddle blade dipping on this side. */}
        <path d="M34 6 L14 38" stroke="white" strokeWidth="3.5" strokeLinecap="round" />
        <path d="M14 38 C8 46 4 44 6 38 C8 32 12 31 16 34 Z" fill="#f29a2e" stroke="white" strokeWidth="2" />
        <path d="M34 6 C40 -2 44 0 42 6 C40 12 36 13 32 10 Z" fill="#f29a2e" stroke="white" strokeWidth="2" />
      </svg>
    </div>
  )
}
