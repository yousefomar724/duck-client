'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from "@/lib/stores/auth-store"
import { Skeleton } from '@/components/ui/skeleton';
import { getToken, decodeToken } from '@/lib/auth/token';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles: number[];
}

/** Supplier routes: allow role 1, users with supplier_id, or JWT token with role 1 (fallback when user.role ambiguous) */
function hasAccess(
  user: { role?: unknown; supplier_id?: number } | null,
  allowedRoles: number[],
): boolean {
  if (!user) return false;

  const normalizeRole = (r: unknown): number | null => {
    if (r === null || r === undefined) return null;
    const n = Number(r);
    return Number.isNaN(n) ? null : n;
  };

  const role = normalizeRole(user.role);
  if (role != null && allowedRoles.includes(role)) return true;
  if (allowedRoles.includes(1) && user.supplier_id != null) return true;

  const token = typeof window !== 'undefined' ? getToken() : null;
  const decoded = token ? decodeToken(token) : null;
  if (decoded && allowedRoles.includes(decoded.role)) return true;

  return false;
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const canAccess = hasAccess(user, allowedRoles);

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.replace('/login');
      } else if (user && !canAccess) {
        router.replace('/');
      }
    }
  }, [isLoading, isAuthenticated, user, canAccess, allowedRoles, router]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!isAuthenticated || !user || !canAccess) {
    return null;
  }

  return <>{children}</>;
}
