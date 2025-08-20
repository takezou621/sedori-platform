'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiClient } from '@/lib/api';
import type {
  AuthStore,
  LoginRequest,
  RegisterRequest,
  ApiError,
} from '@/types';

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isLoading: false,
      error: null,

      login: async (credentials: LoginRequest) => {
        set({ isLoading: true, error: null });
        try {
          const response = await apiClient.login(credentials);
          const { access_token, user } = response;

          // Store token in localStorage
          localStorage.setItem('auth_token', access_token);
          localStorage.setItem('user', JSON.stringify(user));

          set({
            user,
            token: access_token,
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
          const { access_token, user } = response;

          // Store token in localStorage
          localStorage.setItem('auth_token', access_token);
          localStorage.setItem('user', JSON.stringify(user));

          set({
            user,
            token: access_token,
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

      logout: () => {
        // Call API logout
        apiClient.logout();
        
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
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
      }),
    }
  )
);