'use client';

import { create } from 'zustand';
import { apiClient } from '@/lib/api';
import { getUserFromCookie, hasAuthToken } from '@/lib/cookies';
import type {
  AuthStore,
  User,
  LoginRequest,
  RegisterRequest,
  ApiError,
} from '@/types';

export const useAuthStore = create<AuthStore>()((set, get) => ({
  user: null, // Will be initialized in browser
  token: null, // Will be initialized in browser
  isLoading: false,
  error: null,

  // Initialize auth state from cookies
  initialize: () => {
    if (typeof window !== 'undefined') {
      const user = getUserFromCookie() as User | null;
      const token = hasAuthToken() ? 'cookie' : null;
      set({ user, token });
    }
  },

  login: async (credentials: LoginRequest) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.login(credentials);
      const { user } = response;

      set({
        user,
        token: 'cookie', // Token is now stored securely in httpOnly cookie
        isLoading: false,
        error: null,
      });
    } catch (error) {
      const apiError = error as ApiError;
      set({
        error: apiError.message,
        isLoading: false,
        user: null,
        token: null,
      });
      throw error;
    }
  },

  register: async (userData: RegisterRequest) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.register(userData);
      const { user } = response;

      set({
        user,
        token: 'cookie', // Token is now stored securely in httpOnly cookie
        isLoading: false,
        error: null,
      });
    } catch (error) {
      const apiError = error as ApiError;
      set({
        error: apiError.message,
        isLoading: false,
        user: null,
        token: null,
      });
      throw error;
    }
  },

  logout: async () => {
    try {
      // Call API logout (will clear cookies)
      await apiClient.logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
    
    // Clear state
    set({
      user: null,
      token: null,
      isLoading: false,
      error: null,
    });
  },

  clearError: () => {
    set({ error: null });
  },
}));