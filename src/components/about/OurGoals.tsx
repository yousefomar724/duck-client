"use client"

import { motion } from "framer-motion"
import { CheckCircle2 } from "lucide-react"
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

export default function OurGoals() {
  const t = useTranslations("about")

  const goals = Array.from({ length: 6 }, (_, i) => t(`goal${i + 1}`))

  return (
    <section className="bg-duck-navy py-20 px-4 md:px-10">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <span className="text-duck-cyan text-base block mb-3">
            {t("goalsSubtitle")}
          </span>
          <h2 className="text-white text-4xl md:text-5xl font-bold">
            {t("goalsTitle")}
          </h2>
        </div>

        <motion.div
          className="grid sm:grid-cols-2 gap-4"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
        >
          {goals.map((goal, i) => (
            <motion.div
              key={i}
              variants={itemVariants}
              className="flex items-start gap-3 rounded-xl bg-white/5 border border-white/10 p-4"
            >
              <CheckCircle2
                className="size-5 shrink-0 mt-0.5 text-duck-yellow"
                aria-hidden="true"
              />
              <span className="text-white/85 leading-relaxed">{goal}</span>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
