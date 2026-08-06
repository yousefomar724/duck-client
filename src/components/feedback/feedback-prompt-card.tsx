"use client"

import { useState } from "react"
import { MessageSquare } from "lucide-react"
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

interface FeedbackPromptCardProps {
  bookingRef?: string
  className?: string
}

export function FeedbackPromptCard({
  bookingRef,
  className,
}: FeedbackPromptCardProps) {
  const t = useTranslations("feedback")
  const isMobile = useIsMobile()
  const [open, setOpen] = useState(false)

  const form = (
    <FeedbackForm
      context="booking"
      bookingRef={bookingRef}
      onDone={() => setOpen(false)}
    />
  )

  return (
    <>
      <div
        className={cn(
          "rounded-2xl border border-duck-cyan/20 bg-off-white p-5 space-y-3",
          className,
        )}
      >
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-duck-cyan/10 text-duck-cyan">
            <MessageSquare className="size-5" aria-hidden />
          </span>
          <div className="space-y-1">
            <h3 className="font-semibold text-text-dark">{t("promptTitle")}</h3>
            <p className="text-sm text-text-muted">{t("promptBody")}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full rounded-full bg-duck-yellow text-duck-navy py-2.5 px-4 text-sm font-medium hover:bg-duck-yellow/80 transition-colors"
        >
          {t("promptCta")}
        </button>
      </div>

      {isMobile ? (
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent
            side="bottom"
            className="rounded-t-2xl max-h-[85vh] overflow-y-auto"
          >
            {form}
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="sr-only">{t("titleBooking")}</DialogTitle>
            </DialogHeader>
            {form}
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
