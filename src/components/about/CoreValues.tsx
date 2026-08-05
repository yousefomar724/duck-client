"use client"

import { motion } from "framer-motion"
import { LifeBuoy, Waves, Sparkles, Handshake, Rocket } from "lucide-react"
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

const VALUE_ICONS = [LifeBuoy, Waves, Sparkles, Handshake, Rocket]

export default function CoreValues() {
  const t = useTranslations("about")

  const values = VALUE_ICONS.map((Icon, i) => ({
    Icon,
    title: t(`value${i + 1}Title`),
    body: t(`value${i + 1}Body`),
  }))

  return (
    <section className="bg-off-white py-20 px-4 md:px-10">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <span className="text-duck-cyan text-base block mb-3">
            {t("valuesSubtitle")}
          </span>
          <h2 className="text-text-dark text-4xl md:text-5xl font-bold">
            {t("valuesTitle")}
          </h2>
        </div>

        <motion.div
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
        >
          {values.map(({ Icon, title, body }) => (
            <motion.div
              key={title}
              variants={itemVariants}
              className={
                "rounded-2xl bg-white border border-transparent shadow-sm p-6 " +
                "transition-all duration-300 ease-out hover:border-duck-cyan/25 hover:shadow-md hover:-translate-y-0.5"
              }
            >
              <div className="size-11 rounded-full bg-duck-cyan/10 text-duck-cyan flex items-center justify-center mb-4">
                <Icon className="size-5" aria-hidden="true" />
              </div>
              <h3 className="text-text-dark font-semibold text-lg mb-2">
                {title}
              </h3>
              <p className="text-text-body text-sm leading-relaxed">{body}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
