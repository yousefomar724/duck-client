import Logo from '@/components/shared/logo';

/**
 * Main DUCK wordmark. The file is navy artwork on white, so light mode keeps
 * it on a white chip. Dark mode knocks the white out and leaves a white mark.
 */
export function FinanceLogo({
  className = 'h-10 w-auto',
  variant = 'light',
}: {
  className?: string;
  variant?: 'light' | 'dark';
}) {
  const inverted = variant === 'dark';

  return (
    <span className="inline-flex items-center justify-center">
      <Logo
        width={140}
        height={60}
        className={
          inverted
            ? `${className} invert grayscale brightness-200 mix-blend-screen`
            : `${className} rounded-md bg-white px-1.5`
        }
      />
    </span>
  );
}
