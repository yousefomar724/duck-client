import { z } from 'zod';
import { isValidObjectId } from '@/server/lib/object-id';

const objectId = z.string().refine(isValidObjectId, { message: 'Invalid ID' });

/** Both languages required — used for name/description, which every client always sends. */
const requiredLocalizedText = z.object({
  ar: z.string().trim().min(1, 'يجب إدخال النص بالعربي'),
  en: z.string().trim().min(1, 'يجب إدخال النص بالإنجليزي'),
});

/** Arabic required, English may be left blank — matches the trip form's cancellation policy fields. */
const cancelationPolicyText = z.object({
  ar: z.string().trim().min(1, 'يجب إدخال سياسة الإلغاء بالعربي'),
  en: z.string(),
});

/** Optional freeform localized fields (itinerary, availability, meeting point) — any strings, including empty. */
const looseLocalizedText = z.object({ ar: z.string(), en: z.string() });

const faqEntry = z.object({ q: looseLocalizedText, a: looseLocalizedText });

const isoDate = z
  .string()
  .refine((v) => !Number.isNaN(new Date(v).getTime()), { message: 'تاريخ غير صحيح' });

/** Validates the full body of `POST /api/v1/trips`. */
const tripBodySchema = z.object({
  supplier_id: objectId.optional(),
  is_tour: z.boolean().optional(),
  name: requiredLocalizedText,
  description: requiredLocalizedText,
  price: z.number().positive('السعر يجب أن يكون أكبر من صفر'),
  foreigner_price: z.number().min(0).optional(),
  guide_mandatory: z.boolean().optional(),
  guide_price: z.number().min(0).optional(),
  display_order: z.number().int().min(0).optional(),
  status: z.enum(['active', 'inactive']).optional(),
  public_status: z.enum(['available', 'coming-soon']).optional(),
  currency: z.string().min(1).optional(),
  destination: z.boolean().optional(),
  location: z.boolean().optional(),
  from: isoDate,
  to: isoDate.nullable().optional(),
  duration: z.number().int().min(0).optional(),
  activity_minutes: z.number().int().min(0).optional(),
  duration_text: looseLocalizedText.optional(),
  itinerary: looseLocalizedText.optional(),
  availability: looseLocalizedText.optional(),
  max_guests: z.number().int().min(1, 'يجب أن يكون شخصًا واحدًا على الأقل'),
  min_guests: z.number().int().min(1, 'يجب أن يكون شخصًا واحدًا على الأقل').optional(),
  images: z.unknown().optional(),
  cancelation_policy: cancelationPolicyText.optional(),
  meeting_point: looseLocalizedText.optional(),
  map_url: z.string().url().or(z.literal('')).optional(),
  faqs: z.array(faqEntry).optional(),
  hide_default_faqs: z.boolean().optional(),
  refundable: z.boolean().optional(),
  tour_guide_id: objectId.nullable().optional(),
  destination_ids: z.array(objectId).optional(),
});

export const createTripBodySchema = tripBodySchema.superRefine((body, ctx) => {
  if ((body.min_guests ?? 1) > body.max_guests) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['min_guests'],
      message: 'الحد الأدنى لا يمكن أن يتجاوز الحد الأقصى',
    });
  }
});

/** Validates the (partial) body of `PATCH /api/v1/trips/[id]`. */
export const updateTripBodySchema = tripBodySchema.partial().superRefine((body, ctx) => {
  if (
    body.min_guests !== undefined &&
    body.max_guests !== undefined &&
    body.min_guests > body.max_guests
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['min_guests'],
      message: 'الحد الأدنى لا يمكن أن يتجاوز الحد الأقصى',
    });
  }
});

/** Flattens a ZodError into `{ fieldPath: message }`, keyed by the top-level field name. */
export function flattenFieldErrors(error: z.ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? 'body');
    if (!fields[key]) fields[key] = issue.message;
  }
  return fields;
}
