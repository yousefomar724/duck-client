import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "src:inline-flex src:items-center src:justify-center src:gap-2 src:whitespace-nowrap src:rounded-md src:text-sm src:font-medium src:transition-all src:disabled:pointer-events-none src:disabled:opacity-50 src:[&_svg]:pointer-events-none src:[&_svg:not([class*=size-])]:size-4 src:shrink-0 src:[&_svg]:shrink-0 src:outline-none src:focus-visible:border-ring src:focus-visible:ring-ring/50 src:focus-visible:ring-[3px] src:aria-invalid:ring-destructive/20 src:dark:aria-invalid:ring-destructive/40 src:aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "src:bg-duck-yellow src:text-duck-navy src:hover:bg-duck-yellow-hover",
        destructive:
          "src:bg-destructive src:text-white src:hover:bg-destructive/90 src:focus-visible:ring-destructive/20 src:dark:focus-visible:ring-destructive/40 src:dark:bg-destructive/60",
        outline:
          "src:border src:bg-background src:shadow-xs src:hover:bg-accent src:hover:text-accent-foreground src:dark:bg-input/30 src:dark:border-input src:dark:hover:bg-input/50",
        secondary:
          "src:bg-secondary src:text-secondary-foreground src:hover:bg-secondary/80",
        ghost:
          "src:hover:bg-accent src:hover:text-accent-foreground src:dark:hover:bg-accent/50",
        link: "src:text-primary src:underline-offset-4 src:hover:underline",
      },
      size: {
        default: "src:h-9 src:px-4 src:py-2 src:has-[>svg]:px-3",
        xs: "src:h-6 src:gap-1 src:rounded-md src:px-2 src:text-xs src:has-[>svg]:px-1.5 src:[&_svg:not([class*=size-])]:size-3",
        sm: "src:h-8 src:rounded-md src:gap-1.5 src:px-3 src:has-[>svg]:px-2.5",
        lg: "src:h-10 src:rounded-md src:px-6 src:has-[>svg]:px-4",
        icon: "src:size-9",
        "icon-xs":
          "src:size-6 src:rounded-md src:[&_svg:not([class*=size-])]:size-3",
        "icon-sm": "src:size-8",
        "icon-lg": "src:size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
