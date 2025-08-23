'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/ui';
import { useAdminProfile } from '@/hooks/useAdmin';
import { Permission } from '@/types/admin';

interface AdminProtectedRouteProps {
  children: React.ReactNode;
  requiredPermissions?: string[];
  fallback?: React.ReactNode;
}

export function AdminProtectedRoute({ 
  children, 
  requiredPermissions = [],
  fallback
}: AdminProtectedRouteProps) {
  const router = useRouter();
  const { data: adminUser, isLoading, error } = useAdminProfile();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('adminAccessToken');
    
    if (!token) {
      router.push('/admin/login');
      return;
    }

    if (error) {
      localStorage.removeItem('adminAccessToken');
      localStorage.removeItem('adminRefreshToken');
      router.push('/admin/login');
      return;
    }

    if (adminUser) {
      // Check if user has required permissions
      if (requiredPermissions.length > 0) {
        const userPermissions = adminUser.permissions.map((p: Permission) => 
          `${p.resource}:${p.action}`
        );
        
        const hasAllPermissions = requiredPermissions.every(permission => 
          userPermissions.includes(permission)
        );

        if (!hasAllPermissions) {
          if (fallback) {
            setIsAuthorized(false);
            return;
          }
          router.push('/admin/unauthorized');
          return;
        }
      }

      // Check if user is active
      if (!adminUser.isActive) {
        router.push('/admin/inactive');
        return;
      }

      setIsAuthorized(true);
    }
  }, [adminUser, error, router, requiredPermissions, fallback]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary-50">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-secondary-600">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    if (fallback) {
      return <>{fallback}</>;
    }
    return null;
  }

  return <>{children}</>;
}

// Higher-order component for easy wrapping
export function withAdminAuth<P extends object>(
  Component: React.ComponentType<P>,
  requiredPermissions?: string[]
) {
  return function ProtectedComponent(props: P) {
    return (
      <AdminProtectedRoute requiredPermissions={requiredPermissions}>
        <Component {...props} />
      </AdminProtectedRoute>
    );
  };
}

// Hook to check permissions
export function useAdminPermissions() {
  const { data: adminUser } = useAdminProfile();

  const hasPermission = (permission: string): boolean => {
    if (!adminUser) return false;
    
    const userPermissions = adminUser.permissions.map((p: Permission) => 
      `${p.resource}:${p.action}`
    );
    
    return userPermissions.includes(permission);
  };

  const hasAnyPermission = (permissions: string[]): boolean => {
    return permissions.some(permission => hasPermission(permission));
  };

  const hasAllPermissions = (permissions: string[]): boolean => {
    return permissions.every(permission => hasPermission(permission));
  };

  return {
    user: adminUser,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isSuper: adminUser?.role?.name === 'super_admin',
  };
}