'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import { Skeleton } from '@/components/ui/skeleton';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles: number[];
}

function normalizeRole(role: unknown): number | null {
  if (role === null || role === undefined) return null;
  const n = Number(role);
  return Number.isNaN(n) ? null : n;
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const userRole = normalizeRole(user?.role);

  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7571/ingest/7916041f-fd0d-4d77-93ea-abd7b85f901a',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'f6d6e2'},body:JSON.stringify({sessionId:'f6d6e2',location:'protected-route.tsx:useEffect',message:'ProtectedRoute check',data:{isLoading,isAuthenticated,userRole,rawRole:user?.role,userRoleType:typeof user?.role,allowedRoles,includesRole:userRole!=null?allowedRoles.includes(userRole):'no-user'},timestamp:Date.now(),hypothesisId:'H1-H3',runId:'post-fix'})}).catch(()=>{});
    // #endregion
    if (!isLoading) {
      if (!isAuthenticated) {
        // #region agent log
        fetch('http://127.0.0.1:7571/ingest/7916041f-fd0d-4d77-93ea-abd7b85f901a',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'f6d6e2'},body:JSON.stringify({sessionId:'f6d6e2',location:'protected-route.tsx:redirect-login',message:'Redirecting to /login',data:{reason:'not authenticated'},timestamp:Date.now(),hypothesisId:'H3',runId:'post-fix'})}).catch(()=>{});
        // #endregion
        router.replace('/login');
      } else if (user && userRole != null && !allowedRoles.includes(userRole)) {
        // #region agent log
        fetch('http://127.0.0.1:7571/ingest/7916041f-fd0d-4d77-93ea-abd7b85f901a',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'f6d6e2'},body:JSON.stringify({sessionId:'f6d6e2',location:'protected-route.tsx:redirect-landing',message:'Redirecting to / (landing)',data:{userRole,rawRole:user.role,allowedRoles},timestamp:Date.now(),hypothesisId:'H1',runId:'post-fix'})}).catch(()=>{});
        // #endregion
        router.replace('/');
      }
    }
  }, [isLoading, isAuthenticated, user, userRole, allowedRoles, router]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!isAuthenticated || !user || userRole == null || !allowedRoles.includes(userRole)) {
    return null;
  }

  return <>{children}</>;
}
