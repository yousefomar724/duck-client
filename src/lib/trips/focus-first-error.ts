/** Scrolls to and focuses the first field named in a react-hook-form `errors` object. */
export function focusFirstError(fieldNames: string[]) {
  const firstKey = fieldNames[0]
  if (!firstKey) return

  const el =
    document.querySelector<HTMLElement>(`[name="${firstKey}"]`) ??
    document.getElementById(firstKey)

  el?.scrollIntoView({ behavior: "smooth", block: "center" })
  el?.focus?.()
}
