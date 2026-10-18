"use client"

import { useEffect, useState, type RefObject } from "react"

interface Options {
  /** How far ahead of the viewport to trigger, in px. */
  rootMargin?: number
  /** Skip observing entirely (e.g. content that must load immediately). */
  enabled?: boolean
}

/**
 * Reports `true` once the element has come within `rootMargin` of the viewport,
 * and never flips back.
 */
export function useInViewOnce<T extends Element>(
  ref: RefObject<T | null>,
  { rootMargin = 200, enabled = true }: Options = {},
): boolean {
  const [inView, setInView] = useState(false)

  useEffect(() => {
    if (!enabled || inView) return
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect()
          setInView(true)
        }
      },
      { rootMargin: `${rootMargin}px` },
    )
    observer.observe(el)

    return () => observer.disconnect()
  }, [ref, rootMargin, enabled, inView])

  return inView
}
