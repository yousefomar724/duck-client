"use client"

import * as React from "react"
import { Avatar as AvatarPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function Avatar({
  className,
  size = "default",
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Root> & {
  size?: "default" | "sm" | "lg"
}) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      data-size={size}
      className={cn(
        "src:group/avatar src:relative src:flex src:size-8 src:shrink-0 src:overflow-hidden src:rounded-full src:select-none src:data-[size=lg]:size-10 src:data-[size=sm]:size-6",
        className,
      )}
      {...props}
    />
  )
}

function AvatarImage({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Image>) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn("src:aspect-square src:size-full", className)}
      {...props}
    />
  )
}

function AvatarFallback({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Fallback>) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        "src:bg-muted src:text-muted-foreground src:flex src:size-full src:items-center src:justify-center src:rounded-full src:text-sm src:group-data-[size=sm]/avatar:text-xs",
        className,
      )}
      {...props}
    />
  )
}

function AvatarBadge({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="avatar-badge"
      className={cn(
        "src:bg-duck-yellow src:text-duck-navy src:ring-background src:absolute src:end-0 src:bottom-0 src:z-10 src:inline-flex src:items-center src:justify-center src:rounded-full src:ring-2 src:select-none",
        "src:group-data-[size=sm]/avatar:size-2 src:group-data-[size=sm]/avatar:[&>svg]:hidden",
        "src:group-data-[size=default]/avatar:size-2.5 src:group-data-[size=default]/avatar:[&>svg]:size-2",
        "src:group-data-[size=lg]/avatar:size-3 src:group-data-[size=lg]/avatar:[&>svg]:size-2",
        className,
      )}
      {...props}
    />
  )
}

function AvatarGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="avatar-group"
      className={cn(
        "src:*:data-[slot=avatar]:ring-background src:group/avatar-group src:flex src:-space-x-2 src:*:data-[slot=avatar]:ring-2",
        className,
      )}
      {...props}
    />
  )
}

function AvatarGroupCount({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="avatar-group-count"
      className={cn(
        "src:bg-muted src:text-muted-foreground src:ring-background src:relative src:flex src:size-8 src:shrink-0 src:items-center src:justify-center src:rounded-full src:text-sm src:ring-2 src:group-has-data-[size=lg]/avatar-group:size-10 src:group-has-data-[size=sm]/avatar-group:size-6 src:[&>svg]:size-4 src:group-has-data-[size=lg]/avatar-group:[&>svg]:size-5 src:group-has-data-[size=sm]/avatar-group:[&>svg]:size-3",
        className,
      )}
      {...props}
    />
  )
}

export {
  Avatar,
  AvatarImage,
  AvatarFallback,
  AvatarBadge,
  AvatarGroup,
  AvatarGroupCount,
}
