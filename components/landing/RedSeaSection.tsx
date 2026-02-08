"use client"

import { motion } from "framer-motion"

export default function RedSeaSection() {
  return (
    <section className="fullpage-section relative flex items-center">
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
            "linear-gradient(to top, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.1) 50%, transparent 80%)",
        }}
      />

      <div className="relative z-20 w-full max-w-[1920px] mx-auto px-4 md:px-10 h-full flex items-center justify-between">
        {/* Right Content (Start) */}
        <div className="flex flex-col items-start text-white max-w-xl pt-20">
          {/* Logo Placeholder */}
          <div className="mb-6">
            <h2 className="text-3xl font-serif tracking-widest uppercase border-b-2 border-white/30 pb-2 inline-block">
              THE RED SEA
            </h2>
            <div className="text-xl text-right mt-1">البحر الأحمر</div>
          </div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-5xl md:text-6xl font-bold mb-4"
          >
            وجهة البحر الأحمر
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-lg md:text-xl text-white/90 mb-8 font-light"
          >
            وجهة الفخامة والتجارب الفريدة
          </motion.p>

          <motion.button
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="px-8 py-3 rounded-lg border-2 border-white text-white hover:bg-white/10 transition-colors"
          >
            اكتشف المزيد
          </motion.button>
        </div>

        {/* Left Content (End) - Promo Card */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="hidden md:flex flex-col w-[280px] bg-black/20 backdrop-blur-xl rounded-2xl p-4 border border-white/10 self-end mb-20 ml-10"
        >
          <div className="relative h-32 w-full mb-4 rounded-xl overflow-hidden bg-white/10">
            {/* Placeholder for FlyDubai image */}
            <div className="absolute inset-0 flex items-center justify-center text-white/50 text-xs">
              FlyDubai Image
            </div>
          </div>
          <p className="text-white text-center text-sm font-medium mb-2">
            احجز رحلتك على متن طيران فلاي دبي
          </p>
        </motion.div>
      </div>
    </section>
  )
}
