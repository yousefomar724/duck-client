import { describe, expect, it } from 'vitest';
import { createBookingFormSchema } from '@/lib/booking/form-schema';

const messages = {
  nameMin: 'Name too short',
  phoneRequired: 'Phone required',
  phoneMobileEgypt: 'Invalid phone',
  dateRequired: 'Date required',
  dateInvalid: 'Invalid date',
  dateTimePast: 'Date in past',
  bookingTimeRange: 'Outside window',
  numberInvalid: 'Invalid number',
  minOneGuest: 'At least one guest',
  minOne: 'At least one',
  kidsMinOne: 'At least one child',
  maxGuestsError: (max: number) => `Max ${max}`,
  guestMixSumError: (total: number) => `Sum must be ${total}`,
};

function validPayload(overrides: Record<string, unknown> = {}) {
  const bookingDate = new Date(Date.now() + 86400000);
  bookingDate.setHours(10, 0, 0, 0);
  return {
    full_name: 'Test User',
    phone: '01012345678',
    booking_date: bookingDate,
    resource_type: 'kayak',
    guests: 1,
    has_kids_1_6: false,
    kids_1_6: 0,
    has_kids_7_12: false,
    kids_7_12: 0,
    guest_mix: 'local',
    local_guests: 1,
    foreigner_guests: 0,
    duration: 1,
    wants_guide: false,
    hear_about_us: '',
    referral_text: '',
    ...overrides,
  };
}

describe('form-schema', () => {
  it('rejects invalid phone', () => {
    const schema = createBookingFormSchema(messages, 10);
    const result = schema.safeParse(validPayload({ phone: '123' }));
    expect(result.success).toBe(false);
  });

  it('rejects guests above max', () => {
    const schema = createBookingFormSchema(messages, 2);
    const result = schema.safeParse(validPayload({ guests: 5 }));
    expect(result.success).toBe(false);
  });

  it('rejects when adults plus kids exceed max guests', () => {
    const schema = createBookingFormSchema(messages, 3);
    const result = schema.safeParse(
      validPayload({
        guests: 2,
        has_kids_1_6: true,
        kids_1_6: 2,
      }),
    );
    expect(result.success).toBe(false);
  });

  it('requires at least one child when a kids checkbox is on', () => {
    const schema = createBookingFormSchema(messages, 10);
    const result = schema.safeParse(
      validPayload({
        has_kids_1_6: true,
        kids_1_6: 0,
      }),
    );
    expect(result.success).toBe(false);
  });

  it('rejects mixed nationality split that does not match adults plus kids', () => {
    const schema = createBookingFormSchema(messages, 10);
    const result = schema.safeParse(
      validPayload({
        guests: 2,
        has_kids_7_12: true,
        kids_7_12: 1,
        guest_mix: 'mixed',
        local_guests: 1,
        foreigner_guests: 1,
      }),
    );
    expect(result.success).toBe(false);
  });

  it('accepts mixed nationality split equal to total guests', () => {
    const schema = createBookingFormSchema(messages, 10);
    const result = schema.safeParse(
      validPayload({
        guests: 2,
        has_kids_7_12: true,
        kids_7_12: 1,
        guest_mix: 'mixed',
        local_guests: 2,
        foreigner_guests: 1,
      }),
    );
    expect(result.success).toBe(true);
  });
});
