"use client"

import { motion } from "framer-motion"
import { ArrowLeft } from "lucide-react"

export default function AmaalaSection() {
  return (
    <section
      id="amaala-section"
      className="fullpage-section relative flex items-center w-full h-full"
    >
      {/* Background Video */}
      <video
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 w-full h-full object-cover z-0"
      >
        <source src="/videos/hero3.mp4" type="video/mp4" />
      </video>

      {/* Overlay Gradient - bottom, warmer for Amaala */}
      <div
        className="absolute inset-0 z-10 pointer-events-none"
        style={{
          background:
            "linear-gradient(to top, rgba(50,20,0,0.4) 0%, rgba(50,20,0,0.1) 50%, transparent 80%)",
        }}
      />
      {/* Right-to-left gradient for text readability (darker on text side in RTL) */}
      <div
        className="absolute inset-0 z-10 pointer-events-none"
        style={{
          background:
            "linear-gradient(to left, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.12) 45%, transparent 75%)",
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

      <div className="section-content relative z-20 w-full max-w-[1920px] mx-auto px-4 md:px-10 h-full flex items-center justify-between">
        {/* Right Content (Start) */}
        <div className="flex flex-col items-start text-white max-w-xl pt-20">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-5xl md:text-6xl lg:text-7xl font-bold mb-4"
          >
            هُنا تبدأ رحلتك إلى وجهات استثنائية
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-lg md:text-xl text-white/90 mb-8 font-light"
          >
            من جولات الغروب الهادئة إلى المنحدرات المثيرة، لدينا المغامرة
            المثالية للاستشفاء والاسترخاء.
          </motion.p>

          <motion.button
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="px-8 py-3 rounded-lg border-2 border-white text-white hover:bg-white/10 transition-colors"
          >
            اكتشف خدماتنا
          </motion.button>
        </div>

        {/* Left Content (End) - Benefit Card */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="hidden md:flex flex-col w-[280px] bg-black/20 backdrop-blur-xl rounded-2xl p-4 border border-white/10 self-end mb-20 ml-10"
        >
          <div className="relative h-40 w-full mb-4 rounded-xl overflow-hidden bg-white/10">
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-4 text-center">
              <span className="text-lg font-bold mb-2">السلامة أولاً</span>
              <span className="text-xs text-white/80">
                جميع المعدات معتمدة ومُفحصة بانتظام. مرشدونا محترفون مدربون.
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between text-white">
            <span className="text-sm font-medium">اكتشف خدماتنا</span>
            <ArrowLeft className="w-4 h-4" />
          </div>
        </motion.div>
      </div>
    </section>
  )
}
