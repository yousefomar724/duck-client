"use client"

import { useState, useCallback } from "react"
import ReactFullpage from "@fullpage/react-fullpage"
import Image from "next/image"

interface FullpageWrapperProps {
  children: React.ReactNode
}

export default function FullpageWrapper({ children }: FullpageWrapperProps) {
  const [ready, setReady] = useState(false)

  const handleAfterRender = useCallback(() => {
    setReady(true)
  }, [])

  return (
    <>
      <div
        className={`fixed inset-0 z-9999 flex flex-col items-center justify-center bg-white transition-opacity duration-700 ${ready ? "opacity-0 pointer-events-none" : "opacity-100"}`}
        aria-hidden={ready}
      >
        <Image
          src="/logo-transparent.png"
          alt="Duck Entertainment"
          width={160}
          height={56}
          priority
          className="animate-pulse"
        />
      </div>

      <ReactFullpage
        licenseKey="gplv3-license"
        credits={{ enabled: false }}
        scrollingSpeed={1000}
        css3={true}
        autoScrolling={true}
        scrollOverflow={true}
        fitToSection={true}
        touchSensitivity={3}
        bigSectionsDestination={"top"}
        afterRender={handleAfterRender}
        afterLoad={(_origin, destination) => {
          window.dispatchEvent(
            new CustomEvent("fullpage:sectionchange", {
              detail: { index: destination.index },
            }),
          )
        }}
        render={() => <ReactFullpage.Wrapper>{children}</ReactFullpage.Wrapper>}
      />
    </>
  )
}
