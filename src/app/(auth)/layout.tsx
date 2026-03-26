import Logo from "@/components/shared/logo"
import Link from "next/link"
import { getTranslations } from "next-intl/server"

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const t = await getTranslations("auth")
  return (
    <div className="grid h-svh overflow-hidden bg-off-white lg:grid-cols-2">
      <div className="absolute top-8 bg-white p-2 flex items-center justify-center rounded-b-2xl left-1/2 -translate-1/2 z-50 shadow-lg">
        <Link href="/" className="rounded-2xl bg-white p-1">
          <Logo className="text-duck-navy h-12 w-auto" />
        </Link>
      </div>
      <div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto p-6 md:p-10">
        <div className="flex flex-1 items-center justify-center py-2">
          <div className="w-full max-w-md">{children}</div>
        </div>

        <div className="text-center text-sm text-text-muted md:text-start">
          <p>{t("copyright", { year: new Date().getFullYear() })}</p>
        </div>
      </div>

      <div className="relative hidden h-full overflow-hidden lg:block">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "url('/kayak4.jpg'), url('/resort.webp')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            opacity: 0.14,
            backgroundImage: "url('/duck-wave.svg')",
            backgroundSize: "1200px auto",
            backgroundPosition: "center bottom",
            backgroundRepeat: "repeat-x",
          }}
        />
        <div className="absolute inset-0 bg-duck-navy/35" />
        <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-duck-cyan/20 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-duck-yellow/15 blur-3xl" />
      </div>
    </div>
  )
}
