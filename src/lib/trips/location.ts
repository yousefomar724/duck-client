/**
 * Short "where is it" label for a trip badge: its destinations' names, or the
 * meeting point when no destination is linked. Empty when neither is set.
 */
export function tripLocationLabel(
  destinationNames: readonly (string | undefined | null)[],
  meetingPoint?: string | null,
  separator = "، ",
): string {
  const names = [
    ...new Set(destinationNames.map((n) => n?.trim()).filter(Boolean) as string[]),
  ]
  if (names.length > 0) return names.join(separator)
  return meetingPoint?.trim().split("\n")[0]?.trim() ?? ""
}
