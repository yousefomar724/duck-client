import type { Metadata } from "next"
import localFont from "next/font/local"
import "./globals.css"
import { NextIntlClientProvider } from "next-intl"
import { getLocale, getMessages } from "next-intl/server"
import { GoogleAnalytics } from "@next/third-parties/google"
import { ToastContainer } from "@/components/shared/toast-container"
import { AuthHydrator } from "@/lib/auth/auth-hydrator"
import { GoogleOAuthProviderWrapper } from "@/lib/auth/google-oauth-provider"
import { GA_MEASUREMENT_ID } from "@/lib/analytics"
import { SITE_NAME, SITE_URL } from "@/lib/site"

/** Origin serving destination/trip images — preconnecting saves ~300ms on LCP. */
const API_ORIGIN = (() => {
  try {
    return new URL(
      process.env.NEXT_PUBLIC_API_URL ?? "https://duckapi.alefmenu.com",
    ).origin
  } catch {
    return null
  }
})()

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

const SITE_DESCRIPTION = "Duck Entertainment — Water Sports in Aswan"

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: "/",
    images: [{ url: "/logo-transparent.png", width: 512, height: 512 }],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    images: ["/logo-transparent.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  // Next omits the meta tag entirely when GOOGLE_SITE_VERIFICATION is unset.
  verification: { google: process.env.GOOGLE_SITE_VERIFICATION },
  other: {
    "color-scheme": "light",
  },
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
      <head>
        {API_ORIGIN && (
          <>
            <link rel="preconnect" href={API_ORIGIN} />
            <link rel="dns-prefetch" href={API_ORIGIN} />
          </>
        )}
      </head>
      <body
        className={`${fedraSerif.variable} font-serif antialiased`}
        suppressHydrationWarning
      >
        <GoogleOAuthProviderWrapper>
          <AuthHydrator />
          <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>
          <ToastContainer />
        </GoogleOAuthProviderWrapper>
        {GA_MEASUREMENT_ID && <GoogleAnalytics gaId={GA_MEASUREMENT_ID} />}
      </body>
    </html>
  )
}
