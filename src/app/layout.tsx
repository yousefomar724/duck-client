import type { Metadata } from "next"
import localFont from "next/font/local"
import "./globals.css"
import { NextIntlClientProvider } from "next-intl"
import { getLocale, getMessages } from "next-intl/server"
import { AuthProvider } from "@/lib/auth/auth-context"
import { ToastProvider } from "@/lib/toast/toast-context"
import { ToastContainer } from "@/components/shared/toast-container"

const fedraSerif = localFont({
  src: [
    {
      path: "../../public/fonts/FedraSerifArabicAR-Book.woff2",
      weight: "400",
      style: "normal",
    },
    // Adding other weights mapping to the same file as fallback since we only have Book
    {
      path: "../../public/fonts/FedraSerifArabicAR-Book.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../public/fonts/FedraSerifArabicAR-Book.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-fedra",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Duck Entertainment",
  description: "Duck Entertainment — Water Sports in Aswan",
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const locale = await getLocale()
  const messages = await getMessages()

  return (
    <html lang={locale} dir={locale === "ar" ? "rtl" : "ltr"} suppressHydrationWarning>
      <body
        className={`${fedraSerif.variable} font-serif antialiased`}
        suppressHydrationWarning
      >
        <ToastProvider>
          <AuthProvider>
            <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>
          </AuthProvider>
          <ToastContainer />
        </ToastProvider>
      </body>
    </html>
  )
}
