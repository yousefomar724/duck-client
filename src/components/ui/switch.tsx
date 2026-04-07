"use client"

import * as React from "react"
import { Switch as SwitchPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function Switch({
  className,
  size = "default",
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root> & {
  size?: "sm" | "default"
}) {
  const thumbClass =
    size === "sm"
      ? "src:size-3 src:data-[state=checked]:translate-x-2.5"
      : "src:size-4 src:data-[state=checked]:translate-x-3.5"

  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      dir="ltr"
      className={cn(
        "src:peer src:data-[state=checked]:bg-duck-yellow src:data-[state=unchecked]:bg-input src:focus-visible:border-ring src:focus-visible:ring-ring/50 src:dark:data-[state=unchecked]:bg-input/80 src:inline-flex src:shrink-0 src:items-center src:justify-start src:overflow-hidden src:rounded-full src:border src:border-transparent src:p-px src:shadow-xs src:transition-all src:outline-none src:focus-visible:ring-[3px] src:disabled:cursor-not-allowed src:disabled:opacity-50 src:data-[size=default]:h-[1.15rem] src:data-[size=default]:w-8 src:data-[size=sm]:h-3.5 src:data-[size=sm]:w-6",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "src:pointer-events-none src:block src:shrink-0 src:rounded-full src:bg-background src:shadow-sm src:ring-0 src:transition-transform src:data-[state=unchecked]:translate-x-0 src:dark:data-[state=unchecked]:bg-foreground src:dark:data-[state=checked]:bg-duck-navy",
          thumbClass,
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
