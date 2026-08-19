import { z } from 'zod/v3';
import type { ResourceType } from '@/lib/types';
import {
  BOOKING_MAX_MINUTES,
  BOOKING_MIN_MINUTES,
} from '@/lib/booking/schedule';
import { EGYPT_MOBILE_LOCAL_REGEX } from '@/lib/booking/phone';

const RESOURCE_TYPES = ['kayak', 'water_cycle', 'sup'] as const satisfies readonly ResourceType[];

export interface BookingFormSchemaMessages {
  nameMin: string;
  phoneRequired: string;
  phoneMobileEgypt: string;
  dateRequired: string;
  dateInvalid: string;
  dateTimePast: string;
  bookingTimeRange: string;
  numberInvalid: string;
  minOneGuest: string;
  minOne: string;
  kidsMinOne: string;
  maxGuestsError: (max: number) => string;
  guestMixSumError: (total: number) => string;
}

export function createBookingFormSchema(messages: BookingFormSchemaMessages, maxGuests?: number) {
  const contactSchema = z.object({
    full_name: z.string().min(2, messages.nameMin),
    phone: z
      .string()
      .min(1, messages.phoneRequired)
      .regex(EGYPT_MOBILE_LOCAL_REGEX, messages.phoneMobileEgypt),
    booking_date: z
      .date({
        required_error: messages.dateRequired,
        invalid_type_error: messages.dateInvalid,
      })
      .refine((d) => d.getTime() >= Date.now() - 60_000, {
        message: messages.dateTimePast,
      })
      .refine(
        (d) => {
          const minutes = d.getHours() * 60 + d.getMinutes();
          return minutes >= BOOKING_MIN_MINUTES && minutes <= BOOKING_MAX_MINUTES;
        },
        { message: messages.bookingTimeRange },
      ),
    resource_type: z.enum(RESOURCE_TYPES),
    guests: z.coerce
      .number({ invalid_type_error: messages.numberInvalid })
      .int()
      .min(1, messages.minOneGuest),
    has_kids_1_6: z.boolean(),
    kids_1_6: z.coerce
      .number({ invalid_type_error: messages.numberInvalid })
      .int()
      .min(0),
    has_kids_7_12: z.boolean(),
    kids_7_12: z.coerce
      .number({ invalid_type_error: messages.numberInvalid })
      .int()
      .min(0),
    guest_mix: z.enum(['local', 'foreigner', 'mixed']),
    local_guests: z.coerce
      .number({ invalid_type_error: messages.numberInvalid })
      .int()
      .min(0),
    foreigner_guests: z.coerce
      .number({ invalid_type_error: messages.numberInvalid })
      .int()
      .min(0),
    duration: z.coerce
      .number({ invalid_type_error: messages.numberInvalid })
      .int()
      .min(1, messages.minOne),
    wants_guide: z.boolean(),
    played_before: z.boolean().optional(),
    hear_about_us: z.enum([
      '',
      'instagram',
      'facebook',
      'tiktok',
      'google',
      'friend',
      'other',
    ]),
    referral_text: z.string(),
  });

  return contactSchema.superRefine((data, ctx) => {
    const kids =
      (data.has_kids_1_6 ? data.kids_1_6 : 0) +
      (data.has_kids_7_12 ? data.kids_7_12 : 0);
    const total = data.guests + kids;

    if (data.has_kids_1_6 && data.kids_1_6 < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: messages.kidsMinOne,
        path: ['kids_1_6'],
      });
    }
    if (data.has_kids_7_12 && data.kids_7_12 < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: messages.kidsMinOne,
        path: ['kids_7_12'],
      });
    }
    if (maxGuests != null && total > maxGuests) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: messages.maxGuestsError(maxGuests),
        path: ['guests'],
      });
    }
    if (data.guest_mix === 'mixed') {
      const sum = data.local_guests + data.foreigner_guests;
      if (sum !== total) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: messages.guestMixSumError(total),
          path: ['local_guests'],
        });
      }
      if (data.local_guests < 1 && data.foreigner_guests < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: messages.minOneGuest,
          path: ['local_guests'],
        });
      }
    }
  });
}

export type BookingFormValues = z.infer<ReturnType<typeof createBookingFormSchema>>;
