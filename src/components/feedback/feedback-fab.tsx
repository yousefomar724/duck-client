"use client"

import { useState } from "react"
import { MessageSquare } from "lucide-react"
import { usePathname } from "next/navigation"
import { useTranslations } from "next-intl"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { FeedbackForm } from "@/components/feedback/feedback-form"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"

export function FeedbackFab() {
  const t = useTranslations("feedback")
  const pathname = usePathname()
  const isMobile = useIsMobile()
  const [open, setOpen] = useState(false)

  if (pathname === "/map") return null

  const trigger = (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-label={t("fabAriaLabel")}
      className={cn(
        "fixed z-50 flex h-12 min-h-12 min-w-12 items-center justify-center rounded-full border border-duck-navy/15 bg-white/95 text-duck-navy shadow-[0_8px_30px_rgba(18,21,40,0.12)] backdrop-blur-sm",
        "bottom-[calc(max(1rem,env(safe-area-inset-bottom,0px))+3.75rem)]",
        "inset-e-[max(1rem,env(safe-area-inset-end,0px))]",
        "transition-[box-shadow,border-color] duration-200",
        "hover:border-duck-navy/25 hover:shadow-[0_10px_32px_rgba(18,21,40,0.16)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-duck-cyan focus-visible:ring-offset-2",
      )}
    >
      <MessageSquare className="size-5" aria-hidden />
    </button>
  )

  if (isMobile) {
    return (
      <>
        {trigger}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent
            side="bottom"
            className="rounded-t-2xl max-h-[85vh] overflow-y-auto"
          >
            <FeedbackForm context="general" onDone={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
      </>
    )
  }

  return (
    <>
      {trigger}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="sr-only">{t("titleGeneral")}</DialogTitle>
          </DialogHeader>
          <FeedbackForm context="general" onDone={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  )
}
