import type { Metadata } from "next"
import localFont from "next/font/local"
import "./globals.css"

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
  title: "زوروا البحر الأحمر | Visit Red Sea",
  description: "Visit Red Sea — Landing Page",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body className={`${fedraSerif.variable} font-serif antialiased`}>
        {children}
      </body>
    </html>
  )
}
