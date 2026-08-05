"use client"

import { motion } from "framer-motion"
import {
  Zap,
  ShieldCheck,
  Waves,
  BadgeDollarSign,
  Headset,
  LayoutGrid,
} from "lucide-react"
import { useTranslations } from "next-intl"

const CONTENT_EASE_OPEN = [0.22, 1, 0.36, 1] as const

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: CONTENT_EASE_OPEN },
  },
}

const WHY_ICONS = [Zap, ShieldCheck, Waves, BadgeDollarSign, Headset, LayoutGrid]

export default function WhyDuck() {
  const t = useTranslations("about")

  const points = WHY_ICONS.map((Icon, i) => ({
    Icon,
    body: t(`why${i + 1}`),
  }))

  return (
    <section className="bg-white py-20 px-4 md:px-10">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <span className="text-duck-cyan text-base block mb-3">
            {t("whySubtitle")}
          </span>
          <h2 className="text-text-dark text-4xl md:text-5xl font-bold">
            {t("whyTitle")}
          </h2>
        </div>

        <motion.div
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
        >
          {points.map(({ Icon, body }, i) => (
            <motion.div
              key={i}
              variants={itemVariants}
              className={
                "flex items-center gap-4 rounded-2xl bg-off-white border border-transparent shadow-sm p-5 " +
                "transition-all duration-300 ease-out hover:border-duck-cyan/25 hover:shadow-md hover:-translate-y-0.5"
              }
            >
              <div className="size-11 shrink-0 rounded-full bg-duck-cyan/10 text-duck-cyan flex items-center justify-center">
                <Icon className="size-5" aria-hidden="true" />
              </div>
              <p className="text-text-dark font-medium leading-snug">
                {body}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
