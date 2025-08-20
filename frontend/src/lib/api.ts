import axios, { AxiosInstance, AxiosResponse } from 'axios';
import type {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  ApiError,
} from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      config => {
        const token = localStorage.getItem('auth_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      error => Promise.reject(error)
    );

    // Response interceptor to handle errors
    this.client.interceptors.response.use(
      (response: AxiosResponse) => response,
      error => {
        if (error.response?.status === 401) {
          // Token expired or invalid
          localStorage.removeItem('auth_token');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth endpoints
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    try {
      const response = await this.client.post<AuthResponse>(
        '/auth/login',
        credentials
      );
      return response.data;
    } catch (error: unknown) {
      throw this.handleError(error);
    }
  }

  async register(userData: RegisterRequest): Promise<AuthResponse> {
    try {
      const response = await this.client.post<AuthResponse>(
        '/auth/register',
        userData
      );
      return response.data;
    } catch (error: unknown) {
      throw this.handleError(error);
    }
  }

  async logout(): Promise<void> {
    try {
      await this.client.post('/auth/logout');
    } catch (error: unknown) {
      // Even if the request fails, we'll clear local storage
      console.error('Logout request failed:', error);
    } finally {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
    }
  }

  // User endpoints
  async getCurrentUser() {
    try {
      const response = await this.client.get('/auth/profile');
      return response.data;
    } catch (error: unknown) {
      throw this.handleError(error);
    }
  }

  private handleError(error: unknown): ApiError {
    // Check if it's an axios error with response
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as { response: { data?: { message?: string; error?: string }; status: number } };
      const { data, status } = axiosError.response;
      return {
        message: data?.message || 'An error occurred',
        error: data?.error || 'Unknown error',
        statusCode: status,
      };
    } 
    // Check if it's an axios error with request (network error)
    else if (error && typeof error === 'object' && 'request' in error) {
      return {
        message: 'Network error. Please check your connection.',
        error: 'Network Error',
        statusCode: 0,
      };
    } 
    // Handle other error types
    else {
      const message = error instanceof Error ? error.message : 'An unexpected error occurred';
      return {
        message,
        error: 'Unknown Error',
        statusCode: 0,
      };
    }
  }
}

export const apiClient = new ApiClient();
export default apiClient;