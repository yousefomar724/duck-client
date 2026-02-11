"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import gsap from "gsap"
import { ScrollToPlugin } from "gsap/ScrollToPlugin"
import { usePathname } from "next/navigation"

gsap.registerPlugin(ScrollToPlugin)

const TOUCH_THRESHOLD = 40
const DEBOUNCE_MS = 1000

function resetIntroState() {
  gsap.set("#intro-section-0", { autoAlpha: 1, zIndex: 10 })
  gsap.set("#intro-section-1", { autoAlpha: 0, zIndex: 9 })
  gsap.set("#intro-section-2", { autoAlpha: 0, zIndex: 8 })
  gsap.set("#intro-section-0 .section-content", { y: 0, autoAlpha: 1 })
  gsap.set("#intro-section-1 .section-content", { y: 100, autoAlpha: 0 })
  gsap.set("#intro-section-2 .section-content", { y: 100, autoAlpha: 0 })
}

export default function ScrollManager() {
  const [currentSection, setCurrentSection] = useState(0)
  const lastScrollTime = useRef(0)
  const isAnimating = useRef(false)
  const pathname = usePathname()

  // Touch state for mobile
  const lastTouchY = useRef(0)
  const touchDeltaSum = useRef(0)
  const touchHandled = useRef(false)

  // Pathname-based scroll reset when navigating to home
  useEffect(() => {
    if (pathname !== "/") return

    if ("scrollRestoration" in history) {
      history.scrollRestoration = "manual"
    }
    window.scrollTo(0, 0)
    resetIntroState()
    queueMicrotask(() => setCurrentSection(0))
  }, [pathname])

  // Shared transition logic - called by both wheel and touch handlers
  const runTransition = useCallback((direction: number, current: number) => {
    if (isAnimating.current) return

    const nextSection = current + direction

    if (direction > 0) {
      // SCROLL DOWN
      if (nextSection <= 2) {
        isAnimating.current = true
        setCurrentSection(nextSection)

        gsap.to(`#intro-section-${current} .section-content`, {
          y: -100,
          autoAlpha: 0,
          duration: 1,
          ease: "power2.inOut",
        })

        gsap.set(`#intro-section-${nextSection}`, { zIndex: 20 })
        gsap.set(`#intro-section-${current}`, { zIndex: 10 })

        gsap.fromTo(
          `#intro-section-${nextSection} .section-content`,
          { y: 100, autoAlpha: 0 },
          { y: 0, autoAlpha: 1, duration: 1, ease: "power2.out", delay: 0.2 },
        )

        gsap.fromTo(
          `#intro-section-${nextSection}`,
          { autoAlpha: 0 },
          {
            autoAlpha: 1,
            duration: 1.2,
            ease: "power2.inOut",
            onComplete: () => {
              isAnimating.current = false
              gsap.set(`#intro-section-${current}`, { autoAlpha: 0 })
            },
          },
        )
      } else {
        // nextSection is 3 -> Go to Normal Content
        isAnimating.current = true

        gsap.to(`#intro-section-${current} .section-content`, {
          y: -100,
          autoAlpha: 0,
          duration: 1,
          ease: "power2.inOut",
        })

        gsap.to(window, {
          scrollTo: { y: window.innerHeight },
          duration: 1,
          ease: "power2.inOut",
          onComplete: () => {
            isAnimating.current = false
            setCurrentSection(3)
          },
        })
      }
    } else {
      // SCROLL UP
      if (nextSection >= 0) {
        isAnimating.current = true
        setCurrentSection(nextSection)

        gsap.to(`#intro-section-${current} .section-content`, {
          y: 100,
          autoAlpha: 0,
          duration: 1,
          ease: "power2.inOut",
        })

        gsap.set(`#intro-section-${nextSection}`, {
          autoAlpha: 1,
          zIndex: 10,
        })
        gsap.set(`#intro-section-${current}`, { zIndex: 20 })

        gsap.fromTo(
          `#intro-section-${nextSection} .section-content`,
          { y: -100, autoAlpha: 0 },
          { y: 0, autoAlpha: 1, duration: 1, ease: "power2.out", delay: 0.2 },
        )

        gsap.to(`#intro-section-${current}`, {
          autoAlpha: 0,
          duration: 1.2,
          ease: "power2.inOut",
          onComplete: () => {
            isAnimating.current = false
          },
        })
      }
    }
  }, [])

  // Scroll back from normal content to intro (section 2)
  const scrollBackToIntro = useCallback(() => {
    if (isAnimating.current) return
    isAnimating.current = true

    gsap.to(window, {
      scrollTo: { y: 0 },
      duration: 1,
      ease: "power2.inOut",
      onComplete: () => {
        isAnimating.current = false
        setCurrentSection(2)
        gsap.set(`#intro-section-2 .section-content`, {
          y: 0,
          autoAlpha: 1,
        })
      },
    })
  }, [])

  // Wheel handler - only active on home page where intro sections exist
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (pathname !== "/") return

      const scrollY = window.scrollY
      const normalContentStart = window.innerHeight

      if (scrollY >= normalContentStart - 5) {
        if (scrollY < normalContentStart + 50 && e.deltaY < -5) {
          e.preventDefault()
          scrollBackToIntro()
        }
        return
      }

      e.preventDefault()

      const now = Date.now()
      if (now - lastScrollTime.current < DEBOUNCE_MS) return
      lastScrollTime.current = now

      const direction = e.deltaY > 0 ? 1 : -1
      runTransition(direction, currentSection)
    }

    window.addEventListener("wheel", handleWheel, { passive: false })
    return () => window.removeEventListener("wheel", handleWheel)
  }, [pathname, currentSection, runTransition, scrollBackToIntro])

  // Touch handler for mobile - only active on home page where intro sections exist
  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      lastTouchY.current = e.touches[0].clientY
      touchDeltaSum.current = 0
      touchHandled.current = false
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (pathname !== "/") return

      const scrollY = window.scrollY
      const normalContentStart = window.innerHeight
      const currentY = e.touches[0].clientY
      const deltaY = lastTouchY.current - currentY
      lastTouchY.current = currentY

      // In normal content zone - check if at top and user scrolling UP (to see intro)
      // deltaY < 0 = finger moved down = scroll up intent
      if (scrollY >= normalContentStart - 5) {
        if (
          scrollY < normalContentStart + 50 &&
          deltaY < -5 &&
          !touchHandled.current
        ) {
          e.preventDefault()
          touchHandled.current = true
          scrollBackToIntro()
        }
        return
      }

      // In intro zone - handle section transitions
      touchDeltaSum.current += deltaY

      // Prevent native scroll after threshold to avoid blocking taps
      if (Math.abs(touchDeltaSum.current) > 15) {
        e.preventDefault()
      }

      // Trigger transition when accumulated delta exceeds threshold
      if (
        !touchHandled.current &&
        Math.abs(touchDeltaSum.current) > TOUCH_THRESHOLD
      ) {
        touchHandled.current = true
        const now = Date.now()
        if (now - lastScrollTime.current < DEBOUNCE_MS) return
        lastScrollTime.current = now

        const direction = touchDeltaSum.current > 0 ? 1 : -1
        runTransition(direction, currentSection)
        touchDeltaSum.current = 0
      }
    }

    const handleTouchEnd = () => {
      touchDeltaSum.current = 0
      touchHandled.current = false
    }

    window.addEventListener("touchstart", handleTouchStart, { passive: true })
    window.addEventListener("touchmove", handleTouchMove, { passive: false })
    window.addEventListener("touchend", handleTouchEnd, { passive: true })

    return () => {
      window.removeEventListener("touchstart", handleTouchStart)
      window.removeEventListener("touchmove", handleTouchMove)
      window.removeEventListener("touchend", handleTouchEnd)
    }
  }, [pathname, currentSection, runTransition, scrollBackToIntro])

  return null
}
