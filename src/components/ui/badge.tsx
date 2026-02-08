import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "src:inline-flex src:items-center src:justify-center src:rounded-full src:border src:border-transparent src:px-2 src:py-0.5 src:text-xs src:font-medium src:w-fit src:whitespace-nowrap src:shrink-0 src:[&>svg]:size-3 src:gap-1 src:[&>svg]:pointer-events-none src:focus-visible:border-ring src:focus-visible:ring-ring/50 src:focus-visible:ring-[3px] src:aria-invalid:ring-destructive/20 src:dark:aria-invalid:ring-destructive/40 src:aria-invalid:border-destructive src:transition-[color,box-shadow] src:overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "src:bg-primary src:text-primary-foreground src:[a&]:hover:bg-primary/90",
        secondary:
          "src:bg-secondary src:text-secondary-foreground src:[a&]:hover:bg-secondary/90",
        destructive:
          "src:bg-destructive src:text-white src:[a&]:hover:bg-destructive/90 src:focus-visible:ring-destructive/20 src:dark:focus-visible:ring-destructive/40 src:dark:bg-destructive/60",
        outline:
          "src:border-gray-300 src:text-foreground src:[a&]:hover:bg-accent src:[a&]:hover:text-accent-foreground",
        ghost: "src:[a&]:hover:bg-accent src:[a&]:hover:text-accent-foreground",
        link: "src:text-primary src:underline-offset-4 src:[a&]:hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
