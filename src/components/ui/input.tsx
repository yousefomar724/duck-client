import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "src:file:text-foreground src:placeholder:text-muted-foreground src:selection:bg-primary src:selection:text-primary-foreground src:dark:bg-input/30 src:border-input src:h-9 src:w-full src:min-w-0 src:rounded-md src:border src:bg-transparent src:px-3 src:py-1 src:text-base src:shadow-xs src:transition-[color,box-shadow] src:outline-none src:file:inline-flex src:file:h-7 src:file:border-0 src:file:bg-transparent src:file:text-sm src:file:font-medium src:disabled:pointer-events-none src:disabled:cursor-not-allowed src:disabled:opacity-50 src:md:text-sm",
        "src:focus-visible:border-ring src:focus-visible:ring-ring/50 src:focus-visible:ring-[3px]",
        "src:aria-invalid:ring-destructive/20 src:dark:aria-invalid:ring-destructive/40 src:aria-invalid:border-destructive",
        className,
      )}
      {...props}
    />
  )
}

export { Input }
