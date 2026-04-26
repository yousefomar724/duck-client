"use client"

import Link from "next/link"
import Image from "next/image"
import { ArrowRight, Compass } from "lucide-react"
import { motion } from "framer-motion"
import { useTranslations } from "next-intl"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  const t = useTranslations("notFound")
  const code = t("code")
  const digits = code.split("")

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 bg-linear-to-br from-duck-cyan/5 to-duck-yellow/5 overflow-hidden">
      <div
        className="absolute inset-x-0 bottom-0 z-0 pointer-events-none select-none"
        aria-hidden
      >
        <Image
          src="/duck-wave.svg"
          alt=""
          width={1200}
          height={200}
          className="w-full h-auto object-cover object-bottom opacity-20"
        />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <Card className="border-duck-cyan/30 bg-white shadow-xl">
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center">
              <Compass className="w-12 h-12 text-duck-cyan" aria-hidden />
            </div>
            <div
              className="flex items-end justify-center gap-0.5 sm:gap-1"
              role="img"
              aria-label={t("code")}
            >
              {digits.map((char, i) =>
                char === "0" ? (
                  <motion.div
                    key={i}
                    className="inline-flex items-end justify-center -mb-1"
                    aria-hidden
                    animate={{ y: [0, -10, 0] }}
                    transition={{
                      duration: 2.2,
                      repeat: Number.POSITIVE_INFINITY,
                      ease: "easeInOut",
                    }}
                  >
                    <Image
                      src="/duck.png"
                      alt=""
                      width={96}
                      height={96}
                      className="h-16 w-16 sm:h-20 sm:w-20 md:h-24 md:w-24 object-contain"
                    />
                  </motion.div>
                ) : (
                  <span
                    key={i}
                    className="text-6xl sm:text-7xl md:text-8xl font-bold text-duck-navy leading-none"
                  >
                    {char}
                  </span>
                ),
              )}
            </div>
            <CardTitle className="text-2xl md:text-3xl text-duck-navy pt-1">
              {t("title")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center space-y-2">
              <p className="text-text-dark font-medium">{t("subtitle")}</p>
              <p className="text-text-body text-sm">{t("description")}</p>
            </div>

            <div className="space-y-3">
              <Button
                asChild
                className="w-full bg-duck-yellow text-duck-navy hover:bg-duck-yellow-hover font-medium rounded-full"
              >
                <Link href="/">
                  {t("backToHome")}
                  <ArrowRight className="w-4 h-4 ms-1 rtl:rotate-180" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="w-full border-duck-navy/30 text-duck-navy hover:bg-duck-navy/5 rounded-full"
              >
                <Link href="/#locations">
                  {t("exploreTrips")}
                  <ArrowRight className="w-4 h-4 ms-1 rtl:rotate-180" />
                </Link>
              </Button>
            </div>

            <div className="text-center space-y-2 text-xs text-text-muted border-t border-border pt-4">
              <p>{t("needHelp")}</p>
              <a
                href="https://wa.me/201550061006"
                target="_blank"
                rel="noopener noreferrer"
                className="text-duck-cyan hover:text-duck-cyan-light font-medium"
              >
                {t("contactWhatsApp")}
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
