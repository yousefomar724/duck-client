import Image from "next/image"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface LogoProps {
  variant?: "light" | "dark"
  width?: number
  height?: number
  className?: string
  href?: string
}

export default function Logo({
  variant = "light",
  width = 120,
  height = 60,
  className,
  href,
}: LogoProps) {
  const image = (
    <Image
      src="/logo-transparent.png"
      alt="Duck Entertainment"
      width={width}
      height={height}
      className={cn(
        "transition-all duration-300",
        variant === "dark" && "brightness-0 invert",
        className,
      )}
    />
  )

  if (!href) return image

  return (
    <Link href={href} aria-label="Duck Entertainment">
      {image}
    </Link>
  )
}
