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
 *
 * Uses IntersectionObserver plus a capture-phase scroll/resize fallback:
 * fullPage.js scrolls nested `.fp-overflow` containers and translates sections,
 * so scroll events do not reliably reach the window in the bubble phase.
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

    let settled = false
    const activate = () => {
      if (settled) return
      settled = true
      setInView(true)
    }

    const check = () => {
      const rect = el.getBoundingClientRect()
      if (
        rect.top < window.innerHeight + rootMargin &&
        rect.bottom > -rootMargin
      ) {
        activate()
      }
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) activate()
      },
      { rootMargin: `${rootMargin}px` },
    )
    observer.observe(el)

    // fullPage.js moves sections with a CSS transform transition. Re-check once
    // the transition has settled so the rect reflects the new position.
    const timers: number[] = []
    const checkAfterTransition = () => {
      check()
      timers.push(window.setTimeout(check, 400))
    }

    window.addEventListener("scroll", check, { capture: true, passive: true })
    window.addEventListener("resize", check, { passive: true })
    window.addEventListener("fullpage:sectionchange", checkAfterTransition)
    check()

    return () => {
      observer.disconnect()
      timers.forEach(clearTimeout)
      window.removeEventListener("scroll", check, { capture: true })
      window.removeEventListener("resize", check)
      window.removeEventListener("fullpage:sectionchange", checkAfterTransition)
    }
  }, [ref, rootMargin, enabled, inView])

  return inView
}
