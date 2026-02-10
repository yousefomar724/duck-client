"use client"

import { useEffect, useRef, useState } from "react"
import gsap from "gsap"
import { ScrollToPlugin } from "gsap/ScrollToPlugin"

gsap.registerPlugin(ScrollToPlugin)

export default function ScrollManager() {
  const [currentSection, setCurrentSection] = useState(0)
  const lastScrollTime = useRef(0)
  const isAnimating = useRef(false)

  // Initialize fade logic
  useEffect(() => {
    // Initial state: Show section 0, hide 1 and 2
    gsap.set("#intro-section-0", { autoAlpha: 1, zIndex: 10 })
    gsap.set("#intro-section-1", { autoAlpha: 0, zIndex: 9 })
    gsap.set("#intro-section-2", { autoAlpha: 0, zIndex: 8 })
    
    // Initial content state
    gsap.set("#intro-section-0 .section-content", { y: 0, autoAlpha: 1 })
    gsap.set("#intro-section-1 .section-content", { y: 100, autoAlpha: 0 })
    gsap.set("#intro-section-2 .section-content", { y: 100, autoAlpha: 0 })
  }, [])

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      const scrollY = window.scrollY
      const normalContentStart = window.innerHeight // 100vh spacer

      // If we are scrolled down into normal content
      if (scrollY >= normalContentStart - 5) {
        // If at top of normal content and scrolling UP, go back to intro
        if (Math.abs(scrollY - normalContentStart) < 10 && e.deltaY < 0) {
          e.preventDefault()
          if (isAnimating.current) return
          isAnimating.current = true
          
          gsap.to(window, {
            scrollTo: { y: 0 },
            duration: 1,
            ease: "power2.inOut",
            onComplete: () => {
              isAnimating.current = false
              setCurrentSection(2)
              // Reset content positions for re-entry if needed
              gsap.set(`#intro-section-2 .section-content`, { y: 0, autoAlpha: 1 })
            }
          })
        }
        // Otherwise let native scroll happen
        return
      }

      // We are at top (scrollY = 0), handling intro transitions
      e.preventDefault()

      const now = Date.now()
      if (now - lastScrollTime.current < 1000) return // Debounce slightly longer for fade
      lastScrollTime.current = now

      if (isAnimating.current) return

      const direction = e.deltaY > 0 ? 1 : -1
      const nextSection = currentSection + direction

      // Transition Logic
      if (direction > 0) {
        // SCROLL DOWN
        if (nextSection <= 2) {
          isAnimating.current = true
          setCurrentSection(nextSection)
          
          // Current Section: Moves UP and Fades Out
          gsap.to(`#intro-section-${currentSection} .section-content`, {
            y: -100,
            autoAlpha: 0,
            duration: 1,
            ease: "power2.inOut"
          })

          // Next Section: Moves UP (from bottom) and Fades In
          gsap.set(`#intro-section-${nextSection}`, { zIndex: 20 })
          gsap.set(`#intro-section-${currentSection}`, { zIndex: 10 })
          
          // Prepare next content
          gsap.fromTo(`#intro-section-${nextSection} .section-content`, 
            { y: 100, autoAlpha: 0 },
            { y: 0, autoAlpha: 1, duration: 1, ease: "power2.out", delay: 0.2 }
          )

          gsap.fromTo(`#intro-section-${nextSection}`, 
            { autoAlpha: 0 },
            { 
              autoAlpha: 1, 
              duration: 1.2, 
              ease: "power2.inOut",
              onComplete: () => {
                isAnimating.current = false
                gsap.set(`#intro-section-${currentSection}`, { autoAlpha: 0 }) 
              }
            }
          )
        } else {
          // nextSection is 3 -> Go to Normal Content
          isAnimating.current = true
          
          // Animate current content up/out
          gsap.to(`#intro-section-${currentSection} .section-content`, {
            y: -100,
            autoAlpha: 0,
            duration: 1,
            ease: "power2.inOut"
          })

          gsap.to(window, {
            scrollTo: { y: window.innerHeight },
            duration: 1,
            ease: "power2.inOut",
            onComplete: () => {
              isAnimating.current = false
              setCurrentSection(3) 
            }
          })
        }
      } else {
        // SCROLL UP
        if (nextSection >= 0) {
          isAnimating.current = true
          setCurrentSection(nextSection)

          // Current Section (leaving): Moves DOWN and Fades Out
          // Actually, if we scroll UP, the current section should drop down (exit bottom)
          // And previous section should drop down (enter from top)
          
          // Animate Current Content DOWN and Out
          gsap.to(`#intro-section-${currentSection} .section-content`, {
            y: 100,
            autoAlpha: 0,
            duration: 1,
            ease: "power2.inOut"
          })

          // Previous Section (entering): Moves DOWN (from top) and Fades In
          gsap.set(`#intro-section-${nextSection}`, { autoAlpha: 1, zIndex: 10 })
          gsap.set(`#intro-section-${currentSection}`, { zIndex: 20 })

          // Prepare previous content to enter from TOP
          gsap.fromTo(`#intro-section-${nextSection} .section-content`,
            { y: -100, autoAlpha: 0 },
            { y: 0, autoAlpha: 1, duration: 1, ease: "power2.out", delay: 0.2 }
          )

          // Fade out current section wrapper
          gsap.to(`#intro-section-${currentSection}`, {
            autoAlpha: 0,
            duration: 1.2,
            ease: "power2.inOut",
            onComplete: () => {
              isAnimating.current = false
            }
          })
        }
      }
    }

    // Add non-passive listener to prevent default
    window.addEventListener("wheel", handleWheel, { passive: false })

    return () => {
      window.removeEventListener("wheel", handleWheel)
    }
  }, [currentSection])

  return null
}
