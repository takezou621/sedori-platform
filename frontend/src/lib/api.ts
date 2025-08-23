import axios, { AxiosInstance, AxiosResponse } from 'axios';
import type {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  ApiError,
} from '@/types';

// Connect directly to NestJS backend API
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/v1';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true, // Include cookies in requests
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        // Token will be handled via httpOnly cookies
        // No need to manually add Authorization header
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor to handle errors
    this.client.interceptors.response.use(
      (response: AxiosResponse) => response,
      error => {
        if (error.response?.status === 401) {
          // Token expired or invalid - redirect to login
          if (typeof window !== 'undefined') {
            window.location.href = '/auth/login';
          }
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

  // Products endpoints
  async getProducts(params?: { 
    page?: number; 
    limit?: number; 
    search?: string; 
    categoryId?: string; 
  }) {
    try {
      const response = await this.client.get('/products', { params });
      return response.data;
    } catch (error: unknown) {
      throw this.handleError(error);
    }
  }

  async getProduct(id: string) {
    try {
      const response = await this.client.get(`/products/${id}`);
      return response.data;
    } catch (error: unknown) {
      throw this.handleError(error);
    }
  }

  // Categories endpoints
  async getCategories() {
    try {
      const response = await this.client.get('/categories');
      return response.data;
    } catch (error: unknown) {
      throw this.handleError(error);
    }
  }

  // Search endpoints
  async searchProducts(query: string, filters?: { 
    categoryId?: string; 
    minPrice?: number; 
    maxPrice?: number; 
  }) {
    try {
      const response = await this.client.get('/search', { 
        params: { query, ...filters } 
      });
      return response.data;
    } catch (error: unknown) {
      throw this.handleError(error);
    }
  }

  // Analytics endpoints
  async getAnalytics(dateRange?: { from: string; to: string }) {
    try {
      const response = await this.client.get('/analytics/dashboard', { 
        params: dateRange 
      });
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