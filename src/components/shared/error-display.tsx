'use client';

import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorDisplayProps {
  error: string;
  onRetry?: () => void;
  showRetry?: boolean;
}

export function ErrorDisplay({ error, onRetry, showRetry = true }: ErrorDisplayProps) {
  return (
    <div className="border border-red-200 bg-red-50 rounded-lg p-4 flex gap-4">
      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <h3 className="font-semibold text-red-900 mb-1">حدث خطأ</h3>
        <p className="text-red-700 text-sm mb-3">{error}</p>
        {showRetry && onRetry && (
          <Button
            onClick={onRetry}
            size="sm"
            variant="outline"
            className="border-red-300 text-red-700 hover:bg-red-100"
          >
            <RefreshCw className="w-4 h-4 ml-1" />
            حاول مجددا
          </Button>
        )}
      </div>
    </div>
  );
}

export function ErrorPage({ error, onRetry }: { error: string; onRetry?: () => void }) {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="max-w-md w-full">
        <ErrorDisplay error={error} onRetry={onRetry} showRetry={!!onRetry} />
      </div>
    </div>
  );
}
