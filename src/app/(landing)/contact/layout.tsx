import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"

/** The page itself is a client component, so metadata lives here. */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("contact.metadata")
  return {
    title: t("title"),
    description: t("description"),
    alternates: { canonical: "/contact" },
    openGraph: {
      title: t("title"),
      description: t("description"),
      url: "/contact",
    },
  }
}

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
