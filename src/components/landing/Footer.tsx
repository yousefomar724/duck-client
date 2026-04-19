"use client"

import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"
import {
  ArrowUp,
  Mail,
  Phone,
  Instagram,
  Twitter,
  Facebook,
  MapPin,
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"

export default function Footer() {
  const t = useTranslations("footer")
  const scrollToTop = () => {
    if (typeof window !== "undefined" && (window as any).fullpage_api) {
      ;(window as any).fullpage_api.moveTo(1)
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  return (
    <footer className="bg-dark-bg text-white">
      {/* Newsletter Section */}
      <div className="py-4 px-4 md:px-10 border-b border-white/10">
        <div className="flex justify-center">
          <button
            onClick={scrollToTop}
            className="w-12 h-12 rounded-full border border-white/30 flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            <ArrowUp className="w-5 h-5" />
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
                  width={0}
                  height={0}
                  sizes="100vw"
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
              <a
                href="https://www.instagram.com/duck.asw/?hl=en"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Instagram className="w-5 h-5 text-white/80 hover:text-white cursor-pointer" />
              </a>
              <Twitter className="w-5 h-5 text-white/80 hover:text-white cursor-pointer" />
              <a
                href="https://www.facebook.com/duck.asw/?hl=en"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Facebook className="w-5 h-5 text-white/80 hover:text-white cursor-pointer" />
              </a>
            </div>
          </div>

          {/* Column 2: الشركة */}
          <div>
            <h4 className="text-base font-bold mb-6">{t("company")}</h4>
            <ul className="space-y-3 text-white/70 text-sm">
              {[
                t("aboutUs"),
                t("ourTeam"),
                t("safetyInfo"),
                t("bookingPolicy"),
              ].map((link) => (
                <li key={link}>
                  <a href="#" className="hover:text-white transition-colors">
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: الخدمات */}
          <div>
            <h4 className="text-base font-bold mb-6">{t("servicesTitle")}</h4>
            <ul className="space-y-3 text-white/70 text-sm">
              {[
                t("kayakTours"),
                t("sup"),
                t("waterBike"),
                t("privateTours"),
              ].map((link) => (
                <li key={link}>
                  <a href="#" className="hover:text-white transition-colors">
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: الدعم & Contact */}
          <div>
            <h4 className="text-base font-bold mb-6">{t("support")}</h4>
            <ul className="space-y-3 text-white/70 text-sm mb-3">
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  {t("faqLink")}
                </a>
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
                href="mailto:duck.aswan@gmail.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white hover:underline"
              >
                duck.aswan@gmail.com
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
                Aswan, Egypt, Elephantine Island
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Bottom */}
      <div className="bg-dark-bg-deeper py-6 px-4 md:px-10 border-t border-white/5">
        <div className="text-center text-sm text-white/50">
          {t("copyright", { year: new Date().getFullYear() })}
        </div>
      </div>
    </footer>
  )
}
