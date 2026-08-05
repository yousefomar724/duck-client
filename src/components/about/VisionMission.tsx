"use client"

import { motion } from "framer-motion"
import { Eye, Target } from "lucide-react"
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

export default function VisionMission() {
  const t = useTranslations("about")

  const cards = [
    { Icon: Eye, title: t("visionTitle"), body: t("visionBody") },
    { Icon: Target, title: t("missionTitle"), body: t("missionBody") },
  ]

  return (
    <section className="bg-white py-20 px-4 md:px-10">
      <div className="max-w-5xl mx-auto">
        <motion.div
          className="grid md:grid-cols-2 gap-6"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
        >
          {cards.map(({ Icon, title, body }) => (
            <motion.div
              key={title}
              variants={itemVariants}
              className={
                "rounded-2xl bg-off-white border border-black/5 shadow-sm p-8 " +
                "transition-all duration-300 ease-out hover:border-duck-cyan/25 hover:shadow-md hover:-translate-y-0.5"
              }
            >
              <div className="size-12 rounded-full bg-duck-cyan/10 text-duck-cyan flex items-center justify-center mb-5">
                <Icon className="size-6" aria-hidden="true" />
              </div>
              <h2 className="text-text-dark text-2xl font-bold mb-3">
                {title}
              </h2>
              <p className="text-text-body leading-relaxed">{body}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
