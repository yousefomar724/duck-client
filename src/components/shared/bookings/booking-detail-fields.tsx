interface DetailFieldProps {
  label: string
  children: React.ReactNode
  className?: string
  mono?: boolean
}

export function DetailField({
  label,
  children,
  className,
  mono = false,
}: DetailFieldProps) {
  return (
    <div className={className}>
      <div className="mb-0.5 text-xs text-text-muted">{label}</div>
      <div
        className={
          mono
            ? "dashboard-data-cell break-all font-mono text-sm"
            : "min-w-0 text-sm"
        }
      >
        {children}
      </div>
    </div>
  )
}

interface DetailSectionProps {
  title: string
  children: React.ReactNode
  actions?: React.ReactNode
}

export function DetailSection({ title, children, actions }: DetailSectionProps) {
  return (
    <section className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-sm font-semibold text-duck-navy">{title}</h3>
        {actions}
      </div>
      <div className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
        {children}
      </div>
    </section>
  )
}
