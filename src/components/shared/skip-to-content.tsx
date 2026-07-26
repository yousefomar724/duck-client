"use client"

import { useTranslations } from "next-intl"

/**
 * First focusable element on the page — lets keyboard and screen reader users
 * jump past the navbar straight to the `<main>` landmark.
 */
export function SkipToContent() {
  const t = useTranslations("common")

  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:start-4 focus:z-[10000] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-text-dark focus:shadow-lg focus:outline-2 focus:outline-duck-cyan"
    >
      {t("skipToContent")}
    </a>
  )
}
