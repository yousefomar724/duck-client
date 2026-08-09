/**
 * Split from faq.ts (which imports next-intl/server) so client components
 * like FAQSection can import just the count without pulling in server-only
 * code.
 */
export const FAQ_COUNT = 12
