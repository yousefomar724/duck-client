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

const faqs = [
  {
    question: "كيف يمكنني حجز رحلة مائية؟",
    answer:
      "يمكنك الحجز مباشرةً عبر موقعنا الإلكتروني بالضغط على زر «احجز الآن» واختيار الرحلة المناسبة وتاريخ الحجز. يتوفر فريق الدعم أيضاً على مدار الساعة عبر الهاتف أو البريد الإلكتروني لمساعدتك في إتمام عملية الحجز.",
  },
  {
    question: "هل تتوفر خصومات للمجموعات؟",
    answer:
      "نعم، نقدم خصومات خاصة للمجموعات المكونة من ٨ أشخاص فأكثر. يرجى التواصل معنا مباشرةً للحصول على عرض سعر مخصص يناسب حجم مجموعتك ومتطلباتها.",
  },
  {
    question: "ما هي سياسة الإلغاء والاسترداد؟",
    answer:
      "يمكنك إلغاء حجزك مجاناً حتى ٤٨ ساعة قبل موعد الرحلة. في حال الإلغاء خلال ٤٨ ساعة، يُطبَّق رسم إلغاء بنسبة ٥٠٪ من قيمة الحجز. أما في حالة عدم الحضور دون إشعار مسبق، فلا يُسترد المبلغ.",
  },
  {
    question: "ماذا يشمل سعر الباقة؟",
    answer:
      "تشمل الباقات الأساسية: المعدات والتجهيزات اللازمة، التأمين على الأنشطة، مرشد سياحي متخصص، ومياه الشرب طوال الرحلة. قد تتضمن بعض الباقات المميزة وجبات أو إقامة وفق ما هو محدد في التفاصيل.",
  },
  {
    question: "متى يكون أفضل وقت للزيارة؟",
    answer:
      "أفضل أوقات زيارة أسوان هي الفترة من أكتوبر حتى أبريل، إذ تكون درجات الحرارة معتدلة وملائمة للأنشطة المائية. يُنصح بتجنب أشهر الصيف (يونيو – أغسطس) بسبب ارتفاع درجات الحرارة.",
  },
  {
    question: "هل تتوفر أنشطة لمختلف المستويات؟",
    answer:
      "بالتأكيد! نوفر أنشطة تناسب جميع المستويات، من المبتدئين إلى المحترفين. يُقدَّم تدريب قصير قبل كل نشاط لضمان تجربة آمنة وممتعة لجميع المشاركين.",
  },
  {
    question: "ما هي طرق الدفع المتاحة؟",
    answer:
      "نقبل الدفع بالبطاقات الائتمانية (Visa، Mastercard)، والتحويل البنكي، والدفع النقدي عند الوصول. كما يتوفر خيار الدفع بالتقسيط لبعض الباقات الكبيرة.",
  },
  {
    question: "هل توفرون خدمات الإقامة والنقل؟",
    answer:
      "نعم، نقدم باقات متكاملة تشمل النقل من وإلى الفندق بالإضافة إلى خيارات إقامة متنوعة تتراوح بين المنتجعات الفاخرة والإقامات القريبة من النيل. تواصل معنا للاطلاع على الباقات المتاحة.",
  },
]

export default function FAQSection() {
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
            الأسئلة الشائعة
          </span>
          <h2 className="text-text-dark text-4xl md:text-5xl font-bold">
            كل ما تريد معرفته
          </h2>
          <p className="text-text-body mt-4 max-w-xl mx-auto">
            أجوبة واضحة على أكثر الأسئلة التي يطرحها ضيوفنا قبل رحلتهم
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
                      <button
                        className="w-full flex items-center justify-between gap-4 px-6 py-5 text-right cursor-pointer"
                        dir="rtl"
                      >
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
                      <div
                        className="px-6 pb-5 text-text-body text-sm leading-relaxed border-t border-black/5 pt-4"
                        dir="rtl"
                      >
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
