"use client"

import type { ReactNode } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export interface DataCardField {
  label: string
  value: ReactNode
}

export interface DataCardItem {
  id: string
  title: ReactNode
  subtitle?: ReactNode
  badge?: ReactNode
  fields?: DataCardField[]
  footer?: ReactNode
  actions?: ReactNode
  onClick?: () => void
}

interface DataCardListProps {
  items: DataCardItem[]
  className?: string
}

export function DataCardList({ items, className }: DataCardListProps) {
  return (
    <div className={cn("space-y-3 md:hidden", className)}>
      {items.map((item) => (
        <Card
          key={item.id}
          className={cn(
            "overflow-hidden",
            item.onClick && "cursor-pointer hover:shadow-md transition-shadow",
          )}
          onClick={item.onClick}
        >
          <CardContent className="space-y-3 p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="font-semibold text-text-dark">{item.title}</div>
                {item.subtitle ? (
                  <div className="mt-0.5 text-sm text-text-muted">
                    {item.subtitle}
                  </div>
                ) : null}
              </div>
              {item.badge}
            </div>
            {item.fields && item.fields.length > 0 ? (
              <dl className="space-y-1.5 text-sm">
                {item.fields.map((field) => (
                  <div
                    key={field.label}
                    className="flex items-start justify-between gap-3"
                  >
                    <dt className="text-text-muted">{field.label}</dt>
                    <dd className="text-end font-medium text-text-dark">
                      {field.value}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : null}
            {(item.footer || item.actions) && (
              <div className="flex items-center justify-between gap-2 pt-1">
                <div className="min-w-0">{item.footer}</div>
                {item.actions ? (
                  <div
                    data-prevent-row-click
                    onClick={(e) => e.stopPropagation()}
                  >
                    {item.actions}
                  </div>
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
