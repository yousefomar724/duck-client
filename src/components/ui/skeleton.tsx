import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "src:bg-accent src:animate-pulse src:rounded-md",
        className,
      )}
      {...props}
    />
  )
}

export { Skeleton }
