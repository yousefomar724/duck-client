/* eslint-disable @next/next/no-img-element -- ImgWithLogoFallback is for arbitrary external URLs */
"use client"

import Image, { type ImageProps } from "next/image"
import { useState, type ComponentProps } from "react"
import { DUCK_LOGO_PLACEHOLDER } from "@/lib/image-utils"
import { cn } from "@/lib/utils"

export type ImageWithLogoFallbackProps = Omit<
  ImageProps,
  "src" | "alt" | "onError"
> & {
  src: string | null | undefined
  alt: string
  /** When the primary image is missing or fails to load. */
  fallbackClassName?: string
}

/**
 * Next/Image that shows the DUCK logo if `src` is empty or the request errors.
 *
 * Remote uploads deliberately go through the Next image optimizer: the backend
 * serves multi-megabyte originals with no cache headers, so resizing + AVIF/WebP
 * here is where most of the page weight savings come from. Callers can still opt
 * out per-image by passing `unoptimized`.
 */
export function ImageWithLogoFallback({
  src,
  alt,
  className,
  fallbackClassName,
  ...props
}: ImageWithLogoFallbackProps) {
  const [failed, setFailed] = useState(false)
  const showLogo = !src || failed
  const { fill, sizes, ...restProps } = props
  const fillSizes =
    fill && !sizes
      ? "(max-width: 768px) 90vw, min(560px, 45vw)"
      : sizes

  if (showLogo) {
    return (
      <Image
        {...restProps}
        fill={fill}
        sizes={fillSizes}
        src={DUCK_LOGO_PLACEHOLDER}
        alt={alt}
        className={cn("object-contain bg-gray-100 p-4", fallbackClassName)}
      />
    )
  }

  return (
    <Image
      {...restProps}
      fill={fill}
      sizes={fillSizes}
      src={src}
      alt={alt}
      className={className}
      onError={() => setFailed(true)}
    />
  )
}

export type ImgWithLogoFallbackProps = Omit<
  ComponentProps<"img">,
  "src" | "onError"
> & {
  src: string | null | undefined
  fallbackClassName?: string
}

/**
 * Native img with the same fallback behavior (e.g. external URLs not using next/image).
 */
export function ImgWithLogoFallback({
  src,
  alt,
  className,
  fallbackClassName,
  ...props
}: ImgWithLogoFallbackProps) {
  const [failed, setFailed] = useState(false)
  const showLogo = !src || failed

  if (showLogo) {
    return (
      <img
        {...props}
        src={DUCK_LOGO_PLACEHOLDER}
        alt={alt ?? ""}
        className={cn("object-contain bg-gray-100 p-4", fallbackClassName, className)}
      />
    )
  }

  return (
    <img
      {...props}
      src={src}
      alt={alt ?? ""}
      className={className}
      onError={() => setFailed(true)}
    />
  )
}
