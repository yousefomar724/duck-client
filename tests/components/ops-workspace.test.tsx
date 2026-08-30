import { describe, expect, it, vi } from 'vitest';
import { bandFromPct, heatFromBookingCount } from '@/components/dashboard/ops/heat';
import { OpsWorkspace } from '@/components/dashboard/ops/ops-workspace';
import { render } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/admin/calendar',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock('@/components/dashboard/ops/use-ops-scope', () => ({
  useOpsScope: () => ({ supplierId: null }),
}));

vi.mock('@/components/dashboard/ops/use-ops-data', () => ({
  useOpsCalendar: () => ({ days: [], loading: false, error: null, reload: vi.fn() }),
  useOpsDay: () => ({
    hours: [],
    summary: { bookings: 0, guests: 0, units: 0, revenue: 0 },
    capacity: 20,
    loading: false,
    error: null,
    reload: vi.fn(),
  }),
  useOpsHour: () => ({
    bookings: [],
    units: 0,
    capacity: 20,
    pct: 0,
    band: 'available',
    loading: false,
    error: null,
    reload: vi.fn(),
  }),
}));

vi.mock('@/lib/stores/toast-store', () => ({
  useToast: () => ({ addToast: vi.fn() }),
}));

describe('ops heat and bands', () => {
  it('maps booking counts onto heat colours at the boundaries', () => {
    expect(heatFromBookingCount(0)).toBe('grey');
    expect(heatFromBookingCount(1)).toBe('green');
    expect(heatFromBookingCount(3)).toBe('green');
    expect(heatFromBookingCount(4)).toBe('yellow');
    expect(heatFromBookingCount(6)).toBe('yellow');
    expect(heatFromBookingCount(7)).toBe('orange');
    expect(heatFromBookingCount(10)).toBe('orange');
    expect(heatFromBookingCount(11)).toBe('red');
  });

  it('maps utilisation percentages onto demand bands at the boundaries', () => {
    expect(bandFromPct(0)).toBe('available');
    expect(bandFromPct(49)).toBe('available');
    expect(bandFromPct(50)).toBe('moderate');
    expect(bandFromPct(74)).toBe('moderate');
    expect(bandFromPct(75)).toBe('high');
    expect(bandFromPct(99)).toBe('high');
    expect(bandFromPct(100)).toBe('full');
  });
});

describe('ops workspace', () => {
  it('renders all three panes regardless of level', () => {
    const { container } = render(
      <OpsWorkspace role="admin" basePath="/admin" level="day" date="2026-08-10" />,
    );
    const sections = container.querySelectorAll('.lg\\:grid > section');
    expect(sections).toHaveLength(3);
  });
});
