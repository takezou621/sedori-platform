'use client';

import { useEffect, useState } from 'react';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'seller' | 'user';
  plan: string;
  status: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
}

export function useRole() {
  const [authState, setAuthState] = useState<AuthState>({ isAuthenticated: false, user: null });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAuthState = async () => {
      try {
        const response = await fetch('/api/auth/me');
        const data = await response.json();
        setAuthState({
          isAuthenticated: data.isAuthenticated,
          user: data.user
        });
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