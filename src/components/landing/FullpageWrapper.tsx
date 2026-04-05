"use client"

import ReactFullpage from "@fullpage/react-fullpage"

interface FullpageWrapperProps {
  children: React.ReactNode
}

export default function FullpageWrapper({ children }: FullpageWrapperProps) {
  return (
    <ReactFullpage
      licenseKey=""
      scrollingSpeed={1000}
      css3={true}
      scrollOverflow={true}
      autoScrolling={true}
      fitToSection={true}
      touchSensitivity={3}
      bigSectionsDestination={"top"}
      afterLoad={(_origin, destination) => {
        window.dispatchEvent(
          new CustomEvent("fullpage:sectionchange", {
            detail: { index: destination.index },
          })
        )
      }}
      render={() => (
        <ReactFullpage.Wrapper>{children}</ReactFullpage.Wrapper>
      )}
    />
  )
}
