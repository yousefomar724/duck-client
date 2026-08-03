import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { TripListingPrices } from '@/components/shared/trip-listing-prices';
import { renderWithIntl } from '../utils/render';

describe('TripListingPrices', () => {
  it('renders single-tier price', () => {
    renderWithIntl(
      <TripListingPrices
        trip={{ price: 180, currency: 'EGP', foreigner_price: 0 } as never}
        egyptiansOfferLabel="Egyptians"
        locale="en"
      />,
    );
    expect(screen.getByText(/180/)).toBeInTheDocument();
  });

  it('renders two-tier pricing', () => {
    renderWithIntl(
      <TripListingPrices
        trip={{ price: 180, currency: 'EGP', foreigner_price: 500 } as never}
        egyptiansOfferLabel="Egyptians pay 180"
        locale="en"
      />,
    );
    expect(screen.getByText(/500/)).toBeInTheDocument();
    expect(screen.getByText('Egyptians pay 180')).toBeInTheDocument();
  });
});
