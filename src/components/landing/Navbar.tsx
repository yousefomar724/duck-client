"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { User, Map, Globe, Sun, Menu } from "lucide-react"
import { cn } from "@/lib/utils"
import { motion, useScroll, useMotionValueEvent } from "framer-motion"
import { useTranslations } from "next-intl"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import SettingsDialog from "@/components/landing/SettingsDialog"
import { useAuth } from "@/lib/auth/auth-context"

export default function Navbar() {
  const [isHidden, setIsHidden] = useState(false)
  const [isSolid, setIsSolid] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const { scrollY } = useScroll()
  const t = useTranslations("navbar")
  const { isAuthenticated, user } = useAuth()

  useMotionValueEvent(scrollY, "change", (latest) => {
    const previous = scrollY.getPrevious() ?? 0
    const diff = latest - previous
    const isScrollingDown = diff > 0

    if (isScrollingDown && latest > 100) {
      setIsHidden(true)
    } else {
      setIsHidden(false)
    }

    const threshold = typeof window !== "undefined" ? window.innerHeight : 800
    setIsSolid(latest > threshold)
  })

  const navLinks = [
    { key: "services", href: "#" },
    { key: "locations", href: "#" },
    { key: "experiences", href: "#" },
    { key: "about", href: "#" },
  ] as const

  const actionButtonClass = cn(
    "flex items-center gap-2 border rounded-full px-4 py-2 transition-colors text-sm font-medium",
    isSolid
      ? "text-text-dark border-black/20 hover:bg-black/5"
      : "text-white border-white/30 hover:bg-white/10",
  )

  const linkClass = (isSheet = false) =>
    cn(
      "relative hover:text-duck-cyan-light transition-colors group",
      isSheet
        ? "text-foreground py-2 text-base"
        : "text-[15px] font-medium transition-colors duration-500",
      !isSheet && (isSolid ? "text-text-body" : "text-white"),
    )

  return (
    <>
      <motion.nav
        variants={{
          visible: { y: 0 },
          hidden: { y: "-100%" },
        }}
        animate={isHidden ? "hidden" : "visible"}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className={cn(
          "fixed top-0 left-0 right-0 z-50 px-4 md:px-10 transition-colors duration-500 h-24 md:h-28",
          isSolid
            ? "bg-white/90 backdrop-blur-md shadow-sm py-3 border-b border-black/5"
            : "bg-transparent py-6",
        )}
      >
        {/* Subtle black overlay */}
        <div
          className={cn(
            "absolute inset-0 z-0 pointer-events-none transition-opacity duration-500",
            isSolid
              ? "opacity-0"
              : "bg-linear-to-b from-black/50 via-black/20 to-transparent",
          )}
          aria-hidden
        />

        <div className="relative z-10 flex items-center justify-between gap-2 max-w-[1920px] mx-auto h-full">
          {/* Start: mobile = menu only; tablet/desktop = language + weather */}
          <div className="flex items-center gap-2 md:gap-3 min-w-0 w-10 md:w-auto justify-start">
            {/* Mobile only: menu trigger (hidden on tablet/desktop) */}
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "md:hidden! shrink-0 rounded-full w-10 h-10",
                    isSolid
                      ? "text-text-dark hover:bg-black/5"
                      : "text-white hover:bg-white/10",
                  )}
                  aria-label={t("settings")}
                >
                  <Menu className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="right"
                dir="ltr"
                className="w-full max-w-sm sm:max-w-sm flex flex-col text-start"
              >
                <SheetHeader dir="rtl" className="border-b border-border pb-4">
                  <SheetTitle className="sr-only">{t("settings")}</SheetTitle>
                  <Link
                    href="/"
                    onClick={() => setSheetOpen(false)}
                    className="inline-block"
                  >
                    <Image
                      src="/logo-transparent.png"
                      alt="Duck Entertainment"
                      width={120}
                      height={40}
                      className="object-contain max-h-10"
                    />
                  </Link>
                </SheetHeader>
                <nav dir="rtl" className="flex flex-col gap-1 p-6">
                  {navLinks.map(({ key, href }) => (
                    <Link
                      key={key}
                      href={href}
                      onClick={() => setSheetOpen(false)}
                      className={linkClass(true)}
                    >
                      {t(key)}
                      <span className="absolute -bottom-1 end-0 w-0 h-0.5 bg-duck-cyan transition-all group-hover:w-full" />
                    </Link>
                  ))}
                </nav>
                <div
                  dir="rtl"
                  className="flex flex-col gap-2 mt-auto p-4 border-t border-border"
                >
                  <Button
                    variant="outline"
                    className="justify-center rounded-full gap-2 cursor-pointer"
                    onClick={() => {
                      setSheetOpen(false)
                      setSettingsOpen(true)
                    }}
                  >
                    <Globe className="size-4" />
                    {t("language")} / EGP
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-center rounded-full gap-2"
                    asChild
                  >
                    <Link
                      href="/map"
                      className="cursor-pointer"
                      onClick={() => setSheetOpen(false)}
                    >
                      <Map className="size-4" />
                      {t("map")}
                    </Link>
                  </Button>
                  {isAuthenticated ? (
                    <>
                      <Button
                        variant="outline"
                        className="justify-center rounded-full gap-2"
                        asChild
                      >
                        <Link
                          href={
                            user?.role === 2
                              ? "/admin/dashboard"
                              : "/supplier/my-trips"
                          }
                          className="cursor-pointer"
                          onClick={() => setSheetOpen(false)}
                        >
                          <User className="size-4" />
                          لوحة التحكم
                        </Link>
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        className="rounded-full bg-duck-yellow text-duck-navy hover:bg-duck-yellow-hover font-medium"
                        asChild
                      >
                        <Link
                          href="/register"
                          className="cursor-pointer"
                          onClick={() => setSheetOpen(false)}
                        >
                          انضم كمزود خدمة
                        </Link>
                      </Button>
                    </>
                  )}
                  <Button
                    className="rounded-full bg-duck-cyan text-white hover:bg-duck-cyan-light font-medium"
                    asChild
                  >
                    <Link
                      href="#"
                      className="cursor-pointer"
                      onClick={() => setSheetOpen(false)}
                    >
                      {t("book")}
                    </Link>
                  </Button>
                </div>
              </SheetContent>
            </Sheet>

            {/* Tablet/desktop only: language + weather (in menu on mobile) */}
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className={cn(
                "hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm transition-colors cursor-pointer",
                isSolid
                  ? "text-text-dark bg-black/5 border-black/10 hover:bg-black/10"
                  : "text-white bg-white/10 border-white/20 hover:bg-white/20",
              )}
            >
              <Globe className="w-4 h-4 shrink-0" />
              <span className="truncate">{t("language")} / EGP</span>
            </button>
            <div
              className={cn(
                "hidden md:flex items-center gap-2 text-sm shrink-0",
                isSolid ? "text-text-dark" : "text-white",
              )}
            >
              <Sun
                className={cn(
                  "w-4 h-4",
                  isSolid ? "text-orange-500" : "text-yellow-400",
                )}
              />
              <span>{t("temperature")} 20.8°C</span>
            </div>
          </div>

          {/* Center: Logo (always) + nav links (tablet/desktop only) */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none md:pointer-events-auto">
            <Link href="/" className="mb-3 md:mb-4 group pointer-events-auto">
              <Image
                src="/logo-transparent.png"
                alt="Duck Entertainment"
                width={0}
                height={0}
                sizes="100vw"
                className={cn(
                  "transition-all duration-500 w-20 md:w-14 lg:w-16",
                  isSolid ? "" : "brightness-0 invert",
                )}
              />
            </Link>
            <div
              className={cn(
                "hidden md:flex items-center gap-6 lg:gap-8 font-medium transition-colors duration-500",
                isSolid ? "text-text-body" : "text-white",
              )}
            >
              {navLinks.map(({ key, href }) => (
                <Link key={key} href={href} className={linkClass(false)}>
                  {t(key)}
                  <span className="absolute -bottom-2 right-0 w-0 h-0.5 bg-duck-cyan transition-all group-hover:w-full" />
                </Link>
              ))}
            </div>
          </div>

          {/* End: tablet/desktop = map, account, book; mobile = spacer to keep logo centered */}
          <div className="flex items-center gap-2 md:gap-3 min-w-0 justify-end w-10 md:w-auto">
            <Link
              href="/map"
              className={cn("hidden! md:flex!", actionButtonClass)}
            >
              <Map className="w-4 h-4 shrink-0" />
              <span>{t("map")}</span>
            </Link>
            {isAuthenticated ? (
              <Link
                href={
                  user?.role === 2 ? "/admin/dashboard" : "/supplier/my-trips"
                }
                className={cn("hidden! md:flex!", actionButtonClass)}
              >
                <User className="w-4 h-4 shrink-0" />
                <span>لوحة التحكم</span>
              </Link>
            ) : (
              <Link
                href="/register"
                className="hidden! md:inline-flex! bg-duck-cyan text-white font-medium rounded-full px-4 py-2 lg:px-6 hover:bg-duck-cyan-light transition-colors shrink-0 text-sm"
              >
                انضم كمزود خدمة
              </Link>
            )}
            <Link
              href="/book"
              className="hidden! md:inline-flex! bg-duck-yellow text-duck-navy font-medium rounded-full px-4 py-2 lg:px-6 hover:bg-duck-yellow-hover transition-colors shrink-0 text-sm"
            >
              {t("book")}
            </Link>
            {/* Mobile: invisible spacer same width as menu button so logo stays centered */}
            <span
              className="w-10 h-10 md:hidden shrink-0 invisible pointer-events-none"
              aria-hidden
            />
          </div>
        </div>
      </motion.nav>

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  )
}
