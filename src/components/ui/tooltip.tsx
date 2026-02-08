"use client"

import * as React from "react"
import { Tooltip as TooltipPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function TooltipProvider({
  delayDuration = 0,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delayDuration={delayDuration}
      {...props}
    />
  )
}

function Tooltip({
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Root>) {
  return <TooltipPrimitive.Root data-slot="tooltip" {...props} />
}

function TooltipTrigger({
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Trigger>) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />
}

function TooltipContent({
  className,
  sideOffset = 0,
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        className={cn(
          "src:bg-foreground src:text-background src:animate-in src:fade-in-0 src:zoom-in-95 src:data-[state=closed]:animate-out src:data-[state=closed]:fade-out-0 src:data-[state=closed]:zoom-out-95 src:data-[side=bottom]:slide-in-from-top-2 src:data-[side=left]:slide-in-from-right-2 src:data-[side=right]:slide-in-from-left-2 src:data-[side=top]:slide-in-from-bottom-2 src:z-50 src:w-fit src:origin-(--radix-tooltip-content-transform-origin) src:rounded-md src:px-3 src:py-1.5 src:text-xs src:text-balance",
          className,
        )}
        {...props}
      >
        {children}
        <TooltipPrimitive.Arrow className="src:bg-foreground src:fill-foreground src:z-50 src:size-2.5 src:translate-y-[calc(-50%_-_2px)] src:rotate-45 src:rounded-[2px]" />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  )
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
