"use client"

import * as React from "react"
import { Label as LabelPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function Label({
  className,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        "src:flex src:items-center src:gap-2 src:text-sm src:leading-none src:font-medium src:select-none src:group-data-[disabled=true]:pointer-events-none src:group-data-[disabled=true]:opacity-50 src:peer-disabled:cursor-not-allowed src:peer-disabled:opacity-50",
        className,
      )}
      {...props}
    />
  )
}

export { Label }
