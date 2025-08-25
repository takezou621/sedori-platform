import axios, { AxiosInstance, AxiosResponse } from 'axios';
import type {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  ApiError,
} from '@/types';
import type {
  AISearchOptions,
  AISearchResult,
  KeepaPriceAnalysis,
  KeepaAiInsights,
  MarketIntelligence,
  NaturalLanguageQuery,
} from '@/types/ai';

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

  // AI Search endpoints
  async aiSearch(options: AISearchOptions): Promise<AISearchResult[]> {
    try {
      const response = await this.client.post('/ai/search/natural-language', {
        query: options.naturalLanguageQuery || '',
        maxResults: options.limit || 20,
        includeAnalysis: true,
        ...options
      });
      return response.data.products || [];
    } catch (error: unknown) {
      throw this.handleError(error);
    }
  }

  async conversationalSearch(query: string, history: string[] = []): Promise<AISearchResult[]> {
    try {
      const response = await this.client.post('/ai/search/conversational', {
        query,
        conversationHistory: history,
        maxResults: 20,
        includeAnalysis: true
      });
      return response.data.products || [];
    } catch (error: unknown) {
      throw this.handleError(error);
    }
  }

  async voiceSearch(audioData?: string, query?: string): Promise<{ transcribedText: string; searchResults: AISearchResult[] }> {
    try {
      const response = await this.client.post('/ai/search/voice', {
        audioData,
        query,
        language: 'ja'
      });
      return response.data;
    } catch (error: unknown) {
      throw this.handleError(error);
    }
  }

  async getTrendingProducts(params?: {
    category?: string;
    timeframe?: 'daily' | 'weekly' | 'monthly';
    minScore?: number;
    limit?: number;
  }): Promise<AISearchResult[]> {
    try {
      const response = await this.client.get('/ai/trending', { params });
      return response.data;
    } catch (error: unknown) {
      throw this.handleError(error);
    }
  }

  async getSearchSuggestions(partialQuery: string): Promise<string[]> {
    try {
      const response = await this.client.get('/ai/search-suggestions', {
        params: { partialQuery }
      });
      return response.data;
    } catch (error: unknown) {
      throw this.handleError(error);
    }
  }

  // Keepa API endpoints
  async searchKeepaProducts(term: string, options?: {
    category?: number;
    page?: number;
    perpage?: number;
  }) {
    try {
      const response = await this.client.post('/keepa/search', {
        term,
        ...options
      });
      return response.data;
    } catch (error: unknown) {
      throw this.handleError(error);
    }
  }

  async getKeepaProduct(asin: string, options?: {
    includePriceHistory?: boolean;
    days?: number;
  }) {
    try {
      const response = await this.client.get(`/keepa/product/${asin}`, {
        params: options
      });
      return response.data;
    } catch (error: unknown) {
      throw this.handleError(error);
    }
  }

  async getKeepaAiAnalysis(asin: string, days: number = 90): Promise<KeepaPriceAnalysis> {
    try {
      const response = await this.client.get(`/keepa/product/${asin}/ai-analysis`, {
        params: { days }
      });
      return response.data;
    } catch (error: unknown) {
      throw this.handleError(error);
    }
  }

  async getKeepaAiInsights(asin: string): Promise<KeepaAiInsights> {
    try {
      const response = await this.client.get(`/keepa/product/${asin}/ai-insights`);
      return response.data;
    } catch (error: unknown) {
      throw this.handleError(error);
    }
  }

  async getKeepaProductSummary(asin: string): Promise<{ asin: string; summary: string; generatedAt: Date }> {
    try {
      const response = await this.client.get(`/keepa/product/${asin}/summary`);
      return response.data;
    } catch (error: unknown) {
      throw this.handleError(error);
    }
  }

  // Profit Analysis endpoints
  async predictProfit(asin: string, options?: {
    intendedBuyPrice?: number;
    intendedVolume?: number;
    holdingPeriod?: number;
    riskTolerance?: 'low' | 'medium' | 'high';
  }) {
    try {
      const response = await this.client.post(`/ai/profit/predict/${asin}`, options);
      return response.data;
    } catch (error: unknown) {
      throw this.handleError(error);
    }
  }

  async compareProducts(products: Array<{
    asin: string;
    intendedBuyPrice?: number;
    intendedVolume?: number;
  }>, budget: number, preferences?: any) {
    try {
      const response = await this.client.post('/ai/profit/compare-products', {
        products,
        budget,
        userPreferences: preferences
      });
      return response.data;
    } catch (error: unknown) {
      throw this.handleError(error);
    }
  }

  async optimizePortfolio(options: {
    asins: string[];
    totalBudget: number;
    riskTolerance: 'conservative' | 'balanced' | 'aggressive';
    targetROI?: number;
    maxPositionsPerProduct?: number;
    diversificationLevel?: 'low' | 'medium' | 'high';
  }) {
    try {
      const response = await this.client.post('/ai/profit/optimize-portfolio', options);
      return response.data;
    } catch (error: unknown) {
      throw this.handleError(error);
    }
  }

  async getBreakEvenAnalysis(asin: string, buyPrice: number) {
    try {
      const response = await this.client.get(`/ai/profit/${asin}/break-even`, {
        params: { buyPrice }
      });
      return response.data;
    } catch (error: unknown) {
      throw this.handleError(error);
    }
  }

  async analyzeMarketTiming(asin: string, options?: {
    analysisType?: 'buy_timing' | 'sell_timing' | 'both';
    timeHorizon?: number;
  }) {
    try {
      const response = await this.client.get(`/ai/profit/${asin}/market-timing`, {
        params: options
      });
      return response.data;
    } catch (error: unknown) {
      throw this.handleError(error);
    }
  }

  // Smart Alerts endpoints
  async createSmartAlert(alertData: {
    asin: string;
    desiredPrice: number;
    priceType?: number;
    intervalMinutes?: number;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    notificationChannels?: ('email' | 'sms' | 'push' | 'webhook')[];
    smartTriggerConditions?: any;
    smartSnoozing?: any;
  }) {
    try {
      const response = await this.client.post('/alerts', alertData);
      return response.data;
    } catch (error: unknown) {
      throw this.handleError(error);
    }
  }

  async getUserAlerts(params?: {
    status?: 'active' | 'paused' | 'all';
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    page?: number;
    limit?: number;
  }) {
    try {
      const response = await this.client.get('/alerts', { params });
      return response.data;
    } catch (error: unknown) {
      throw this.handleError(error);
    }
  }

  async updateAlert(alertId: string, updateData: any) {
    try {
      const response = await this.client.put(`/alerts/${alertId}`, updateData);
      return response.data;
    } catch (error: unknown) {
      throw this.handleError(error);
    }
  }

  async deleteAlert(alertId: string) {
    try {
      const response = await this.client.delete(`/alerts/${alertId}`);
      return response.data;
    } catch (error: unknown) {
      throw this.handleError(error);
    }
  }

  async pauseAlert(alertId: string, duration?: number) {
    try {
      const response = await this.client.post(`/alerts/${alertId}/pause`, {}, {
        params: duration ? { duration } : {}
      });
      return response.data;
    } catch (error: unknown) {
      throw this.handleError(error);
    }
  }

  async resumeAlert(alertId: string) {
    try {
      const response = await this.client.post(`/alerts/${alertId}/resume`);
      return response.data;
    } catch (error: unknown) {
      throw this.handleError(error);
    }
  }

  async getAlertAnalytics(timeframe?: '7d' | '30d' | '90d') {
    try {
      const response = await this.client.get('/alerts/analytics/summary', {
        params: { timeframe }
      });
      return response.data;
    } catch (error: unknown) {
      throw this.handleError(error);
    }
  }

  // Market Intelligence endpoints
  async getMarketIntelligence(options?: {
    categories?: string[];
    timeframe?: '1h' | '24h' | '7d' | '30d';
    includeRiskAlerts?: boolean;
    generateReport?: boolean;
  }): Promise<MarketIntelligence> {
    try {
      const response = await this.client.get('/ai/market-intelligence', {
        params: {
          categories: options?.categories?.join(','),
          timeframe: options?.timeframe || '24h',
          includeRiskAlerts: options?.includeRiskAlerts ?? true,
          generateReport: options?.generateReport ?? true,
        }
      });
      return response.data;
    } catch (error: unknown) {
      throw this.handleError(error);
    }
  }

  // Batch Analysis endpoint
  async batchAnalyzeProducts(asins: string[], analysisType: 'scoring' | 'profit' | 'prediction' | 'all' = 'all') {
    try {
      const response = await this.client.post('/ai/analyze/batch', {
        asins,
        analysisType
      });
      return response.data;
    } catch (error: unknown) {
      throw this.handleError(error);
    }
  }

  // NLP Query parsing
  async parseNlpQuery(query: string) {
    try {
      const response = await this.client.get('/ai/nlp/parse', {
        params: { query }
      });
      return response.data;
    } catch (error: unknown) {
      throw this.handleError(error);
    }
  }

  // Natural Language Response to Questions
  async askQuestion(asin: string, question: NaturalLanguageQuery): Promise<string> {
    try {
      // This would integrate with the natural language query processing
      const response = await this.client.post('/ai/ask-question', {
        asin,
        ...question
      });
      return response.data.answer || 'Sorry, I could not process your question.';
    } catch (error: unknown) {
      console.error('Question processing failed:', error);
      return 'Sorry, there was an error processing your question.';
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