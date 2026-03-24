"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { ChevronDown } from "lucide-react"
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"
import { useTranslations } from "next-intl"

export default function FAQSection() {
  const t = useTranslations("faq")

  const faqs = Array.from({ length: 8 }, (_, i) => ({
    question: t(`q${i + 1}`),
    answer: t(`a${i + 1}`),
  }))

  const [openItem, setOpenItem] = useState<number | null>(null)

  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.07,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, ease: "easeOut" as const },
    },
  }

  return (
    <section id="faq" className="bg-off-white py-20 px-4 md:px-10">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <span className="text-duck-cyan text-base block mb-3">
            {t("subtitle")}
          </span>
          <h2 className="text-text-dark text-4xl md:text-5xl font-bold">
            {t("title")}
          </h2>
          <p className="text-text-body mt-4 max-w-xl mx-auto">
            {t("description")}
          </p>
        </div>

        {/* FAQ Items */}
        <motion.div
          className="flex flex-col gap-3"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
        >
          {faqs.map((faq, index) => {
            const isOpen = openItem === index
            return (
              <motion.div key={index} variants={itemVariants}>
                <Collapsible
                  open={isOpen}
                  onOpenChange={(open) => setOpenItem(open ? index : null)}
                >
                  <div
                    className={cn(
                      "bg-white rounded-2xl shadow-sm border border-transparent transition-all duration-200",
                      isOpen && "border-duck-cyan/20 shadow-md",
                    )}
                  >
                    <CollapsibleTrigger asChild>
                      <button className="w-full flex items-center justify-between gap-4 px-6 py-5 text-right cursor-pointer">
                        <span className="text-text-dark font-semibold text-base leading-snug">
                          {faq.question}
                        </span>
                        <ChevronDown
                          className={cn(
                            "w-5 h-5 text-duck-cyan shrink-0 transition-transform duration-300",
                            isOpen && "rotate-180",
                          )}
                        />
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="px-6 pb-5 text-text-body text-sm leading-relaxed border-t border-black/5 pt-4">
                        {faq.answer}
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}
