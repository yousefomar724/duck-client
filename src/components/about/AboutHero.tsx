"use client"

import { useTranslations } from "next-intl"

export default function AboutHero() {
  const t = useTranslations("about")

  return (
    <section className="bg-duck-navy pt-28 md:pt-44 pb-20 px-4 md:px-10 text-center">
      <div className="max-w-3xl mx-auto">
        <span className="text-duck-cyan text-base block mb-4">
          {t("heroSubtitle")}
        </span>
        <h1 className="text-white text-4xl md:text-6xl font-bold mb-5">
          {t("heroTitle")}
        </h1>
        <p className="text-white/70 text-base md:text-lg leading-relaxed">
          {t("heroDescription")}
        </p>
      </div>
    </section>
  )
}
