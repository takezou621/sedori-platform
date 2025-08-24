import { cookies } from 'next/headers';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'seller' | 'user';
  plan: string;
  status: string;
}

export function getServerAuthState(): {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
} {
  const cookieStore = cookies();
  const token = cookieStore.get('auth_token')?.value;
  const userSessionCookie = cookieStore.get('user_session')?.value;
  
  if (!token || !userSessionCookie) {
    return {
      isAuthenticated: false,
      user: null,
      token: null
    };
  }
  
  try {
    const user = JSON.parse(userSessionCookie);
    return {
      isAuthenticated: true,
      user,
      token
    };
  } catch (error) {
    console.error('Error parsing user session:', error);
    return {
      isAuthenticated: false,
      user: null,
      token: null
    };
  }
}

export function getServerUser(): User | null {
  const { user } = getServerAuthState();
  return user;
}

export function isServerAuthenticated(): boolean {
  const { isAuthenticated } = getServerAuthState();
  return isAuthenticated;
}

export function hasServerRole(requiredRole: 'admin' | 'seller' | 'user'): boolean {
  const user = getServerUser();
  if (!user) return false;
  
  // Admin has access to everything
  if (user.role === 'admin') return true;
  
  // Seller has access to seller and user features
  if (user.role === 'seller' && (requiredRole === 'seller' || requiredRole === 'user')) {
    return true;
  }
  
  // User only has access to user features
  return user.role === requiredRole;
}