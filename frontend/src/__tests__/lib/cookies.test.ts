import { getCookie, getUserFromCookie, hasAuthToken } from '@/lib/cookies';

// Mock document.cookie
Object.defineProperty(document, 'cookie', {
  writable: true,
  value: '',
});

describe('Cookie utilities', () => {
  beforeEach(() => {
    // Clear cookies before each test
    document.cookie = '';
  });

  describe('getCookie', () => {
    it('should return undefined for non-existent cookie', () => {
      expect(getCookie('nonexistent')).toBeUndefined();
    });

    it('should return cookie value when cookie exists', () => {
      document.cookie = 'test_cookie=test_value';
      expect(getCookie('test_cookie')).toBe('test_value');
    });

    it('should handle multiple cookies', () => {
      document.cookie = 'first=value1; second=value2';
      expect(getCookie('first')).toBe('value1');
      expect(getCookie('second')).toBe('value2');
    });
  });

  describe('hasAuthToken', () => {
    it('should return false when no auth token exists', () => {
      expect(hasAuthToken()).toBe(false);
    });

    it('should return true when auth token exists', () => {
      document.cookie = 'auth_token=test_token';
      expect(hasAuthToken()).toBe(true);
    });
  });

  describe('getUserFromCookie', () => {
    it('should return null when no user data cookie exists', () => {
      expect(getUserFromCookie()).toBeNull();
    });

    it('should return parsed user data when cookie exists', () => {
      const userData = { id: '1', name: 'Test User', email: 'test@example.com' };
      document.cookie = `user_session=${encodeURIComponent(JSON.stringify(userData))}`;
      
      expect(getUserFromCookie()).toEqual(userData);
    });

    it('should return null when cookie contains invalid JSON', () => {
      document.cookie = 'user_session=invalid_json';
      
      // Mock console.error to avoid noise in tests
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      expect(getUserFromCookie()).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });
});