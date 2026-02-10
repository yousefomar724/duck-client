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
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(
        "src:peer src:data-[state=checked]:bg-duck-yellow src:data-[state=unchecked]:bg-input src:focus-visible:border-ring src:focus-visible:ring-ring/50 src:dark:data-[state=unchecked]:bg-input/80 src:group/switch src:inline-flex src:shrink-0 src:items-center src:rounded-full src:border src:border-transparent src:shadow-xs src:transition-all src:outline-none src:focus-visible:ring-[3px] src:disabled:cursor-not-allowed src:disabled:opacity-50 src:data-[size=default]:h-[1.15rem] src:data-[size=default]:w-8 src:data-[size=sm]:h-3.5 src:data-[size=sm]:w-6",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "src:bg-background src:dark:data-[state=unchecked]:bg-foreground src:dark:data-[state=checked]:bg-duck-navy src:pointer-events-none src:block src:rounded-full src:ring-0 src:transition-transform src:group-data-[size=default]/switch:size-4 src:group-data-[size=sm]/switch:size-3 src:data-[state=checked]:translate-x-[calc(100%-2px)] rtl:src:data-[state=checked]:-translate-x-[calc(100%-2px)] src:data-[state=unchecked]:translate-x-0 rtl:src:data-[state=unchecked]:translate-x-0",
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
