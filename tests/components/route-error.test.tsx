import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RouteError } from '@/components/shared/route-error';

describe('route recovery', () => {
  it('works without providers and offers retry and payment-safe recovery', () => {
    document.documentElement.lang = 'en';
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const reset = vi.fn();
    render(<RouteError error={new Error('private internal failure')} reset={reset} />);
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(reset).toHaveBeenCalledOnce();
    expect(screen.getByRole('link', { name: 'My bookings' })).toHaveAttribute('href', '/my-bookings');
    expect(screen.getByText(/before booking or paying again/)).toBeVisible();
    expect(screen.queryByText('private internal failure')).not.toBeInTheDocument();
    log.mockRestore();
  });

  it('renders Arabic recovery in RTL', () => {
    document.documentElement.lang = 'ar';
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<RouteError error={new Error('failure')} reset={vi.fn()} />);
    expect(screen.getByRole('main')).toHaveAttribute('dir', 'rtl');
    expect(screen.getByRole('button', { name: 'حاول مرة أخرى' })).toBeVisible();
    log.mockRestore();
  });
});
