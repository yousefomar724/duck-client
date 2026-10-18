"use client"

import { useEffect } from "react"

declare global {
  interface Window {
    dataLayer?: unknown[]
  }
}

const INTERACTION_EVENTS = [
  "pointerdown",
  "keydown",
  "scroll",
  "touchstart",
] as const

/**
 * Loaded anyway this long after `load` for visitors who never interact. Long
 * enough that it lands after startup has settled on a slow phone; nearly every
 * real visitor scrolls or taps well before it fires.
 */
const FALLBACK_DELAY_MS = 10_000

/**
 * GA4, loaded off the critical path.
 *
 * gtag.js is ~190 KB and ran ~450 ms of main-thread work in the middle of the
 * landing page's startup on a mid-range phone. This defers it to the first
 * interaction, or 10 seconds after the page has loaded. Commands are queued on
 * dataLayer up front, so the page_view still goes out once it loads. The
 * trade-off: a visitor who leaves within those seconds without scrolling or
 * touching the page is not counted.
 */
export function DeferredGoogleAnalytics({ gaId }: { gaId: string }) {
  useEffect(() => {
    let timeoutId: number | undefined

    const removeListeners = () => {
      for (const event of INTERACTION_EVENTS) {
        window.removeEventListener(event, load)
      }
      window.removeEventListener("load", startFallback)
      if (timeoutId !== undefined) window.clearTimeout(timeoutId)
    }

    function load() {
      removeListeners()
      const dataLayer = (window.dataLayer = window.dataLayer || [])
      // gtag.js only accepts the `arguments` object, not a plain array.
      const gtag: (...args: unknown[]) => void = function () {
        // eslint-disable-next-line prefer-rest-params
        dataLayer.push(arguments)
      }
      gtag("js", new Date())
      gtag("config", gaId)

      const script = document.createElement("script")
      script.async = true
      script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`
      document.head.appendChild(script)
    }

    function startFallback() {
      timeoutId = window.setTimeout(load, FALLBACK_DELAY_MS)
    }

    for (const event of INTERACTION_EVENTS) {
      window.addEventListener(event, load, { once: true, passive: true })
    }
    if (document.readyState === "complete") {
      startFallback()
    } else {
      window.addEventListener("load", startFallback, { once: true })
    }

    return removeListeners
  }, [gaId])

  return null
}
