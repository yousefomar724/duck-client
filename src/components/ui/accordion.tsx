"use client"

import * as React from "react"
import { Accordion as AccordionPrimitive } from "radix-ui"
import { ChevronDownIcon } from "lucide-react"

import { cn } from "@/lib/utils"

function Accordion({
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Root>) {
  return <AccordionPrimitive.Root data-slot="accordion" {...props} />
}

function AccordionItem({
  className,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Item>) {
  return (
    <AccordionPrimitive.Item
      data-slot="accordion-item"
      className={cn("src:border-b src:last:border-b-0", className)}
      {...props}
    />
  )
}

function AccordionTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Trigger>) {
  return (
    <AccordionPrimitive.Header className="src:flex">
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        className={cn(
          "src:focus-visible:border-ring src:focus-visible:ring-ring/50 src:flex src:flex-1 src:items-start src:justify-between src:gap-4 src:rounded-md src:py-4 src:text-start src:text-sm src:font-medium src:transition-all src:outline-none src:hover:underline src:focus-visible:ring-[3px] src:disabled:pointer-events-none src:disabled:opacity-50 src:[&[data-state=open]>svg]:rotate-180",
          className,
        )}
        {...props}
      >
        {children}
        <ChevronDownIcon className="src:text-muted-foreground src:pointer-events-none src:size-4 src:shrink-0 src:translate-y-0.5 src:transition-transform src:duration-200" />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  )
}

function AccordionContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Content>) {
  return (
    <AccordionPrimitive.Content
      data-slot="accordion-content"
      className="src:data-[state=closed]:animate-accordion-up src:data-[state=open]:animate-accordion-down src:overflow-hidden src:text-sm"
      {...props}
    >
      <div className={cn("src:pt-0 src:pb-4", className)}>{children}</div>
    </AccordionPrimitive.Content>
  )
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
