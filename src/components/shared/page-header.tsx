import { cn } from "@/lib/utils"

interface PageHeaderProps {
  title: string
  description?: string
  children?: React.ReactNode
  sticky?: boolean
  className?: string
}

export default function PageHeader({
  title,
  description,
  children,
  sticky = false,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6 border-b pb-4",
        sticky &&
          "sticky top-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 -mx-4 px-4 pt-2 sm:-mx-6 sm:px-6",
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="text-xl font-bold tracking-tight text-text-dark sm:text-2xl lg:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="text-text-muted mt-1.5 text-sm sm:text-base">
            {description}
          </p>
        )}
      </div>
      {children && (
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto [&>*]:flex-1 sm:[&>*]:flex-none">
          {children}
        </div>
      )}
    </div>
  )
}
