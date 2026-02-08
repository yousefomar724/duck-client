"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Tabs as TabsPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      orientation={orientation}
      className={cn(
        "src:group/tabs src:flex src:gap-2 src:data-[orientation=horizontal]:flex-col",
        className,
      )}
      {...props}
    />
  )
}

const tabsListVariants = cva(
  "src:rounded-lg src:p-[3px] src:group-data-[orientation=horizontal]/tabs:h-9 src:data-[variant=line]:rounded-none src:group/tabs-list src:text-muted-foreground src:inline-flex src:w-fit src:items-center src:justify-center src:group-data-[orientation=vertical]/tabs:h-fit src:group-data-[orientation=vertical]/tabs:flex-col",
  {
    variants: {
      variant: {
        default: "src:bg-muted",
        line: "src:gap-1 src:bg-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
)

function TabsList({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> &
  VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  )
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "src:focus-visible:border-ring src:focus-visible:ring-ring/50 src:focus-visible:outline-ring src:text-foreground/60 src:hover:text-foreground src:dark:text-muted-foreground src:dark:hover:text-foreground src:relative src:inline-flex src:h-[calc(100%-1px)] src:flex-1 src:items-center src:justify-center src:gap-1.5 src:rounded-md src:border src:border-transparent src:px-2 src:py-1 src:text-sm src:font-medium src:whitespace-nowrap src:transition-all src:group-data-[orientation=vertical]/tabs:w-full src:group-data-[orientation=vertical]/tabs:justify-start src:focus-visible:ring-[3px] src:focus-visible:outline-1 src:disabled:pointer-events-none src:disabled:opacity-50 src:group-data-[variant=default]/tabs-list:data-[state=active]:shadow-sm src:group-data-[variant=line]/tabs-list:data-[state=active]:shadow-none src:[&_svg]:pointer-events-none src:[&_svg]:shrink-0 src:[&_svg:not([class*=size-])]:size-4",
        "src:group-data-[variant=line]/tabs-list:bg-transparent src:group-data-[variant=line]/tabs-list:data-[state=active]:bg-transparent src:dark:group-data-[variant=line]/tabs-list:data-[state=active]:border-transparent src:dark:group-data-[variant=line]/tabs-list:data-[state=active]:bg-transparent",
        "src:data-[state=active]:bg-background src:dark:data-[state=active]:text-foreground src:dark:data-[state=active]:border-input src:dark:data-[state=active]:bg-input/30 src:data-[state=active]:text-foreground",
        "src:after:bg-foreground src:after:absolute src:after:opacity-0 src:after:transition-opacity src:group-data-[orientation=horizontal]/tabs:after:inset-x-0 src:group-data-[orientation=horizontal]/tabs:after:bottom-[-5px] src:group-data-[orientation=horizontal]/tabs:after:h-0.5 src:group-data-[orientation=vertical]/tabs:after:inset-y-0 src:group-data-[orientation=vertical]/tabs:after:-end-1 src:group-data-[orientation=vertical]/tabs:after:w-0.5 src:group-data-[variant=line]/tabs-list:data-[state=active]:after:opacity-100",
        className,
      )}
      {...props}
    />
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("src:flex-1 src:outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants }
