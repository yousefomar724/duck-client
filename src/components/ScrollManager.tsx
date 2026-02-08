"use client"

import { useEffect, useRef, useState } from "react"
import gsap from "gsap"
import { ScrollToPlugin } from "gsap/ScrollToPlugin"

gsap.registerPlugin(ScrollToPlugin)

export default function ScrollManager() {
  const [, setIsScrolling] = useState(false)
  const lastScrollTime = useRef(0)

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      // If we are in the "normal scroll" zone (after section 3), let native scroll happen
      // Unless we are at the top of normal scroll and scrolling UP
      const scrollY = window.scrollY
      const viewportHeight = window.innerHeight
      const normalScrollStart = 3 * viewportHeight // Hero + RedSea + Amaala = 3 sections

      // Threshold to consider "at the top" of normal scroll
      const isAtNormalTop = Math.abs(scrollY - normalScrollStart) < 5

      if (scrollY >= normalScrollStart - 5 && !isAtNormalTop) {
        // We are deep in normal scroll, let it be
        return
      }

      // If we are at the top of normal scroll and scrolling DOWN, let it be
      if (isAtNormalTop && e.deltaY > 0) {
        return
      }

      // If we are at the top of normal scroll and scrolling UP, we hijack to go back to section 2
      // OR if we are in the first 3 sections, we hijack navigation

      e.preventDefault()

      const now = Date.now()
      if (now - lastScrollTime.current < 800) return // Debounce
      lastScrollTime.current = now

      const direction = e.deltaY > 0 ? 1 : -1
      const currentSectionIndex = Math.round(scrollY / viewportHeight)
      let nextSectionIndex = currentSectionIndex + direction

      // Clamp index
      // 0: Hero, 1: RedSea, 2: Amaala, 3: Normal Content Start
      if (nextSectionIndex < 0) nextSectionIndex = 0
      if (nextSectionIndex > 3) nextSectionIndex = 3

      if (nextSectionIndex === currentSectionIndex) return

      setIsScrolling(true)
      gsap.to(window, {
        scrollTo: { y: nextSectionIndex * viewportHeight, autoKill: false },
        duration: 1,
        ease: "power2.inOut",
        onComplete: () => setIsScrolling(false),
      })
    }

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        const scrollY = window.scrollY
        const viewportHeight = window.innerHeight
        const normalScrollStart = 3 * viewportHeight

        if (
          scrollY >= normalScrollStart - 5 &&
          !(Math.abs(scrollY - normalScrollStart) < 5 && e.key === "ArrowUp")
        ) {
          return
        }

        e.preventDefault()
        const now = Date.now()
        if (now - lastScrollTime.current < 500) return
        lastScrollTime.current = now

        const direction = e.key === "ArrowDown" ? 1 : -1
        const currentSectionIndex = Math.round(scrollY / viewportHeight)
        let nextSectionIndex = currentSectionIndex + direction

        if (nextSectionIndex < 0) nextSectionIndex = 0
        if (nextSectionIndex > 3) nextSectionIndex = 3

        gsap.to(window, {
          scrollTo: { y: nextSectionIndex * viewportHeight, autoKill: false },
          duration: 0.8,
          ease: "power2.inOut",
        })
      }
    }

    // Add non-passive listener to prevent default
    window.addEventListener("wheel", handleWheel, { passive: false })
    window.addEventListener("keydown", handleKey)

    return () => {
      window.removeEventListener("wheel", handleWheel)
      window.removeEventListener("keydown", handleKey)
    }
  }, [])

  return null
}
