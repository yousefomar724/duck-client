import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"

/** The page itself is a client component, so metadata lives here. */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("book.metadata")
  return {
    title: t("title"),
    description: t("description"),
    alternates: { canonical: "/book" },
    openGraph: {
      title: t("title"),
      description: t("description"),
      url: "/book",
    },
  }
}

export default function BookLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
