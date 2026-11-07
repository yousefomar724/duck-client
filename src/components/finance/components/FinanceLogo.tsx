import Logo from '@/components/shared/logo';

/**
 * Main DUCK wordmark. The artwork is navy on transparent, so it sits on a
 * white chip that stays readable on both the light shell and the dark navy shell.
 */
export function FinanceLogo({ className = 'h-10 w-auto' }: { className?: string }) {
  return (
    <span className="inline-flex items-center justify-center rounded-md bg-white px-1.5 py-0.5">
      <Logo width={140} height={60} className={className} />
    </span>
  );
}
