import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DiscountCodeField } from '@/components/booking/discount-code-field';
import { renderWithIntl } from '../utils/render';

vi.mock('@/lib/api/discount-codes', () => ({
  validateDiscountCode: vi.fn(),
}));

import { validateDiscountCode } from '@/lib/api/discount-codes';

const mocked = vi.mocked(validateDiscountCode);

function renderField(overrides: Partial<Parameters<typeof DiscountCodeField>[0]> = {}) {
  const onChange = vi.fn();
  renderWithIntl(
    <DiscountCodeField
      tripId="trip-1"
      phone="+201012345678"
      quantity={2}
      localGuests={2}
      foreignerGuests={0}
      duration={1}
      currency="EGP"
      locale="en"
      onChange={onChange}
      {...overrides}
    />,
  );
  return { onChange };
}

describe('DiscountCodeField', () => {
  it('applies a valid code and shows the discount', async () => {
    mocked.mockResolvedValue({
      data: { subtotal: 1000, discount: 100, total: 900, min_deposit: 450, code: 'SUMMER10', funded_by: 'supplier' },
      error: null,
    });
    const user = userEvent.setup();
    const { onChange } = renderField();
    await user.type(screen.getByLabelText('Have a discount code?'), 'summer10');
    await user.click(screen.getByRole('button', { name: 'Apply' }));
    expect(await screen.findByText(/SUMMER10/)).toBeInTheDocument();
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ total: 900, code: 'SUMMER10' }));
  });

  it('shows a localized error for an invalid code', async () => {
    mocked.mockResolvedValue({ data: null, error: 'nope', code: 'EXPIRED' });
    const user = userEvent.setup();
    renderField();
    await user.type(screen.getByLabelText('Have a discount code?'), 'old');
    await user.click(screen.getByRole('button', { name: 'Apply' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('This code has expired');
  });

  it('removes the code when a later check falls below the minimum', async () => {
    mocked.mockResolvedValueOnce({
      data: { subtotal: 1000, discount: 100, total: 900, min_deposit: 450, code: 'MIN', funded_by: 'supplier' },
      error: null,
    });
    const user = userEvent.setup();
    const { rerender } = renderWithIntl(
      <DiscountCodeField
        tripId="trip-1"
        phone="+201012345678"
        quantity={2}
        localGuests={2}
        foreignerGuests={0}
        duration={1}
        currency="EGP"
        locale="en"
        onChange={vi.fn()}
      />,
    );
    await user.type(screen.getByLabelText('Have a discount code?'), 'min');
    await user.click(screen.getByRole('button', { name: 'Apply' }));
    expect(await screen.findByText(/MIN/)).toBeInTheDocument();

    mocked.mockResolvedValue({ data: null, error: 'low', code: 'BELOW_MINIMUM' });
    rerender(
      <DiscountCodeField
        tripId="trip-1"
        phone="+201012345678"
        quantity={1}
        localGuests={1}
        foreignerGuests={0}
        duration={1}
        currency="EGP"
        locale="en"
        onChange={vi.fn()}
      />,
    );
    expect(await screen.findByRole('alert')).toHaveTextContent('below the minimum');
  });

  it('renders the Arabic label', () => {
    renderWithIntl(
      <DiscountCodeField
        tripId="trip-1"
        phone="+201012345678"
        quantity={1}
        localGuests={1}
        foreignerGuests={0}
        duration={1}
        currency="EGP"
        locale="ar"
        onChange={vi.fn()}
      />,
      { locale: 'ar' },
    );
    expect(screen.getByText('هل لديك كود خصم؟')).toBeInTheDocument();
  });

  it.each([
    ['INVALID_PHONE', 'Enter a valid phone number to use this code'],
    ['RATE_LIMITED', 'Too many attempts. Please wait and try again'],
  ])('explains a %s error', async (code, message) => {
    mocked.mockResolvedValue({ data: null, error: 'server text', code });
    const user = userEvent.setup();
    const { onChange } = renderField();
    await user.type(screen.getByLabelText('Have a discount code?'), 'promo1');
    await user.click(screen.getByRole('button', { name: 'Apply' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    expect(onChange).toHaveBeenLastCalledWith(null);
  });
});
