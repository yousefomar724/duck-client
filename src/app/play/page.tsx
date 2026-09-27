import type { Metadata, Viewport } from "next"
import { GameLoader } from "@/game/ui/GameLoader"

// Kept out of search results until the game is integrated into the landing page.
export const metadata: Metadata = {
  title: "Duckling Rescue",
  description: "Paddle a kayak around Elephantine Island in Aswan and rescue lost ducklings before sunset.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/play" },
}

export const viewport: Viewport = {
  themeColor: "#121528",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
}

export default function PlayPage() {
  return <GameLoader />
}
