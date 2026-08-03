import type { ReactElement, ReactNode } from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import enMessages from '../../messages/en.json';
import arMessages from '../../messages/ar.json';

const messagesByLocale = {
  en: enMessages,
  ar: arMessages,
} as const;

type Locale = keyof typeof messagesByLocale;

interface ProvidersProps {
  children: ReactNode;
  locale?: Locale;
}

function Providers({ children, locale = 'en' }: ProvidersProps) {
  return (
    <NextIntlClientProvider locale={locale} messages={messagesByLocale[locale]}>
      {children}
    </NextIntlClientProvider>
  );
}

export function renderWithIntl(
  ui: ReactElement,
  options?: RenderOptions & { locale?: Locale },
) {
  const { locale = 'en', ...renderOptions } = options ?? {};
  return render(ui, {
  wrapper: ({ children }) => <Providers locale={locale}>{children}</Providers>,
    ...renderOptions,
  });
}

export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';
