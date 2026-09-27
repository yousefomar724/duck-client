"use client"

import dynamic from "next/dynamic"

/**
 * three.js and the game only load on /play, client-side — nothing here
 * touches the landing page bundle.
 */
const GameApp = dynamic(() => import("./GameApp"), {
  ssr: false,
  loading: () => <div className="fixed inset-0 bg-[#121528]" />,
})

export function GameLoader() {
  return <GameApp />
}
