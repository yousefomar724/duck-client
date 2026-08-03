import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SettingsDialog from '@/components/landing/SettingsDialog';
import { renderWithIntl } from '../utils/render';

describe('SettingsDialog', () => {
  it('sets locale cookie on save', async () => {
    const reload = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, reload },
    });

    const user = userEvent.setup();
    renderWithIntl(<SettingsDialog open onOpenChange={() => {}} />, { locale: 'en' });

    const saveButton = screen.getByRole('button', { name: /save|حفظ/i });
    await user.click(saveButton);

    expect(document.cookie).toContain('locale=');
  });
});
