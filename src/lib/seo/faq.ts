import { getTranslations } from "next-intl/server"
import { FAQ_COUNT } from "./faq-count"

export { FAQ_COUNT }

export interface FaqEntry {
  question: string
  answer: string
}

export async function getFaqEntries(): Promise<FaqEntry[]> {
  const t = await getTranslations("faq")
  return Array.from({ length: FAQ_COUNT }, (_, i) => i + 1)
    .map((n) => ({ question: t(`q${n}`), answer: t(`a${n}`) }))
    .filter(({ question, answer }) => question && answer)
}

/**
 * FAQPage structured data. Google only shows FAQ rich results when the same
 * Q&A text is visible on the page, so callers must render these exact
 * entries — never a summarized or reworded version.
 */
export function buildFaqJsonLd(entries: FaqEntry[], pageUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${pageUrl}#faq`,
    mainEntity: entries.map(({ question, answer }) => ({
      "@type": "Question",
      name: question,
      acceptedAnswer: { "@type": "Answer", text: answer },
    })),
  }
}
