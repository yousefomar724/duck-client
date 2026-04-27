import Image from "next/image"
import { DUCK_LOGO_PLACEHOLDER } from "@/lib/image-utils"
import { cn } from "@/lib/utils"

type DuckLogoPlaceholderProps = {
  className?: string
  /** Extra classes for the full-bleed image (e.g. padding, object mode). */
  imageClassName?: string
}

/**
 * Centered DUCK logo on a neutral background for missing/empty media.
 */
export function DuckLogoPlaceholder({
  className,
  imageClassName,
}: DuckLogoPlaceholderProps) {
  return (
    <div
      className={cn("relative w-full h-full min-h-0 bg-gray-200", className)}
    >
      <Image
        src={DUCK_LOGO_PLACEHOLDER}
        alt=""
        fill
        className={cn("object-contain p-4", imageClassName)}
        sizes="(max-width: 768px) 100vw, 400px"
      />
    </div>
  )
}
