import axios, { AxiosInstance, AxiosResponse } from 'axios';
import type {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  ApiError,
} from '@/types';

// Use Next.js API routes for secure authentication
const API_BASE_URL = '/api';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Response interceptor to handle errors
    this.client.interceptors.response.use(
      (response: AxiosResponse) => response,
      error => {
        if (error.response?.status === 401) {
          // Token expired or invalid - redirect to login
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
      // Even if the request fails, we'll redirect to login
      console.error('Logout request failed:', error);
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
    // Type guard for axios errors
    if (typeof error === 'object' && error !== null && 'response' in error) {
      const axiosError = error as { response?: { data?: { message?: string; error?: string }; status: number }; request?: unknown };
      if (axiosError.response) {
        // Server responded with error status
        const { data, status } = axiosError.response;
        return {
          message: data?.message || 'An error occurred',
          error: data?.error || 'Unknown error',
          statusCode: status,
        };
      } else if (axiosError.request) {
        // Network error
        return {
          message: 'Network error. Please check your connection.',
          error: 'Network Error',
          statusCode: 0,
        };
      }
    }
    
    // Fallback for other error types
    const errorMessage = (error as Error)?.message || 'An unexpected error occurred';
    return {
      message: errorMessage,
      error: 'Unknown Error',
      statusCode: 0,
    };
  }
}

export const apiClient = new ApiClient();
export default apiClient;