"use client"

import * as React from "react"
import { format } from "date-fns"
import { arSA } from "date-fns/locale"
import { arSA as arSADayPicker } from "react-day-picker/locale"
import { ChevronDownIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

export interface DateTimePickerProps {
  value: Date | undefined
  onChange: (date: Date | undefined) => void
  placeholder?: string
  required?: boolean
  id?: string
  className?: string
}

/** Format Date to HH:mm for input[type="time"] (24h). */
function toTimeInputValue(date: Date): string {
  return format(date, "HH:mm")
}

/** Parse HH:mm string and set time on a given date (same day). */
function setTimeOnDate(date: Date, timeStr: string): Date {
  const [hours, minutes] = timeStr.split(":").map(Number)
  const out = new Date(date)
  out.setHours(isNaN(hours) ? 0 : hours, isNaN(minutes) ? 0 : minutes, 0, 0)
  return out
}

export function DateTimePicker({
  value,
  onChange,
  placeholder = "اختر تاريخًا",
  required = false,
  id,
  className,
}: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false)
  const timeStr = value ? toTimeInputValue(value) : "00:00"

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) {
      onChange(undefined)
      setOpen(false)
      return
    }
    const withTime = value
      ? setTimeOnDate(date, toTimeInputValue(value))
      : setTimeOnDate(date, "00:00")
    onChange(withTime)
    setOpen(false)
  }

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextTime = e.target.value
    if (!nextTime) return
    const base = value ?? new Date()
    const next = setTimeOnDate(base, nextTime)
    onChange(next)
  }

  return (
    <div
      className={cn("flex flex-row items-end gap-2 flex-wrap", className)}
      dir="rtl"
    >
      <div className="flex-1 min-w-0 space-y-2">
        <Label htmlFor={id} className="sr-only">
          {placeholder}
        </Label>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              id={id}
              type="button"
              variant="outline"
              className={cn(
                "w-full justify-between font-normal text-right",
                !value && "text-muted-foreground",
              )}
              aria-required={required}
            >
              {value ? (
                format(value, "PPP", { locale: arSA })
              ) : (
                <span>{placeholder}</span>
              )}
              <ChevronDownIcon className="ms-2 size-4 shrink-0" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto overflow-hidden p-0" align="start" dir="rtl">
            <Calendar
              mode="single"
              selected={value}
              onSelect={handleDateSelect}
              defaultMonth={value}
              dir="rtl"
              locale={arSADayPicker}
            />
          </PopoverContent>
        </Popover>
      </div>
      <div className="w-32 shrink-0 space-y-2">
        <Label htmlFor={id ? `${id}-time` : undefined} className="sr-only">
          الوقت
        </Label>
        <Input
          type="time"
          id={id ? `${id}-time` : undefined}
          step="1"
          value={timeStr}
          onChange={handleTimeChange}
          className="bg-background [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
        />
      </div>
    </div>
  )
}
