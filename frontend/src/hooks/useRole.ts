'use client';

import { useEffect, useState } from 'react';
import { getAuthState, type User, type AuthState } from '@/lib/cookies';

export function useRole() {
  const [authState, setAuthState] = useState<AuthState>({ isAuthenticated: false, user: null });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAuthState = async () => {
      try {
        const state = await getAuthState();
        setAuthState(state);
      } catch (error) {
        console.error('Error fetching auth state:', error);
        setAuthState({ isAuthenticated: false, user: null });
      } finally {
        setIsLoading(false);
      }
    };

    fetchAuthState();
  }, []);

  const { user, isAuthenticated } = authState;

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
    isAuthenticated,
    isLoading,
    // Convenience methods
    canAccessAdmin: hasRole('admin'),
    canAccessSeller: hasAnyRole(['admin', 'seller']),
  };
}