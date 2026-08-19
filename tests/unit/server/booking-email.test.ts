import { describe, expect, it } from 'vitest';
import { formatBookingTimeAr } from '@/server/lib/mail';
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
      adults: 1,
      kids_1_6: 1,
      kids_7_12: 0,
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
      adults: 1,
      kids_1_6: 1,
      kids_7_12: 0,
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

describe('formatBookingTimeAr', () => {
  it('renders Cairo time for a UTC instant (Africa/Cairo, summer UTC+3)', () => {
    // 02:00Z is 05:00 in Cairo during EEST. Run under TZ=UTC.
    const formatted = formatBookingTimeAr(new Date('2026-07-10T02:00:00Z'));
    expect(formatted).toMatch(/05:00/);
    expect(formatted).toMatch(/ص/);
  });
});
