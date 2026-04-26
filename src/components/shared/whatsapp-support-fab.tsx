"use client"

import { useTranslations } from "next-intl"
import { buildWhatsAppHref } from "@/lib/support-contact"
import { cn } from "@/lib/utils"

function WhatsappIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      aria-hidden
      focusable="false"
    >
      <path
        fill="currentColor"
        d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"
      />
    </svg>
  )
}

export function WhatsAppSupportFab() {
  const t = useTranslations("common")
  const href = buildWhatsAppHref(t("supportWhatsappPrefill"))

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t("supportWhatsappAriaLabel")}
      className={cn(
        "group fixed z-50 flex h-12 min-h-12 min-w-12 items-center gap-2 rounded-full border border-duck-cyan/40 bg-white/95 p-1 text-duck-navy shadow-[0_8px_30px_rgba(18,21,40,0.12)] backdrop-blur-sm",
        "bottom-[max(1rem,env(safe-area-inset-bottom,0px))]",
        "inset-e-[max(1rem,env(safe-area-inset-end,0px))]",
        "motion-reduce:transition-none",
        "motion-safe:transition-[transform,box-shadow,border-color] motion-safe:duration-320",
        "motion-safe:ease-[cubic-bezier(0.28,1.18,0.4,1)]",
        "motion-safe:hover:-translate-y-1.5 motion-safe:hover:scale-[1.04]",
        "motion-safe:hover:border-duck-cyan/65",
        "motion-safe:hover:shadow-[0_14px_36px_rgba(6,123,161,0.22)]",
        "motion-safe:active:translate-y-0 motion-safe:active:scale-[0.99]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-duck-cyan focus-visible:ring-offset-2",
      )}
    >
      <span
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#25D366] text-white",
          "motion-reduce:transition-none",
          "motion-safe:transition-transform motion-safe:duration-320 motion-safe:ease-[cubic-bezier(0.28,1.18,0.4,1)]",
          "motion-safe:group-hover:scale-110 motion-reduce:group-hover:scale-100",
        )}
        aria-hidden
      >
        <WhatsappIcon className="h-5 w-5" />
      </span>
    </a>
  )
}
