import { cn } from "@/lib/utils"

interface PageHeaderProps {
  title: string
  description?: string
  children?: React.ReactNode
  className?: string
}

export default function PageHeader({
  title,
  description,
  children,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "mb-6 flex flex-col gap-4 border-b border-border pb-4 sm:flex-row sm:items-start sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="text-balance text-2xl font-bold tracking-tight text-text-dark sm:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="mt-2 text-sm text-text-muted sm:text-base">
            {description}
          </p>
        )}
      </div>
      {children && (
        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:gap-3">
          {children}
        </div>
      )}
    </div>
  )
}
