import Navbar from "@/components/landing/Navbar"
import ScrollManager from "@/components/ScrollManager"

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <ScrollManager />
      <Navbar />
      {children}
    </>
  )
}
