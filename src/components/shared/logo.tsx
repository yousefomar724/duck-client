import Image from "next/image"
import { cn } from "@/lib/utils"

interface LogoProps {
  variant?: "light" | "dark"
  width?: number
  height?: number
  className?: string
}

export default function Logo({
  variant = "light",
  width = 120,
  height = 60,
  className,
}: LogoProps) {
  return (
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
}
