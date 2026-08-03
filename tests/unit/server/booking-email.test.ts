import { describe, expect, it } from 'vitest';
import { toBookingEmailData } from '@/server/services/booking';

describe('toBookingEmailData', () => {
  it('maps populated booking fields', () => {
    const booking = {
      id: 'b1',
      full_name: 'Guest',
      phone_number: '+201000000000',
      booking_date: new Date('2026-08-10T10:00:00Z'),
      updated_at: new Date('2026-08-03T10:00:00Z'),
      quantity: 2,
      wants_guide: false,
      played_before: true,
      hear_about_us: 'google',
      amount: 360,
      currency: 'EGP',
      status: 'PENDING',
      trip_id: {
        name: { en: 'Kayak Trip', ar: 'رحلة كاياك' },
        is_tour: false,
        destinations: [{ name: { en: 'Aswan', ar: 'أسوان' } }],
      },
      user_id: { email: 'guest@test.com' },
    } as unknown as Parameters<typeof toBookingEmailData>[0];

    expect(toBookingEmailData(booking)).toMatchObject({
      id: 'b1',
      full_name: 'Guest',
      trip_name_en: 'Kayak Trip',
      trip_name_ar: 'رحلة كاياك',
      is_tour: false,
      destination_names: ['أسوان'],
      user_email: 'guest@test.com',
    });
  });

  it('reads destinations from populated destination_ids on the trip', () => {
    const booking = {
      id: 'b2',
      full_name: 'Guest',
      phone_number: '+201000000000',
      booking_date: new Date('2026-08-10T10:00:00Z'),
      updated_at: new Date('2026-08-03T10:00:00Z'),
      quantity: 1,
      wants_guide: false,
      amount: 180,
      currency: 'EGP',
      status: 'PENDING',
      trip_id: {
        name: { en: 'Tour', ar: 'جولة' },
        is_tour: true,
        destination_ids: [{ name: { en: 'Aswan', ar: 'أسوان' } }],
      },
    } as unknown as Parameters<typeof toBookingEmailData>[0];

    expect(toBookingEmailData(booking).destination_names).toEqual(['أسوان']);
  });

  it('returns no destination names when the trip has none', () => {
    const booking = {
      id: 'b3',
      full_name: 'Guest',
      phone_number: '+201000000000',
      booking_date: new Date('2026-08-10T10:00:00Z'),
      updated_at: new Date('2026-08-03T10:00:00Z'),
      quantity: 1,
      wants_guide: false,
      amount: 180,
      currency: 'EGP',
      status: 'PENDING',
      trip_id: {
        name: { en: 'Tour', ar: 'جولة' },
        is_tour: true,
        destinations: [],
      },
    } as unknown as Parameters<typeof toBookingEmailData>[0];

    expect(toBookingEmailData(booking).destination_names).toEqual([]);
  });
});
