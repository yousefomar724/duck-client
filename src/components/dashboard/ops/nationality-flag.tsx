import { cn } from "@/lib/utils"
import {
  nationalityLabels,
  type NationalityKind,
} from "./ops-strings"

export function NationalityFlag({
  kind,
  className,
}: {
  kind: NationalityKind
  className?: string
}) {
  if (kind === "unknown") return null
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
        kind === "local" && "bg-duck-cyan/10 text-duck-cyan",
        kind === "foreign" && "bg-violet-100 text-violet-800",
        kind === "mixed" && "bg-amber-100 text-amber-900",
        className,
      )}
    >
      {nationalityLabels[kind]}
    </span>
  )
}
