"use client"

import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"
import {
  ArrowUp,
  Mail,
  Phone,
  Instagram,
  Facebook,
  MapPin,
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"

type FullpageWindow = Window & {
  fullpage_api?: { moveTo: (sectionIndex: number) => void }
}

/** lucide-react has no TikTok glyph, so it ships inline. */
function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5 2.59 2.59 0 0 1 0-5.18c.27 0 .52.04.76.12v-3.2a5.8 5.8 0 0 0-.76-.05A5.72 5.72 0 0 0 4.14 15.3 5.72 5.72 0 0 0 9.86 21a5.72 5.72 0 0 0 5.72-5.72V9.01a7.35 7.35 0 0 0 4.28 1.37V7.3a4.28 4.28 0 0 1-3.26-1.48Z" />
    </svg>
  )
}

const SOCIAL_LINKS = [
  {
    key: "instagram",
    href: "https://www.instagram.com/duck.asw?igsh=d2Nwa2Nqb2t1bXVj&utm_source=qr",
    Icon: Instagram,
  },
  {
    key: "facebook",
    href: "https://www.facebook.com/share/1AyX9yr91p/?mibextid=wwXIfr",
    Icon: Facebook,
  },
  {
    key: "tiktok",
    href: "https://www.tiktok.com/@duckegy?_t=ZS-8yXR9sJsezl&_r=1",
    Icon: TikTokIcon,
  },
] as const

export default function Footer() {
  const t = useTranslations("footer")
  const scrollToTop = () => {
    if (typeof window === "undefined") return
    const w = window as FullpageWindow
    if (w.fullpage_api) {
      w.fullpage_api.moveTo(1)
    } else {
      w.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  return (
    <footer className="bg-dark-bg text-white">
      {/* Newsletter Section */}
      <div className="py-4 px-4 md:px-10 border-b border-white/10">
        <div className="flex justify-center">
          <button
            type="button"
            onClick={scrollToTop}
            aria-label={t("backToTop")}
            className="w-12 h-12 rounded-full border border-white/30 flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            <ArrowUp className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Main Footer Content */}
      <div className="py-16 px-4 md:px-10 max-w-[1920px] mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Column 1: Logo & Brand */}
          <div>
            <div className="mb-8">
              <Link href="/" className="mb-4 w-fit bg-white!">
                <Image
                  src="/logo-transparent.png"
                  alt="Duck Entertainment"
                  width={160}
                  height={160}
                  sizes="96px"
                  className={cn(
                    "transition-all duration-500 w-24 bg-white rounded-full h-24 object-contain p-4",
                    // "brightness-0 invert",
                  )}
                />
              </Link>
              <p className="text-white/80 text-sm mt-2">
                {t("brandDescription")}
              </p>
            </div>

            <div className="flex gap-4">
              {SOCIAL_LINKS.map(({ key, href, Icon }) => (
                <a
                  key={key}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={t(key)}
                >
                  <Icon
                    className="w-5 h-5 text-white/80 hover:text-white"
                    aria-hidden="true"
                  />
                </a>
              ))}
            </div>
          </div>

          {/* Column 2: الشركة */}
          <div>
            <h3 className="text-base font-bold mb-6">{t("company")}</h3>
            <ul className="space-y-3 text-white/70 text-sm">
              {[
                { label: t("aboutUs"), href: "/about" },
                { label: t("ourTeam"), href: "#" },
                { label: t("safetyInfo"), href: "#" },
                { label: t("bookingPolicy"), href: "#" },
              ].map(({ label, href }) =>
                href === "#" ? (
                  <li key={label}>
                    <a href="#" className="hover:text-white transition-colors">
                      {label}
                    </a>
                  </li>
                ) : (
                  <li key={label}>
                    <Link
                      href={href}
                      className="hover:text-white transition-colors"
                    >
                      {label}
                    </Link>
                  </li>
                ),
              )}
            </ul>
          </div>

          {/* Column 3: الخدمات */}
          <div>
            <h3 className="text-base font-bold mb-6">{t("servicesTitle")}</h3>
            <ul className="space-y-3 text-white/70 text-sm">
              {[
                t("kayakTours"),
                t("sup"),
                t("waterBike"),
                t("privateTours"),
              ].map((link) => (
                <li key={link}>
                  <Link href="/trips" className="hover:text-white transition-colors">
                    {link}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/destinations"
                  className="hover:text-white transition-colors"
                >
                  {t("destinationsLink")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: الدعم & Contact */}
          <div>
            <h3 className="text-base font-bold mb-6">{t("support")}</h3>
            <ul className="space-y-3 text-white/70 text-sm mb-3">
              <li>
                <Link href="/faq" className="hover:text-white transition-colors">
                  {t("faqLink")}
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="hover:text-white transition-colors"
                >
                  {t("contactUs")}
                </Link>
              </li>
            </ul>

            <a
              href="tel:+201550061006"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 mb-2 text-sm"
            >
              <Phone className="w-4 h-4 text-white/60" />
              <span dir="ltr" className="hover:text-white hover:underline">
                +201550061006
              </span>
            </a>
            <div className="grid grid-cols-[auto_1fr] items-center gap-3 mb-2 text-sm">
              <Mail className="w-4 h-4 text-white/60" />
              <a
                href="mailto:duck.asw@gmail.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white hover:underline"
              >
                duck.asw@gmail.com
              </a>
            </div>
            <div className="grid grid-cols-[auto_1fr] items-center gap-3 text-sm text-white/70">
              <MapPin className="w-4 h-4 text-white/60" />
              <a
                href="https://maps.app.goo.gl/FPt8JJ8VgaTTzBir6"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white hover:underline"
              >
                Aswan, Egypt
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Bottom */}
      <div className="bg-dark-bg-deeper py-6 px-4 md:px-10 border-t border-white/5">
        <div className="text-center text-sm text-white/50 space-y-1">
          <p>{t("copyright", { year: new Date().getFullYear() })}</p>
          <p>
            {t("poweredBy")}{" "}
            <a
              href="https://alefmenu.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/70 hover:text-white transition-colors"
            >
              Alef
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}
