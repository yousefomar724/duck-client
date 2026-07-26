"use client"

import { Direction } from "radix-ui"

/**
 * Forces right-to-left for the admin and supplier dashboards.
 *
 * Their chrome is authored in Arabic and is not translated, so the panel reads
 * RTL no matter which locale the public site is set to. Without this, an English
 * visitor got an LTR document wrapped around RTL panel markup, which put the
 * sidebar and its reserved gap on opposite sides.
 *
 * The Radix DirectionProvider covers primitives that render through a portal
 * (dropdowns, selects, dialogs), which never inherit the wrapper's dir.
 */
export function RtlPanel({ children }: { children: React.ReactNode }) {
  return (
    <Direction.DirectionProvider dir="rtl">
      {children}
    </Direction.DirectionProvider>
  )
}
