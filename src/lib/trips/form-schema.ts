import { z } from "zod/v3"
import { currencies } from "@/lib/constants"

const CURRENCY_VALUES = currencies.map((c) => c.value) as [string, ...string[]]

export interface TripFormSchemaOptions {
  mode: "create" | "edit"
  requireSupplier: boolean
}

export function createTripFormSchema({ mode, requireSupplier }: TripFormSchemaOptions) {
  const baseSchema = z.object({
    name_ar: z.string().trim().min(2, "اسم الرحلة بالعربي مطلوب (حرفان على الأقل)"),
    name_en: z.string().trim().min(2, "اسم الرحلة بالإنجليزي مطلوب (حرفان على الأقل)"),
    description_ar: z.string().trim().min(10, "وصف الرحلة بالعربي مطلوب (10 أحرف على الأقل)"),
    description_en: z.string().trim().min(10, "وصف الرحلة بالإنجليزي مطلوب (10 أحرف على الأقل)"),
    destination_ids: z.array(z.string()).default([]),
    price: z.coerce
      .number({ invalid_type_error: "أدخل سعرًا صحيحًا" })
      .positive("السعر يجب أن يكون أكبر من صفر"),
    foreigner_price: z.coerce
      .number({ invalid_type_error: "أدخل سعرًا صحيحًا" })
      .min(0, "السعر لا يمكن أن يكون سالبًا")
      .default(0),
    guide_mandatory: z.boolean().default(false),
    guide_price: z.coerce
      .number({ invalid_type_error: "أدخل سعرًا صحيحًا" })
      .min(0, "السعر لا يمكن أن يكون سالبًا")
      .default(0),
    display_order: z.coerce
      .number({ invalid_type_error: "أدخل رقمًا صحيحًا" })
      .int("يجب أن يكون رقمًا صحيحًا")
      .min(0, "لا يمكن أن يكون سالبًا")
      .default(0),
    currency: z.enum(CURRENCY_VALUES, {
      errorMap: () => ({ message: "اختر عملة صحيحة" }),
    }),
    refundable: z.boolean().default(true),
    cancelation_policy_ar: z.string().trim().min(1, "سياسة الإلغاء بالعربي مطلوبة"),
    cancelation_policy_en: z.string().default(""),
    itinerary_ar: z.string().default(""),
    itinerary_en: z.string().default(""),
    availability_ar: z.string().default(""),
    availability_en: z.string().default(""),
    meeting_point_ar: z.string().default(""),
    meeting_point_en: z.string().default(""),
    map_url: z.union([z.string().url("رابط غير صحيح"), z.literal("")]).default(""),
    hide_default_faqs: z.boolean().default(false),
    faqs: z
      .array(
        z.object({
          q_ar: z.string().trim().min(1, "السؤال بالعربي مطلوب"),
          q_en: z.string().default(""),
          a_ar: z.string().trim().min(1, "الإجابة بالعربي مطلوبة"),
          a_en: z.string().default(""),
        }),
      )
      .default([]),
    duration: z.coerce
      .number({ invalid_type_error: "أدخل مدة صحيحة" })
      .int("يجب أن تكون المدة رقمًا صحيحًا")
      .min(0, "لا يمكن أن تكون سالبة")
      .default(0),
    max_guests: z.coerce
      .number({ invalid_type_error: "أدخل عددًا صحيحًا" })
      .int("يجب أن يكون رقمًا صحيحًا")
      .min(1, "يجب أن يكون شخصًا واحدًا على الأقل"),
    supplier_id: z.string().default(""),
    is_tour: z.boolean().default(true),
    tour_guide_id: z.string().default(""),
    from: z.date({ invalid_type_error: "تاريخ البدء غير صحيح" }).optional(),
    to: z.date({ invalid_type_error: "تاريخ الانتهاء غير صحيح" }).nullable().optional(),
  })

  return baseSchema.superRefine((data, ctx) => {
    if (!data.from) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "اختر تاريخ بدء الرحلة",
        path: ["from"],
      })
      return
    }

    if (data.to && data.to.getTime() <= data.from.getTime()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "تاريخ الانتهاء يجب أن يكون بعد تاريخ البدء",
        path: ["to"],
      })
    }

    if (!data.is_tour && data.duration < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "المدة يجب أن تكون ساعة واحدة على الأقل للرحلات",
        path: ["duration"],
      })
    }

    if (requireSupplier && !data.supplier_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "اختر المورد",
        path: ["supplier_id"],
      })
    }

    if (mode === "create" && data.from.getTime() < Date.now() - 60_000) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "تاريخ البدء يجب أن يكون في المستقبل",
        path: ["from"],
      })
    }
  })
}

/**
 * Raw field shape as the inputs write it. Numeric fields stay strings (so an
 * emptied input can show a placeholder instead of "0") — the schema's
 * `z.coerce.number()` converts them at validation/submit time. Written by
 * hand rather than derived via `z.input<>` because zod types a coerced
 * field's input as `unknown`, which would force casts in every render.
 */
export interface TripFormInput {
  name_ar: string
  name_en: string
  description_ar: string
  description_en: string
  destination_ids: string[]
  price: string
  foreigner_price: string
  guide_mandatory: boolean
  guide_price: string
  display_order: string
  currency: string
  refundable: boolean
  cancelation_policy_ar: string
  cancelation_policy_en: string
  itinerary_ar: string
  itinerary_en: string
  availability_ar: string
  availability_en: string
  meeting_point_ar: string
  meeting_point_en: string
  map_url: string
  hide_default_faqs: boolean
  faqs: { q_ar: string; q_en: string; a_ar: string; a_en: string }[]
  duration: string
  max_guests: string
  supplier_id: string
  is_tour: boolean
  tour_guide_id: string
  from: Date | undefined
  to: Date | undefined | null
}

/** Parsed/coerced shape handed to `onValid` after the resolver runs. */
export type TripFormValues = z.output<ReturnType<typeof createTripFormSchema>>
