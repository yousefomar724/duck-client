"use client"

import { Minus, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface QuantityStepperProps {
  id?: string
  value: string
  onChange: (value: string) => void
  min?: number
  max?: number
  className?: string
}

export function QuantityStepper({
  id,
  value,
  onChange,
  min = 0,
  max,
  className,
}: QuantityStepperProps) {
  const numeric = Number.parseInt(value, 10)
  const current = Number.isFinite(numeric) ? numeric : min
  const clamp = (n: number) => {
    let next = Math.max(min, n)
    if (max != null) next = Math.min(max, next)
    return next
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Button
        type="button"
        variant="outline"
        className="size-11! shrink-0"
        aria-label="إنقاص"
        onClick={() => onChange(String(clamp(current - 1)))}
      >
        <Minus className="size-4" />
      </Button>
      <Input
        id={id}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        dir="ltr"
        className="h-11! flex-1 text-center"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <Button
        type="button"
        variant="outline"
        className="size-11! shrink-0"
        aria-label="زيادة"
        onClick={() => onChange(String(clamp(current + 1)))}
      >
        <Plus className="size-4" />
      </Button>
    </div>
  )
}
