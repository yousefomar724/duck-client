"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { User, Map, Globe, Sun } from "lucide-react"
import { cn } from "@/lib/utils"
import { motion, useScroll, useMotionValueEvent } from "framer-motion"

export default function Navbar() {
  const [isHidden, setIsHidden] = useState(false)
  const [isSolid, setIsSolid] = useState(false)
  const { scrollY } = useScroll()

  useMotionValueEvent(scrollY, "change", (latest) => {
    const previous = scrollY.getPrevious() ?? 0
    const diff = latest - previous
    const isScrollingDown = diff > 0

    // Hide navbar when scrolling down and not at the very top
    if (isScrollingDown && latest > 100) {
      setIsHidden(true)
    } else {
      setIsHidden(false)
    }

    // Determine if we passed the first 3 sections (approx 3 * viewport height)
    // We can use window.innerHeight safely here as this runs on client
    const threshold = typeof window !== "undefined" ? window.innerHeight : 800
    setIsSolid(latest > threshold)
  })

  return (
    <motion.nav
      variants={{
        visible: { y: 0 },
        hidden: { y: "-100%" },
      }}
      animate={isHidden ? "hidden" : "visible"}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className={cn(
        "fixed top-0 left-0 right-0 z-50 px-4 md:px-10 transition-colors duration-500 h-24 md:h-28",
        isSolid
          ? "bg-white/90 backdrop-blur-md shadow-sm py-3 border-b border-black/5"
          : "bg-transparent py-6",
      )}
    >
      <div className="flex items-center justify-between max-w-[1920px] mx-auto">
        {/* Left Actions (RTL: Right visually) */}
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm transition-colors",
              isSolid
                ? "text-text-dark bg-black/5 border-black/10"
                : "text-white bg-white/10 border-white/20",
            )}
          >
            <Globe className="w-4 h-4" />
            <span>عربي / EGP</span>
            <span className="mx-1 opacity-30">|</span>
            <Sun
              className={cn(
                "w-4 h-4",
                isSolid ? "text-orange-500" : "text-yellow-400",
              )}
            />
            <span>20.8°C</span>
          </div>
        </div>

        {/* Center Logo & Nav */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
          <Link href="/" className="mb-4 group">
            <Image
              src="/logo-transparent.png"
              alt="Duck Entertainment"
              width={0}
              height={0}
              sizes="100vw"
              className={cn(
                "transition-all duration-500 w-16",
                isSolid ? "" : "brightness-0 invert",
              )}
            />
          </Link>

          <div
            className={cn(
              "hidden lg:flex items-center gap-8 text-[15px] font-medium transition-colors duration-500",
              isSolid ? "text-text-body" : "text-white",
            )}
          >
            {["الخدمات", "المواقع", "التجارب", "من نحن"].map((item) => (
              <Link
                key={item}
                href="#"
                className="relative hover:text-duck-cyan-light transition-colors group"
              >
                {item}
                <span className="absolute -bottom-2 right-0 w-0 h-0.5 bg-duck-cyan transition-all group-hover:w-full" />
              </Link>
            ))}
          </div>
        </div>

        {/* Right Actions (RTL: Left visually) */}
        <div className="flex items-center gap-3">
          <button
            className={cn(
              "flex items-center gap-2 border rounded-full px-4 py-2 transition-colors",
              isSolid
                ? "text-text-dark border-black/20 hover:bg-black/5"
                : "text-white border-white/30 hover:bg-white/10",
            )}
          >
            <Map className="w-4 h-4" />
            <span>الخريطة</span>
          </button>
          <button
            className={cn(
              "flex items-center gap-2 border rounded-full px-4 py-2 transition-colors",
              isSolid
                ? "text-text-dark border-black/20 hover:bg-black/5"
                : "text-white border-white/30 hover:bg-white/10",
            )}
          >
            <User className="w-4 h-4" />
            <span>حسابي</span>
          </button>
          <button className="bg-duck-yellow text-duck-navy font-medium rounded-full px-6 py-2 hover:bg-duck-yellow-hover transition-colors">
            احجز
          </button>
        </div>
      </div>
    </motion.nav>
  )
}
