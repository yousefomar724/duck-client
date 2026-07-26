"use client"

import ReactFullpage from "@fullpage/react-fullpage"

interface FullpageWrapperProps {
  children: React.ReactNode
}

/**
 * No loading overlay here on purpose: gating first paint on fullPage.js
 * hydration was costing FCP/LCP. The hero paints straight from server HTML and
 * fullPage.js takes over once it initializes.
 */
export default function FullpageWrapper({ children }: FullpageWrapperProps) {
  return (
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
      afterLoad={(_origin, destination) => {
        window.dispatchEvent(
          new CustomEvent("fullpage:sectionchange", {
            detail: { index: destination.index },
          }),
        )
      }}
      render={() => <ReactFullpage.Wrapper>{children}</ReactFullpage.Wrapper>}
    />
  )
}
