"use client"

import { useTranslations } from "next-intl"
import { motion } from "framer-motion"
import Link from "next/link"

export default function HeroSection() {
  const t = useTranslations("hero")
  return (
    <section
      id="hero-section"
      className="relative flex items-end justify-center pb-10 md:pb-20 w-full h-full"
    >
      {/* Background Video */}
      <video
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none"
      >
        <source src="/videos/hero1.mp4" type="video/mp4" />
      </video>

      {/* Overlay Gradient */}
      <div
        className="absolute inset-0 z-10 pointer-events-none"
        style={{
          background:
            "linear-gradient(to top, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.2) 40%, transparent 70%)",
        }}
      />
      {/* Top dark band for navbar readability */}
      <div
        className="absolute inset-x-0 top-0 h-[120px] z-10 pointer-events-none"
        style={{
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, transparent 100%)",
        }}
      />

      {/* Content */}
      <div className="relative z-20 w-full max-w-[1920px] mx-auto px-4 md:px-10 h-full flex flex-col justify-end">
        <div className="flex items-end justify-between w-full pb-4 md:pb-10">
          {/* Headline */}
          <div className="w-full md:w-auto">
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-white text-5xl md:text-7xl font-bold leading-[1.2] drop-shadow-lg max-w-2xl"
            >
              {t("title")
                .split("\n")
                .map((line, i) => (
                  <span key={i}>
                    {line}
                    {i === 0 && <br />}
                  </span>
                ))}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="text-white/90 text-lg md:text-xl mt-4 max-w-2xl drop-shadow-md"
            >
              {t("description")}
            </motion.p>
            <div className="flex flex-col sm:flex-row gap-4 mt-8">
              <Link
                href="/book"
                className="inline-flex items-center justify-center rounded-2xl bg-duck-yellow text-neutral-900 font-bold text-xl px-10 py-3 shadow-xl hover:bg-duck-yellow-hover transition-all duration-200 drop-shadow-lg"
                passHref
              >
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.5 }}
                  className="w-full h-full flex items-center justify-center"
                >
                  {t("book")}
                </motion.div>
              </Link>
            </div>
          </div>

          {/* Scroll Indicator (Center) */}
          <div className="hidden md:flex flex-col items-center gap-2 mb-4 text-white absolute -bottom-20 left-1/2 -translate-x-1/2">
            <span className="text-sm font-medium">{t("discoverMore")}</span>
            <div className="w-6 h-10 border-2 border-white/50 rounded-full flex justify-center p-1">
              <motion.div
                animate={{ y: [0, 6, 0] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="w-1 h-2 bg-white rounded-full"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
