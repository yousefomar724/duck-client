'use client';

import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ErrorDisplayProps {
  error: string;
  onRetry?: () => void;
  showRetry?: boolean;
  title?: string;
  className?: string;
}

export function ErrorDisplay({
  error,
  onRetry,
  showRetry = true,
  title = 'حدث خطأ',
  className,
}: ErrorDisplayProps) {
  return (
    <div
      className={cn(
        'flex gap-4 rounded-xl border border-red-200 bg-red-50 p-4',
        className,
      )}
      role="alert"
    >
      <AlertCircle className="mt-0.5 size-5 shrink-0 text-red-600" aria-hidden />
      <div className="min-w-0 flex-1">
        <h3 className="mb-1 font-semibold text-red-900">{title}</h3>
        <p className="mb-3 text-sm text-red-700">{error}</p>
        {showRetry && onRetry && (
          <Button
            onClick={onRetry}
            size="sm"
            variant="outline"
            className="border-red-300 text-red-700 hover:bg-red-100"
          >
            <RefreshCw className="ms-1 size-4" aria-hidden />
            حاول مجدداً
          </Button>
        )}
      </div>
    </div>
  );
}

export function ErrorPage({ error, onRetry }: { error: string; onRetry?: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md">
        <ErrorDisplay error={error} onRetry={onRetry} showRetry={!!onRetry} />
      </div>
    </div>
  );
}
