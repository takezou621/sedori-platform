// Utility functions for reading cookies on the client side

export function getCookie(name: string): string | undefined {
  if (typeof document === 'undefined') {
    return undefined;
  }
  
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift();
  }
  return undefined;
}

export function getUserFromCookie(): unknown {
  const userSessionCookie = getCookie('user_session');
  if (userSessionCookie) {
    try {
      return JSON.parse(decodeURIComponent(userSessionCookie));
    } catch (error) {
      console.error('Error parsing user session from cookie:', error);
      return null;
    }
  }
  return null;
}

export function hasAuthToken(): boolean {
  return getCookie('auth_token') !== undefined;
}