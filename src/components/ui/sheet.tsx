"use client"

import * as React from "react"
import { XIcon } from "lucide-react"
import { Dialog as SheetPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function Sheet({ ...props }: React.ComponentProps<typeof SheetPrimitive.Root>) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />
}

function SheetTrigger({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Trigger>) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />
}

function SheetClose({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Close>) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />
}

function SheetPortal({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Portal>) {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />
}

function SheetOverlay({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Overlay>) {
  return (
    <SheetPrimitive.Overlay
      data-slot="sheet-overlay"
      className={cn(
        "src:data-[state=open]:animate-in src:data-[state=closed]:animate-out src:data-[state=closed]:fade-out-0 src:data-[state=open]:fade-in-0 src:fixed src:inset-0 src:z-50 src:bg-black/50",
        className,
      )}
      {...props}
    />
  )
}

function SheetContent({
  className,
  children,
  side = "right",
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content> & {
  side?: "top" | "right" | "bottom" | "left"
  showCloseButton?: boolean
}) {
  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Content
        dir={side === "left" ? "ltr" : "rtl"}
        data-slot="sheet-content"
        className={cn(
          "src:bg-background src:data-[state=open]:animate-in src:data-[state=closed]:animate-out src:fixed src:z-999 src:flex src:flex-col src:gap-4 src:shadow-lg src:transition src:ease-in-out src:data-[state=closed]:duration-300 src:data-[state=open]:duration-500",
          side === "right" &&
            "src:data-[state=closed]:slide-out-to-right src:data-[state=open]:slide-in-from-right src:inset-y-0 src:right-0 src:h-full src:w-3/4 src:border-s src:sm:max-w-sm",
          side === "left" &&
            "src:data-[state=closed]:slide-out-to-left src:data-[state=open]:slide-in-from-left src:inset-y-0 src:left-0 src:h-full src:w-3/4 src:border-e src:sm:max-w-sm",
          side === "top" &&
            "src:data-[state=closed]:slide-out-to-top src:data-[state=open]:slide-in-from-top src:inset-x-0 src:top-0 src:h-auto src:border-b",
          side === "bottom" &&
            "src:data-[state=closed]:slide-out-to-bottom src:data-[state=open]:slide-in-from-bottom src:inset-x-0 src:bottom-0 src:h-auto src:border-t",
          className,
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <SheetPrimitive.Close className="src:ring-offset-background src:focus:ring-ring src:data-[state=open]:bg-secondary src:absolute src:top-4 src:end-4 src:rounded-xs src:opacity-70 src:transition-opacity src:hover:opacity-100 src:focus:ring-2 src:focus:ring-offset-2 src:focus:outline-hidden src:disabled:pointer-events-none">
            <XIcon className="src:size-4" />
            <span className="src:sr-only">Close</span>
          </SheetPrimitive.Close>
        )}
      </SheetPrimitive.Content>
    </SheetPortal>
  )
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn("src:flex src:flex-col src:gap-1.5 src:p-4", className)}
      {...props}
    />
  )
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn(
        "src:mt-auto src:flex src:flex-col src:gap-2 src:p-4",
        className,
      )}
      {...props}
    />
  )
}

function SheetTitle({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn("src:text-foreground src:font-semibold", className)}
      {...props}
    />
  )
}

function SheetDescription({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Description>) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn("src:text-muted-foreground src:text-sm", className)}
      {...props}
    />
  )
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
}
