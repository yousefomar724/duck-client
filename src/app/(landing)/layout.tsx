import Navbar from "@/components/landing/Navbar"
import { WhatsAppSupportFab } from "@/components/shared/whatsapp-support-fab"

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <Navbar />
      {children}
      <WhatsAppSupportFab />
    </>
  )
}
