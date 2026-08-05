"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { useTranslations } from "next-intl"

const CONTENT_EASE_OPEN = [0.22, 1, 0.36, 1] as const

export default function OurPromise() {
  const t = useTranslations("about")

  return (
    <section className="bg-off-white py-20 px-4 md:px-10">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.4, ease: CONTENT_EASE_OPEN }}
          className="bg-duck-navy rounded-3xl p-10 md:p-14 text-center"
        >
          <span className="text-duck-cyan text-base block mb-4">
            {t("promiseTitle")}
          </span>
          <p className="text-white text-xl md:text-2xl font-semibold leading-relaxed mb-8">
            {t("promiseBody")}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/book"
              className="inline-flex items-center justify-center rounded-2xl bg-duck-yellow text-neutral-900 font-bold text-base md:text-lg px-8 py-3 shadow-md hover:bg-duck-yellow-hover transition-all duration-200"
            >
              {t("promiseCtaBook")}
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center rounded-2xl border-2 border-white/30 bg-transparent text-white font-semibold text-base md:text-lg px-8 py-3 hover:bg-white/10 transition-all duration-200"
            >
              {t("promiseCtaContact")}
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
