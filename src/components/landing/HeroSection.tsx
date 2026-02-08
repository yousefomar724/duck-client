"use client"

import { motion } from "framer-motion"
import Image from "next/image"
import { Search } from "lucide-react"

export default function HeroSection() {
  return (
    <section className="fullpage-section relative flex items-end justify-center pb-20">
      {/* Background Video */}
      <video
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 w-full h-full object-cover z-0"
      >
        <source src="/hero.mp4" type="video/mp4" />
      </video>

      {/* Overlay Gradient */}
      <div
        className="absolute inset-0 z-10 pointer-events-none"
        style={{
          background:
            "linear-gradient(to top, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.2) 40%, transparent 70%)",
        }}
      />

      {/* Content */}
      <div className="relative z-20 w-full max-w-[1920px] mx-auto px-4 md:px-10 h-full flex flex-col justify-end">
        <div className="flex items-end justify-between w-full pb-10">
          {/* Headline */}
          <div className="w-full md:w-auto">
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-white text-5xl md:text-7xl font-bold leading-[1.2] drop-shadow-lg max-w-2xl"
            >
              اصنع مغامرتك المائية <br /> اللا تُنسى
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="text-white/90 text-lg md:text-xl mt-4 max-w-2xl drop-shadow-md"
            >
              استمتع بنهر النيل الأسطوري في أسوان كما لم يحدث من قبل. تجديف
              بالكاياك، وستاند اب، واستكشف مع أفضل شركة رياضات مائية في مصر.
            </motion.p>
          </div>

          {/* Scroll Indicator (Center) */}
          <div className="flex flex-col items-center gap-2 mb-4 text-white absolute -bottom-20 left-1/2 -translate-x-1/2">
            <span className="text-sm font-medium">اكتشف المزيد</span>
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

      {/* Floating Search Button (Bottom End) */}
      <button className="fixed bottom-6 end-6 z-50 w-12 h-12 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 transition-all">
        <Search className="w-5 h-5" />
      </button>
    </section>
  )
}
