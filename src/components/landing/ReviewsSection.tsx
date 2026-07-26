"use client"

import Script from "next/script"
import { useRef } from "react"
import { useTranslations } from "next-intl"
import { useInViewOnce } from "@/hooks/use-in-view-once"

// Elfsight Google Reviews widget. Manage layout, title, and review filtering
// from the Elfsight dashboard (https://elfsight.com) — this just mounts it.
const ELFSIGHT_WIDGET_CLASS =
  "elfsight-app-ceed83e4-0412-4878-85fa-b84ddc49b5a4"

export default function ReviewsSection() {
  const t = useTranslations("reviews")
  const sectionRef = useRef<HTMLElement>(null)
  // The widget is ~1 MB of script and ~860 ms of evaluation. fullPage.js keeps
  // every section mounted, so it would otherwise load on every page view.
  const inView = useInViewOnce(sectionRef, { rootMargin: 300 })

  return (
    <section
      ref={sectionRef}
      id="reviews"
      className="bg-white py-20 overflow-hidden"
    >
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

      {/* The observer above is the lazy gate, so this loads eagerly once mounted.
          `lazyOnload` would never fire here — it waits on a window load event
          that has already happened by the time the section scrolls into view. */}
      {inView && (
        <Script
          src="https://elfsightcdn.com/platform.js"
          strategy="afterInteractive"
        />
      )}
    </section>
  )
}
