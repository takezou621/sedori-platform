'use client';

import { useAuthStore } from '@/store/auth';

export function useRole() {
  const { user } = useAuthStore();

  const hasRole = (role: 'admin' | 'user' | 'seller'): boolean => {
    return user?.role === role;
  };

  const hasAnyRole = (roles: Array<'admin' | 'user' | 'seller'>): boolean => {
    return user ? roles.includes(user.role) : false;
  };

  const hasAllRoles = (roles: Array<'admin' | 'user' | 'seller'>): boolean => {
    return user ? roles.every(role => user.role === role) : false;
  };

  return {
    user,
    role: user?.role,
    isAdmin: hasRole('admin'),
    isUser: hasRole('user'),
    isSeller: hasRole('seller'),
    hasRole,
    hasAnyRole,
    hasAllRoles,
    // Convenience methods
    canAccessAdmin: hasRole('admin'),
    canAccessSeller: hasAnyRole(['admin', 'seller']),
    isAuthenticated: !!user,
  };
}