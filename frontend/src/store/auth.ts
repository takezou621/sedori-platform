'use client';

import { create } from 'zustand';
import apiClient from '@/lib/api';
import { getUserFromCookie, hasAuthToken } from '@/lib/cookies';
import type {
  AuthStore,
  User,
  LoginRequest,
  RegisterRequest,
  ApiError,
} from '@/types';

export const useAuthStore = create<AuthStore>()((set) => ({
  user: getUserFromCookie() as User | null,
  token: hasAuthToken() ? 'cookie' : null, // We don't expose the actual token value
  isLoading: false,
  error: null,

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

  initialize: () => {
    // Initialize auth state from cookies or localStorage
    const hasToken = hasAuthToken();
    if (hasToken) {
      const userData = getUserFromCookie();
      if (userData) {
        set({
          user: userData as User,
          token: null,
          isLoading: false,
          error: null,
        });
      }
    }
  },
}));