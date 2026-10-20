import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  DiscountCodeForm,
  EMPTY_DRAFT,
  type DiscountFormDraft,
} from '@/components/dashboard/discount-codes/discount-code-form';
import { discountStrings as s } from '@/lib/dashboard/discount-strings';
import type { Trip } from '@/lib/types';

const trip = {
  id: 'trip-1',
  supplier_id: 'sup-1',
  name: { ar: 'رحلة النيل', en: 'Nile trip' },
  price: 1000,
  currency: 'EGP',
} as unknown as Trip;

function Harness({
  initial = {},
  role = 'supplier',
  locked = false,
}: {
  initial?: Partial<DiscountFormDraft>;
  role?: 'admin' | 'supplier';
  locked?: boolean;
}) {
  const [draft, setDraft] = useState<DiscountFormDraft>({ ...EMPTY_DRAFT, ...initial });
  return (
    <DiscountCodeForm
      role={role}
      draft={draft}
      onChange={setDraft}
      trips={[trip]}
      suppliers={[]}
      locked={locked}
    />
  );
}

const total = () => screen.getByTestId('discount-preview-total').textContent ?? '';

describe('DiscountCodeForm', () => {
  it('previews a percentage code on the trip price and updates as the value changes', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    expect(total()).toContain('900');
    expect(screen.getByTestId('discount-summary')).toHaveTextContent(s.summaryAllMyTrips);

    const value = screen.getByLabelText(s.percentLabel);
    await user.clear(value);
    await user.type(value, '25');
    expect(total()).toContain('750');
  });

  it('caps the preview at the maximum discount', async () => {
    render(<Harness initial={{ value: '50', maxDiscount: '100' }} />);
    expect(total()).toContain('900');
    expect(screen.getByText(s.previewCapped)).toBeInTheDocument();
  });

  it('turns into a free booking with nothing to pay', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('radio', { name: new RegExp(s.kindFree) }));
    expect(screen.queryByLabelText(s.percentLabel)).not.toBeInTheDocument();
    expect(total()).toContain('0');
    expect(screen.getByText(s.checkoutFreeTitle)).toBeInTheDocument();
    expect(screen.getByTestId('discount-summary')).toHaveTextContent(s.summaryFree);
  });

  it('shows a fixed amount taken off the example booking', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('radio', { name: new RegExp(s.fixed) }));
    const value = screen.getByLabelText(s.amountLabel);
    await user.clear(value);
    await user.type(value, '150');
    expect(total()).toContain('850');
  });

  it('generates a valid code and shows it in the preview', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: new RegExp(s.generate) }));
    const code = (screen.getByLabelText(s.code) as HTMLInputElement).value;
    expect(code).toMatch(/^[A-Z2-9]{8}$/);
    expect(screen.getByTestId('discount-preview')).toHaveTextContent(code);
  });

  it('flags an invalid code as it is typed', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.type(screen.getByLabelText(s.code), 'my code');
    expect(screen.getByText(s.codeInvalid)).toBeInTheDocument();
  });

  it('warns that an example under the minimum would be refused', async () => {
    const user = userEvent.setup();
    // A condition is set, so the conditions section starts open.
    render(<Harness initial={{ minBooking: '1500' }} />);
    expect(screen.getByLabelText(s.minBooking)).toHaveValue(1500);
    expect(screen.getByText(s.checkoutBelowMinimum)).toBeInTheDocument();

    await user.type(screen.getByLabelText(s.previewAmount), '2000');
    expect(screen.queryByText(s.checkoutBelowMinimum)).not.toBeInTheDocument();
    expect(total()).toContain('1,800');
  });

  it('fills the expiry from a quick pick', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    expect(screen.getByTestId('discount-summary')).toHaveTextContent(s.summaryNoExpiry);
    await user.click(screen.getByRole('button', { name: s.inWeek }));
    expect(screen.getByTestId('discount-summary')).not.toHaveTextContent(s.summaryNoExpiry);
  });

  it('says who pays for the discount', () => {
    const { unmount } = render(<Harness />);
    expect(screen.getByText(s.paysSupplier)).toBeInTheDocument();
    unmount();
    render(<Harness role="admin" />);
    expect(screen.getByText(s.paysDuckPlatform)).toBeInTheDocument();
  });

  it('locks the type, value and code once the code has been used', () => {
    render(<Harness locked initial={{ code: 'USED-CODE' }} />);
    for (const radio of screen.getAllByRole('radio')) expect(radio).toBeDisabled();
    expect(screen.getByLabelText(s.percentLabel)).toBeDisabled();
    expect(screen.getByLabelText(s.code)).toBeDisabled();
    expect(screen.getByRole('button', { name: new RegExp(s.generate) })).toBeDisabled();
  });
});
