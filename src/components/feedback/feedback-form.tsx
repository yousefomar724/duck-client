"use client"

import { useCallback, useEffect, useState } from "react"
import { Star } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { createFeedback } from "@/lib/api/feedback"
import type { FeedbackContext } from "@/lib/types"

interface FeedbackFormProps {
  context?: FeedbackContext
  bookingRef?: string
  onDone?: () => void
  className?: string
}

export function FeedbackForm({
  context = "general",
  bookingRef,
  onDone,
  className,
}: FeedbackFormProps) {
  const t = useTranslations("feedback")
  const locale = useLocale()
  const pathname = usePathname()

  const [rating, setRating] = useState<number | null>(null)
  const [comment, setComment] = useState("")
  const [name, setName] = useState("")
  const [contact, setContact] = useState("")
  const [showContact, setShowContact] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const title =
    context === "booking" ? t("titleBooking") : t("titleGeneral")

  const handleRatingKeyDown = useCallback(
    (event: React.KeyboardEvent, current: number) => {
      if (event.key === "ArrowRight" || event.key === "ArrowUp") {
        event.preventDefault()
        setRating(Math.min(5, current + 1))
      } else if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
        event.preventDefault()
        setRating(Math.max(1, current - 1))
      }
    },
    [],
  )

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!rating) return

    setSubmitting(true)
    setError(null)

    const { error: apiError } = await createFeedback({
      rating,
      comment: comment.trim() || undefined,
      name: name.trim() || undefined,
      contact: contact.trim() || undefined,
      context,
      booking_ref: bookingRef,
      page: pathname,
      locale,
    })

    setSubmitting(false)

    if (apiError) {
      setError(apiError)
      return
    }

    setSubmitted(true)
  }

  useEffect(() => {
    if (!submitted) return
    const id = window.setTimeout(() => onDone?.(), 2200)
    return () => clearTimeout(id)
  }, [submitted, onDone])

  if (submitted) {
    return (
      <div className={cn("text-center py-6 space-y-2", className)}>
        <p className="text-lg font-semibold text-text-dark">{t("thankYou")}</p>
        <p className="text-sm text-text-muted">{t("thankYouBody")}</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className={cn("space-y-4 p-4 sm:p-0", className)}>
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-text-dark">{title}</h3>
        <p className="text-sm text-text-muted">{t("subtitle")}</p>
      </div>

      <div
        role="radiogroup"
        aria-label={t("ratingLabel")}
        className="flex items-center justify-center gap-2"
      >
        {[1, 2, 3, 4, 5].map((value) => {
          const selected = rating !== null && value <= rating
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={rating === value}
              aria-label={t("ratingOption", { value })}
              onClick={() => setRating(value)}
              onKeyDown={(e) => handleRatingKeyDown(e, value)}
              className={cn(
                "flex size-11 items-center justify-center rounded-full border transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-duck-cyan focus-visible:ring-offset-2",
                selected
                  ? "border-duck-yellow bg-duck-yellow/15 text-duck-yellow"
                  : "border-gray-200 bg-white text-gray-300 hover:border-duck-yellow/50 hover:text-duck-yellow/70",
              )}
            >
              <Star
                className={cn("size-6", selected && "fill-current")}
                aria-hidden
              />
            </button>
          )
        })}
      </div>

      {rating !== null && (
        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="space-y-2">
            <Label htmlFor="feedback-comment">{t("commentLabel")}</Label>
            <Textarea
              id="feedback-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={t("commentPlaceholder")}
              rows={3}
              maxLength={1000}
              className="resize-none"
            />
          </div>

          {!showContact ? (
            <button
              type="button"
              onClick={() => setShowContact(true)}
              className="text-sm text-duck-cyan hover:underline"
            >
              {t("addContact")}
            </button>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="feedback-name">{t("nameLabel")}</Label>
                <Input
                  id="feedback-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("namePlaceholder")}
                  maxLength={120}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="feedback-contact">{t("contactLabel")}</Label>
                <Input
                  id="feedback-contact"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder={t("contactPlaceholder")}
                  maxLength={200}
                />
              </div>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={submitting}
            className="w-full rounded-full bg-duck-yellow text-duck-navy hover:bg-duck-yellow/80"
          >
            {submitting ? t("submitting") : t("submit")}
          </Button>
        </div>
      )}
    </form>
  )
}
