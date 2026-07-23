"use client"

import Script from "next/script"
import { useTranslations } from "next-intl"

// Elfsight Google Reviews widget. Manage layout, title, and review filtering
// from the Elfsight dashboard (https://elfsight.com) — this just mounts it.
const ELFSIGHT_WIDGET_CLASS =
  "elfsight-app-ceed83e4-0412-4878-85fa-b84ddc49b5a4"

export default function ReviewsSection() {
  const t = useTranslations("reviews")

  return (
    <section id="reviews" className="bg-white py-20 overflow-hidden">
      <div className="max-w-[1920px] mx-auto px-4 md:px-10">
        <div className="text-center mb-12">
          <span className="text-duck-cyan text-base block mb-3">
            {t("subtitle")}
          </span>
          <h2 className="text-text-dark text-4xl md:text-5xl font-bold">
            {t("title")}
          </h2>
          <p className="text-text-body mt-4 max-w-2xl mx-auto">
            {t("description")}
          </p>
        </div>

        <div className={ELFSIGHT_WIDGET_CLASS} data-elfsight-app-lazy />
      </div>

      <Script
        src="https://elfsightcdn.com/platform.js"
        strategy="lazyOnload"
      />
    </section>
  )
}
