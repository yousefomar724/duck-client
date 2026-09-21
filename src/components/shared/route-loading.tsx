"use client"

import { useTranslations } from "next-intl"

export function RouteLoading() {
  const t = useTranslations("book")
  return (
    <section className="min-h-[70vh] bg-off-white px-5 pb-16 pt-32" role="status" aria-live="polite" aria-busy="true">
      <div className="mx-auto max-w-3xl space-y-6">
        <p className="text-center text-text-muted">{t("loading")}</p>
        <div aria-hidden="true" className="motion-safe:animate-pulse space-y-6">
          <div className="h-10 w-2/3 rounded-xl bg-black/10" />
          <div className="h-56 rounded-2xl bg-black/10" />
          <div className="h-5 w-full rounded bg-black/10" />
          <div className="h-5 w-3/4 rounded bg-black/10" />
        </div>
      </div>
    </section>
  )
}
