"use client"

import { motion } from "framer-motion"

export default function RedSeaSection() {
  return (
    <section
      id="redsea-section"
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
          {/* Logo Placeholder */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold inline-block">
              Duck Entertainment
            </h2>
          </div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-5xl md:text-6xl font-bold mb-4"
          >
            لماذا تختارنا لمغامرتك المائية؟
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-lg md:text-xl text-white/90 mb-8 font-light"
          >
            استمتع بالنيل كما لم يحدث من قبل مع أفضل تجربة رياضات مائية في مصر.
            نحن لسنا مجرد مكان لممارسة الرياضات المائية. نحن محليون متحمسون نريد
            مشاركة السحر الذي يجمع النيل مع العالم.
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

        {/* Left Content (End) - Stats Card */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="hidden md:flex flex-col w-[280px] bg-black/20 backdrop-blur-xl rounded-2xl p-6 border border-white/10 self-end mb-20 ml-10"
        >
          <div className="grid grid-cols-2 gap-4 text-white text-center">
            <div>
              <div className="text-2xl font-bold">180</div>
              <div className="text-xs text-white/80">EGP يبدأ من</div>
            </div>
            <div>
              <div className="text-2xl font-bold">4</div>
              <div className="text-xs text-white/80">مواقع خلابة</div>
            </div>
            <div>
              <div className="text-2xl font-bold">4.9★</div>
              <div className="text-xs text-white/80">التقييم</div>
            </div>
            <div>
              <div className="text-2xl font-bold">5+</div>
              <div className="text-xs text-white/80">سنوات الخبرة</div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
