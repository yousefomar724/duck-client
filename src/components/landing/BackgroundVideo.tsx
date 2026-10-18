"use client"

import { useEffect, useRef } from "react"

interface BackgroundVideoProps {
  src: string
  /** Smaller encode served below the md breakpoint. */
  mobileSrc: string
  /** Painted immediately while the video downloads — this is what LCP measures. */
  poster: string
  className?: string
}

const MOBILE_QUERY = "(max-width: 767px)"

type NetworkInformation = { saveData?: boolean }

/**
 * Decorative, silent, looping background video for the above-the-fold hero.
 *
 * The video is attached only after the page has finished loading. On a phone
 * on 4G even the mobile encode is ~1 MB, and fetching it alongside the page's
 * JavaScript pushed back hydration and interactivity. The poster covers the gap,
 * and visitors who asked for reduced motion or data saving keep just the poster.
 *
 * Marked `aria-hidden` because it carries no information — the section's heading
 * and copy do. That also keeps it out of the "video needs captions" audit, which
 * would otherwise flag a soundless background loop.
 */
export default function BackgroundVideo({
  src,
  mobileSrc,
  poster,
  className,
}: BackgroundVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const connection = (
      navigator as Navigator & { connection?: NetworkInformation }
    ).connection
    if (
      connection?.saveData ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return
    }

    let idleId: number | undefined
    let timeoutId: number | undefined

    const attach = () => {
      video.src = window.matchMedia(MOBILE_QUERY).matches ? mobileSrc : src
      void video.play().catch(() => {
        /* autoplay can be blocked; the poster stays visible */
      })
    }
    const scheduleAttach = () => {
      // Safari has no requestIdleCallback.
      if (typeof window.requestIdleCallback === "function") {
        idleId = window.requestIdleCallback(attach, { timeout: 2000 })
      } else {
        timeoutId = window.setTimeout(attach, 200)
      }
    }

    if (document.readyState === "complete") {
      scheduleAttach()
    } else {
      window.addEventListener("load", scheduleAttach, { once: true })
    }

    return () => {
      window.removeEventListener("load", scheduleAttach)
      if (idleId !== undefined) window.cancelIdleCallback(idleId)
      if (timeoutId !== undefined) window.clearTimeout(timeoutId)
    }
  }, [src, mobileSrc])

  return (
    <video
      ref={videoRef}
      autoPlay
      muted
      loop
      playsInline
      aria-hidden="true"
      tabIndex={-1}
      poster={poster}
      preload="none"
      className={className}
    />
  )
}
