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
  maxGuestsError: (max: number) => `Max ${max}`,
  guestMixSumError: (total: number) => `Sum must be ${total}`,
};

describe('form-schema', () => {
  it('rejects invalid phone', () => {
    const schema = createBookingFormSchema(messages, 10);
    const result = schema.safeParse({
      full_name: 'Test User',
      phone: '123',
      booking_date: new Date(Date.now() + 86400000),
      resource_type: 'kayak',
      guests: 1,
      guest_mix: 'local',
      local_guests: 0,
      foreigner_guests: 0,
      duration: 1,
      wants_guide: false,
      hear_about_us: '',
      referral_text: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects guests above max', () => {
    const schema = createBookingFormSchema(messages, 2);
    const result = schema.safeParse({
      full_name: 'Test User',
      phone: '01012345678',
      booking_date: new Date(Date.now() + 86400000),
      resource_type: 'kayak',
      guests: 5,
      guest_mix: 'local',
      local_guests: 0,
      foreigner_guests: 0,
      duration: 1,
      wants_guide: false,
      hear_about_us: '',
      referral_text: '',
    });
    expect(result.success).toBe(false);
  });
});
