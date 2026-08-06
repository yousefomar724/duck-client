"use client"

import { useEffect, useState } from "react"

interface CountUpNumberProps {
  value: number | null
  active: boolean
  suffix?: string
  className?: string
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

export function CountUpNumber({
  value,
  active,
  suffix = "",
  className,
}: CountUpNumberProps) {
  const [display, setDisplay] = useState<number | null>(null)

  useEffect(() => {
    if (!active || value === null) return

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches

    if (prefersReducedMotion) {
      setDisplay(value)
      return
    }

    const duration = 1500
    const start = performance.now()
    let frameId = 0

    const tick = (now: number) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      setDisplay(Math.round(easeOutCubic(progress) * value))
      if (progress < 1) {
        frameId = requestAnimationFrame(tick)
      }
    }

    setDisplay(0)
    frameId = requestAnimationFrame(tick)

    return () => cancelAnimationFrame(frameId)
  }, [active, value])

  if (value === null) {
    return <span className={className}>—</span>
  }

  if (!active) {
    return <span className={className}>0{suffix}</span>
  }

  return (
    <span className={className}>
      {display ?? 0}
      {suffix}
    </span>
  )
}
