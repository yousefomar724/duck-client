"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { TourGuide } from "@/lib/types"

interface TourGuideSelectProps {
  value?: number
  guides: TourGuide[]
  disabled?: boolean
  onChange: (guideId: string) => void
}

export function TourGuideSelect({
  value,
  guides,
  disabled,
  onChange,
}: TourGuideSelectProps) {
  return (
    <div className="space-y-2">
      <Select
        dir="rtl"
        value={value?.toString() || "none"}
        onValueChange={onChange}
        disabled={disabled}
      >
        <SelectTrigger className="h-9 w-full max-w-[240px] text-xs">
          <SelectValue placeholder="اختر مرشد" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">بدون مرشد</SelectItem>
          {guides.map((g) => (
            <SelectItem key={g.ID} value={g.ID.toString()}>
              {g.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-amber-800" role="note">
        تنبيه: تعيين المرشد يُطبَّق على الرحلة بالكامل ويؤثر على جميع الحجوزات
        المرتبطة بها.
      </p>
    </div>
  )
}
