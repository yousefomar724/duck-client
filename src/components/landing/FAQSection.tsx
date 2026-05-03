"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { ChevronDown } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { buildWhatsAppHref } from "@/lib/support-contact"
import { useTranslations } from "next-intl"

const CONTENT_EASE_OPEN = [0.22, 1, 0.36, 1] as const
const CONTENT_EASE_CLOSE = [0.4, 0, 0.2, 1] as const

export default function FAQSection() {
  const t = useTranslations("faq")

  const faqs = Array.from({ length: 12 }, (_, i) => ({
    question: t(`q${i + 1}`),
    answer: t(`a${i + 1}`),
  }))

  const whatsappHref = buildWhatsAppHref(t("transportWhatsappPrefill"))

  const [openItem, setOpenItem] = useState<number | null>(null)

  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.05,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.35, ease: CONTENT_EASE_OPEN },
    },
  }

  return (
    <section id="faq" className="bg-off-white py-20 px-4 md:px-10">
      <div className="max-w-6xl mx-auto">
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

        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 items-start"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
        >
          {faqs.map((faq, index) => {
            const isOpen = openItem === index
            const panelId = `faq-panel-${index}`
            const triggerId = `faq-trigger-${index}`
            return (
              <motion.div key={index} variants={itemVariants} className="min-w-0">
                <div
                  className={cn(
                    "group rounded-2xl bg-white border shadow-sm overflow-hidden",
                    "transition-all duration-300 ease-out",
                    "hover:border-duck-cyan/25 hover:shadow-md hover:-translate-y-0.5",
                    isOpen
                      ? "border-duck-cyan/30 shadow-md ring-1 ring-duck-cyan/10 translate-y-0"
                      : "border-transparent",
                  )}
                >
                  <button
                    type="button"
                    id={triggerId}
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setOpenItem(isOpen ? null : index)}
                    className={cn(
                      "w-full flex items-center justify-between gap-4 px-5 py-4 md:px-6 md:py-5 text-start cursor-pointer",
                      "transition-colors duration-200",
                      "hover:bg-duck-cyan/5 active:bg-duck-cyan/10",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-duck-cyan/40 focus-visible:ring-offset-2 focus-visible:ring-offset-off-white",
                    )}
                  >
                    <span
                      className={cn(
                        "text-text-dark font-semibold text-base leading-snug transition-colors duration-200",
                        "group-hover:text-duck-cyan",
                        isOpen && "text-duck-cyan",
                      )}
                    >
                      {faq.question}
                    </span>
                    <ChevronDown
                      aria-hidden
                      className={cn(
                        "w-5 h-5 text-duck-cyan shrink-0 transition-transform duration-500 ease-[cubic-bezier(0.33,1,0.68,1)] will-change-transform",
                        isOpen && "rotate-180",
                      )}
                    />
                  </button>
                  <motion.div
                    id={panelId}
                    role="region"
                    aria-labelledby={triggerId}
                    initial={false}
                    animate={
                      isOpen
                        ? {
                            height: "auto",
                            opacity: 1,
                            transition: {
                              height: {
                                duration: 0.42,
                                ease: CONTENT_EASE_OPEN,
                              },
                              opacity: {
                                duration: 0.28,
                                delay: 0.06,
                                ease: "easeOut",
                              },
                            },
                          }
                        : {
                            height: 0,
                            opacity: 0,
                            transition: {
                              height: {
                                duration: 0.34,
                                ease: CONTENT_EASE_CLOSE,
                              },
                              opacity: {
                                duration: 0.18,
                                ease: "easeIn",
                              },
                            },
                          }
                    }
                    className="overflow-hidden border-t border-black/5"
                  >
                    <div className="px-5 pb-4 pt-3 md:px-6 md:pb-5 md:pt-4 text-text-body text-sm leading-relaxed whitespace-pre-line">
                      {faq.answer}
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            )
          })}
        </motion.div>

        <div className="mt-12 flex flex-col items-stretch sm:items-center gap-4">
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:justify-center">
            <Link
              href="/book"
              className="inline-flex items-center justify-center rounded-2xl bg-duck-yellow text-neutral-900 font-bold text-base md:text-lg px-8 py-3 shadow-md hover:bg-duck-yellow-hover transition-all duration-200"
            >
              {t("bookNow")}
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center rounded-2xl border-2 border-duck-cyan/40 bg-white text-text-dark font-semibold text-base md:text-lg px-8 py-3 shadow-sm hover:bg-duck-cyan/5 transition-all duration-200"
            >
              {t("contactUs")}
            </Link>
          </div>

          <Dialog>
            <DialogTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto rounded-2xl border-dashed border-duck-cyan/50"
              >
                {t("transportTrigger")}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{t("transportTitle")}</DialogTitle>
                <DialogDescription className="text-text-body">
                  {t("transportDescription")}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="w-full flex flex-col gap-2">
                <Button asChild variant="default" size="lg">
                  <a
                    href={whatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t("transportWhatsappCta")}
                  </a>
                </Button>
                <DialogClose asChild>
                  <Button type="button" variant="outline">
                    {t("transportClose")}
                  </Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </section>
  )
}
