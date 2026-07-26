"use client"

import { useEffect, useRef } from "react"
import { useInViewOnce } from "@/hooks/use-in-view-once"

interface BackgroundVideoProps {
  src: string
  /** Painted immediately while the video downloads — this is what LCP measures. */
  poster: string
  className?: string
  /**
   * Above-the-fold videos load with the page. Everything else waits until the
   * section is approaching the viewport so the initial payload stays small.
   */
  eager?: boolean
}

/**
 * Decorative, silent, looping background video.
 *
 * Marked `aria-hidden` because it carries no information — the section's heading
 * and copy do. That also keeps it out of the "video needs captions" audit, which
 * would otherwise flag a soundless background loop.
 */
export default function BackgroundVideo({
  src,
  poster,
  className,
  eager = false,
}: BackgroundVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  // rootMargin 0: fullPage.js jumps between sections rather than scrolling, so a
  // lookahead buys nothing and would pull the next section's video in at load,
  // while the page is still stacked in normal flow.
  const nearViewport = useInViewOnce(videoRef, {
    enabled: !eager,
    rootMargin: 0,
  })
  const shouldLoad = eager || nearViewport

  // The <source> is only rendered once shouldLoad flips, so the element needs an
  // explicit load() before autoplay will pick it up.
  useEffect(() => {
    if (!shouldLoad || eager) return
    const el = videoRef.current
    if (!el) return
    el.load()
    void el.play().catch(() => {
      /* autoplay can be blocked; the poster stays visible */
    })
  }, [shouldLoad, eager])

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
      preload={eager ? "metadata" : "none"}
      className={className}
    >
      {shouldLoad && <source src={src} type="video/mp4" />}
    </video>
  )
}
