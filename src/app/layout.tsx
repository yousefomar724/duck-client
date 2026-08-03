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

/**
 * Origin serving destination/trip images — preconnecting saves ~300ms on LCP.
 *
 * Uploads go to Cloudinary (see src/server/lib/cloudinary.ts), so this is the
 * host worth warming. It used to derive from NEXT_PUBLIC_API_URL, falling back
 * to the old Go API host — but the API is same-origin now (that var is unset),
 * which made the hint a wasted DNS + TCP + TLS handshake to a host the page
 * never contacts.
 */
const IMAGE_ORIGIN = "https://res.cloudinary.com"

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

const SITE_DESCRIPTION =
  "Kayaking, stand-up paddleboarding and water bike trips on the Nile around Elephantine Island, Aswan. Book with Duck Entertainment."

/** Social/preview card. 1200x630 is the size Facebook, WhatsApp and X expect. */
const OG_IMAGE = {
  url: "/og-image.jpg",
  width: 1200,
  height: 630,
  alt: "Kayaking on the Nile at Elephantine Island, Aswan",
}

/**
 * Google has ignored <meta name="keywords"> since 2009, so this moves no
 * rankings there — it is kept only because Bing/Yandex still read it weakly
 * and it costs a few bytes. The terms that actually rank live in the title,
 * description, on-page headings and the JSON-LD in (landing)/layout.tsx.
 */
const KEYWORDS = [
  "kayaking in Aswan",
  "Aswan kayak tour",
  "Nile kayaking",
  "kayak Egypt",
  "Elephantine Island activities",
  "water sports Aswan",
  "stand up paddleboarding Aswan",
  "things to do in Aswan",
  "Nile river activities",
  "Aswan tours",
  "كاياك أسوان",
  "تأجير كاياك أسوان",
  "رحلات نيلية أسوان",
  "رياضات مائية أسوان",
  "جزيرة إلفنتين",
  "أنشطة أسوان",
]

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Kayaking & Water Sports in Aswan`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: KEYWORDS,
  applicationName: SITE_NAME,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: `${SITE_NAME} — Kayaking & Water Sports in Aswan`,
    description: SITE_DESCRIPTION,
    url: "/",
    locale: "en_US",
    alternateLocale: ["ar_EG"],
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — Kayaking & Water Sports in Aswan`,
    description: SITE_DESCRIPTION,
    images: [OG_IMAGE.url],
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
        <link rel="preconnect" href={IMAGE_ORIGIN} crossOrigin="anonymous" />
        <link rel="dns-prefetch" href={IMAGE_ORIGIN} />
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
