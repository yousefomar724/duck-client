"use client"

import { useState } from "react"
import { Check, Copy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface DetailFieldProps {
  label: string
  value: React.ReactNode
  mono?: boolean
  dir?: "ltr" | "rtl"
  copyable?: boolean
  className?: string
}

export function DetailField({
  label,
  value,
  mono = false,
  dir,
  copyable = false,
  className,
}: DetailFieldProps) {
  const [copied, setCopied] = useState(false)
  const textValue = typeof value === "string" ? value : null

  const handleCopy = async () => {
    if (!textValue || textValue === "—") return
    try {
      await navigator.clipboard.writeText(textValue)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* ignore */
    }
  }

  return (
    <div className={cn("space-y-0.5", className)}>
      <div className="text-xs text-text-muted">{label}</div>
      <div className="flex items-center gap-2">
        <div
          className={cn(
            "text-sm text-text-dark break-all",
            mono && "font-mono text-xs",
          )}
          dir={dir}
        >
          {value ?? "—"}
        </div>
        {copyable && textValue && textValue !== "—" && (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="shrink-0"
            onClick={handleCopy}
            aria-label={`نسخ ${label}`}
          >
            {copied ? (
              <Check className="size-3 text-green-600" />
            ) : (
              <Copy className="size-3" />
            )}
          </Button>
        )}
      </div>
    </div>
  )
}
