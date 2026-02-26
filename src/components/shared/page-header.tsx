interface PageHeaderProps {
  title: string
  description?: string
  children?: React.ReactNode
}

export default function PageHeader({
  title,
  description,
  children,
}: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6 border-b pb-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-text-dark">{title}</h1>
        {description && (
          <p className="text-text-muted mt-2">{description}</p>
        )}
      </div>
      {children && <div className="flex items-center gap-3">{children}</div>}
    </div>
  )
}
