import { describe, expect, it } from 'vitest';
import { GET as getCalendar } from '@/app/api/v1/ops/calendar/route';
import { GET as getDay } from '@/app/api/v1/ops/day/route';
import { GET as getHour } from '@/app/api/v1/ops/hour/route';
import { GET as getSummary } from '@/app/api/v1/ops/summary/route';
import { GET as getAvailability } from '@/app/api/v1/ops/availability/route';
import { GET as getNotifications } from '@/app/api/v1/ops/notifications/route';
import { GET as getReports } from '@/app/api/v1/reports/overview/route';
import { GET as getCustomers } from '@/app/api/v1/customers/route';
import {
  createSupplierUser,
  createAdminUser,
  createTrip,
  createSupplierStorage,
  createBooking,
  authHeader,
} from '../utils/factories';
import { jsonRequest } from '../utils/http';
import { toSiteYmd } from '@/lib/time';
import { slotHHMM } from '@/lib/booking/occupancy';

describe('ops endpoints', () => {
  it('returns calendar/day/hour/summary shapes for an admin', async () => {
    const { supplier } = await createSupplierUser();
    const { user: admin } = await createAdminUser();
    const trip = await createTrip(supplier._id);
    await createSupplierStorage(supplier._id, { kayak: 8 });
    const booking = await createBooking({
      trip_id: trip._id,
      supplier_id: supplier._id,
      status: 'CONFIRMED',
      resource_type: 'kayak',
      quantity: 1,
      local_guests: 1,
    });
    const ymd = toSiteYmd(booking.booking_date);
    const month = ymd.slice(0, 7);
    const headers = authHeader(admin.id, admin.role);

    const calendar = await getCalendar(
      jsonRequest(`http://localhost/api/v1/ops/calendar?month=${month}`, { headers }),
    );
    expect(calendar.status).toBe(200);
    const calBody = await calendar.json();
    expect(calBody.month).toBe(month);
    expect(Array.isArray(calBody.days)).toBe(true);
    expect(calBody.capacity).toBeTruthy();
    const dayRow = calBody.days.find((d: { ymd: string }) => d.ymd === ymd);
    expect(dayRow.bookings).toBeGreaterThanOrEqual(1);
    expect(['grey', 'green', 'yellow', 'orange', 'red']).toContain(dayRow.heat);

    const day = await getDay(
      jsonRequest(`http://localhost/api/v1/ops/day?date=${ymd}`, { headers }),
    );
    expect(day.status).toBe(200);
    const dayBody = await day.json();
    expect(dayBody.hours).toHaveLength(13);
    expect(dayBody.summary.bookings).toBeGreaterThanOrEqual(1);
    const hourLabel = `${slotHHMM(booking.occupancy_slots[0]).slice(0, 2)}:00`;
    const hourRow = dayBody.hours.find((h: { hour: string }) => h.hour === hourLabel);
    expect(hourRow?.bookings).toBeGreaterThanOrEqual(1);

    const hour = await getHour(
      jsonRequest(`http://localhost/api/v1/ops/hour?date=${ymd}&time=12:00`, { headers }),
    );
    expect(hour.status).toBe(200);
    const hourBody = await hour.json();
    expect(hourBody.band).toBeTruthy();
    expect(Array.isArray(hourBody.bookings)).toBe(true);

    const summary = await getSummary(
      jsonRequest(`http://localhost/api/v1/ops/summary?date=${ymd}`, { headers }),
    );
    expect(summary.status).toBe(200);
    const summaryBody = await summary.json();
    expect(summaryBody.summary).toBeTruthy();
    expect(typeof summaryBody.unread_notifications).toBe('number');
  });

  it('exposes public slot remaining without auth and never customer fields', async () => {
    const { supplier } = await createSupplierUser();
    const trip = await createTrip(supplier._id);
    await createSupplierStorage(supplier._id, { kayak: 8 });
    const booking = await createBooking({
      trip_id: trip._id,
      supplier_id: supplier._id,
      status: 'CONFIRMED',
      resource_type: 'kayak',
    });
    const ymd = toSiteYmd(booking.booking_date);

    const res = await getAvailability(
      jsonRequest(
        `http://localhost/api/v1/ops/availability?trip_id=${trip.id}&date=${ymd}&resource_type=kayak`,
      ),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.slots)).toBe(true);
    expect(body.slots[0].remaining).toBeTruthy();
    expect(JSON.stringify(body)).not.toMatch(/phone_number|full_name/);
  });

  it('ignores a supplier_id query from a supplier token', async () => {
    const { supplier: own, user: supplierUser } = await createSupplierUser();
    const { supplier: other } = await createSupplierUser();
    const trip = await createTrip(other._id);
    await createSupplierStorage(other._id, { kayak: 8 });
    await createSupplierStorage(own._id, { kayak: 8 });
    const booking = await createBooking({
      trip_id: trip._id,
      supplier_id: other._id,
      status: 'CONFIRMED',
      resource_type: 'kayak',
      full_name: 'Secret Guest',
    });
    const ymd = toSiteYmd(booking.booking_date);
    const month = ymd.slice(0, 7);

    const res = await getCalendar(
      jsonRequest(
        `http://localhost/api/v1/ops/calendar?month=${month}&supplier_id=${other._id}`,
        { headers: authHeader(supplierUser.id, supplierUser.role) },
      ),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    const dayRow = body.days.find((d: { ymd: string }) => d.ymd === ymd);
    expect(dayRow?.bookings ?? 0).toBe(0);

    const hour = await getHour(
      jsonRequest(
        `http://localhost/api/v1/ops/hour?date=${ymd}&time=12:00&supplier_id=${other._id}`,
        { headers: authHeader(supplierUser.id, supplierUser.role) },
      ),
    );
    const hourBody = await hour.json();
    expect(hourBody.bookings.every((b: { full_name?: string }) => b.full_name !== 'Secret Guest')).toBe(
      true,
    );
  });

  it('returns notifications, reports, and customers for staff', async () => {
    const { supplier } = await createSupplierUser();
    const { user: admin } = await createAdminUser();
    const trip = await createTrip(supplier._id);
    await createSupplierStorage(supplier._id, { kayak: 8 });
    const booking = await createBooking({
      trip_id: trip._id,
      supplier_id: supplier._id,
      status: 'PENDING',
      resource_type: 'kayak',
      phone_number: '+201055555555',
      full_name: 'Repeat Guest',
    });
    const ymd = toSiteYmd(booking.booking_date);
    const headers = authHeader(admin.id, admin.role);

    const notes = await getNotifications(
      jsonRequest('http://localhost/api/v1/ops/notifications', { headers }),
    );
    expect(notes.status).toBe(200);
    const notesBody = await notes.json();
    expect(Array.isArray(notesBody.items)).toBe(true);

    const reports = await getReports(
      jsonRequest(`http://localhost/api/v1/reports/overview?from=${ymd}&to=${ymd}`, { headers }),
    );
    expect(reports.status).toBe(200);

    const customers = await getCustomers(
      jsonRequest('http://localhost/api/v1/customers?q=Repeat', { headers }),
    );
    expect(customers.status).toBe(200);
    const custBody = await customers.json();
    expect(Array.isArray(custBody.items)).toBe(true);
  });

  it('still lists completed bookings on the day hour histogram', async () => {
    const { supplier } = await createSupplierUser();
    const { user: admin } = await createAdminUser();
    const trip = await createTrip(supplier._id);
    await createSupplierStorage(supplier._id, { kayak: 8 });
    const booking = await createBooking({
      trip_id: trip._id,
      supplier_id: supplier._id,
      status: 'COMPLETED',
      resource_type: 'kayak',
      quantity: 2,
    });
    const ymd = toSiteYmd(booking.booking_date);
    const hourLabel = `${slotHHMM(booking.occupancy_slots[0]).slice(0, 2)}:00`;
    const day = await getDay(
      jsonRequest(`http://localhost/api/v1/ops/day?date=${ymd}`, {
        headers: authHeader(admin.id, admin.role),
      }),
    );
    const body = await day.json();
    const hourRow = body.hours.find((h: { hour: string }) => h.hour === hourLabel);
    expect(hourRow?.bookings).toBeGreaterThanOrEqual(1);
    expect(hourRow?.units).toBe(0);
  });
});
