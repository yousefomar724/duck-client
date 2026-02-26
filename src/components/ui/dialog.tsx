"use client"

import * as React from "react"
import { XIcon } from "lucide-react"
import { Dialog as DialogPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

function Dialog({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        "src:data-[state=open]:animate-in src:data-[state=closed]:animate-out src:data-[state=closed]:fade-out-0 src:data-[state=open]:fade-in-0 src:fixed src:inset-0 src:z-50 src:bg-black/50",
        className,
      )}
      {...props}
    />
  )
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean
}) {
  return (
    <DialogPortal data-slot="dialog-portal">
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          "src:bg-background src:data-[state=open]:animate-in src:data-[state=closed]:animate-out src:data-[state=closed]:fade-out-0 src:data-[state=open]:fade-in-0 src:data-[state=closed]:zoom-out-95 src:data-[state=open]:zoom-in-95 src:fixed src:top-[50%] src:start-[50%] src:z-50 src:grid src:w-full src:max-w-[calc(100%-2rem)] src:max-h-[85vh] src:overflow-y-auto src:translate-x-[-50%] rtl:src:translate-x-[50%] src:translate-y-[-50%] src:gap-4 src:rounded-lg src:border src:p-6 src:shadow-lg src:duration-200 src:outline-none src:sm:max-w-lg",
          className,
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            className="src:ring-offset-background src:focus:ring-ring src:data-[state=open]:bg-accent src:data-[state=open]:text-muted-foreground src:absolute src:top-4 src:end-4 src:rounded-xs src:opacity-70 src:transition-opacity src:hover:opacity-100 src:focus:ring-2 src:focus:ring-offset-2 src:focus:outline-hidden src:disabled:pointer-events-none src:[&_svg]:pointer-events-none src:[&_svg]:shrink-0 src:[&_svg:not([class*=size-])]:size-4"
          >
            <XIcon />
            <span className="src:sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn(
        "src:flex src:flex-col src:gap-2 src:text-center src:sm:text-start",
        className,
      )}
      {...props}
    />
  )
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  showCloseButton?: boolean
}) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "src:flex src:flex-col-reverse src:gap-2 src:sm:flex-row src:sm:justify-end",
        className,
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close asChild>
          <Button variant="outline">Close</Button>
        </DialogPrimitive.Close>
      )}
    </div>
  )
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn(
        "src:text-lg src:leading-none src:font-semibold",
        className,
      )}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("src:text-muted-foreground src:text-sm", className)}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
