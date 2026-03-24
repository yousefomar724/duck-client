"use client"

import { useState } from "react"
import { useTranslations, useLocale } from "next-intl"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type SettingsDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function SettingsDialog({
  open,
  onOpenChange,
}: SettingsDialogProps) {
  const t = useTranslations("navbar")
  const locale = useLocale()
  const [language, setLanguage] = useState<string>(locale)

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) setLanguage(locale)
        onOpenChange(v)
      }}
    >
      <DialogContent
        showCloseButton
        dir={locale === "ar" ? "rtl" : "ltr"}
        className="sm:max-w-md text-right border-duck-cyan/20"
      >
        <DialogHeader className="border-b border-duck-cyan/30 pb-3">
          <DialogTitle className="text-xl font-bold text-right">
            {t("settings")}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-5 py-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="language" className="text-right">
              {t("language")}
            </Label>
            <Select
              dir={locale === "ar" ? "rtl" : "ltr"}
              value={language}
              onValueChange={(value) => setLanguage(value)}
            >
              <SelectTrigger
                id="language"
                className={cn(
                  "w-full justify-between rounded-lg border-2 transition-colors",
                  "focus-visible:border-duck-cyan focus-visible:ring-duck-cyan/30",
                )}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ar">{t("arabic")}</SelectItem>
                <SelectItem value="en">{t("english")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="currency" className="text-right">
              {t("currency")}
            </Label>
            <Input
              id="currency"
              readOnly
              disabled
              value="EGP"
              className={cn(
                "w-full rounded-lg border-2 bg-muted/50 cursor-not-allowed",
                "border-border text-muted-foreground",
              )}
            />
          </div>
        </div>

        <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end pt-2">
          <Button
            variant="outline"
            type="button"
            onClick={() => {
              setLanguage(locale)
              onOpenChange(false)
            }}
            className="rounded-lg border-2"
          >
            {t("cancel")}
          </Button>
          <Button
            type="button"
            onClick={() => {
              document.cookie = `locale=${language};path=/;max-age=31536000`
              onOpenChange(false)
              window.location.reload()
            }}
          >
            {t("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
