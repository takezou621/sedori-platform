/**
 * Comprehensive error handling utilities for the Sedori platform
 */

export enum ErrorType {
  VALIDATION = 'VALIDATION',
  NETWORK = 'NETWORK',
  API = 'API',
  AUTH = 'AUTH',
  NOT_FOUND = 'NOT_FOUND',
  PERMISSION = 'PERMISSION',
  SERVER = 'SERVER',
  UNKNOWN = 'UNKNOWN',
  PROFIT_CALCULATION = 'PROFIT_CALCULATION',
  CART = 'CART'
}

export enum ErrorCode {
  // Validation errors
  INVALID_EMAIL = 'INVALID_EMAIL',
  INVALID_PASSWORD = 'INVALID_PASSWORD',
  REQUIRED_FIELD = 'REQUIRED_FIELD',
  INVALID_NUMBER = 'INVALID_NUMBER',
  NEGATIVE_VALUE = 'NEGATIVE_VALUE',
  
  // Network errors
  NETWORK_TIMEOUT = 'NETWORK_TIMEOUT',
  NETWORK_OFFLINE = 'NETWORK_OFFLINE',
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  
  // API errors
  API_UNAVAILABLE = 'API_UNAVAILABLE',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  
  // Authentication errors
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  UNAUTHORIZED = 'UNAUTHORIZED',
  
  // Business logic errors
  COST_GREATER_THAN_PRICE = 'COST_GREATER_THAN_PRICE',
  INVALID_PROFIT_CALCULATION = 'INVALID_PROFIT_CALCULATION',
  CART_EMPTY = 'CART_EMPTY',
  PRODUCT_OUT_OF_STOCK = 'PRODUCT_OUT_OF_STOCK',
  
  // Generic errors
  NOT_FOUND = 'NOT_FOUND',
  FORBIDDEN = 'FORBIDDEN',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR'
}

export interface ErrorMessage {
  en: string;
  ja: string;
}

export class AppError extends Error {
  public readonly type: ErrorType;
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly userMessage: ErrorMessage;
  public readonly details?: Record<string, any>;
  public readonly timestamp: Date;

  constructor(
    type: ErrorType,
    code: ErrorCode,
    message: string,
    userMessage: ErrorMessage,
    statusCode: number = 400,
    details?: Record<string, any>
  ) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.code = code;
    this.statusCode = statusCode;
    this.userMessage = userMessage;
    this.details = details;
    this.timestamp = new Date();
  }

  toJSON() {
    return {
      name: this.name,
      type: this.type,
      code: this.code,
      message: this.message,
      userMessage: this.userMessage,
      statusCode: this.statusCode,
      details: this.details,
      timestamp: this.timestamp.toISOString(),
      stack: process.env.NODE_ENV === 'development' ? this.stack : undefined
    };
  }
}

// Error message definitions
export const ERROR_MESSAGES: Record<ErrorCode, ErrorMessage> = {
  [ErrorCode.INVALID_EMAIL]: {
    en: 'Please enter a valid email address',
    ja: '有効なメールアドレスを入力してください'
  },
  [ErrorCode.INVALID_PASSWORD]: {
    en: 'Password must be at least 6 characters long',
    ja: 'パスワードは6文字以上で入力してください'
  },
  [ErrorCode.REQUIRED_FIELD]: {
    en: 'This field is required',
    ja: 'この項目は必須です'
  },
  [ErrorCode.INVALID_NUMBER]: {
    en: 'Please enter a valid number',
    ja: '有効な数値を入力してください'
  },
  [ErrorCode.NEGATIVE_VALUE]: {
    en: 'Value cannot be negative',
    ja: '値は負の数にできません'
  },
  [ErrorCode.NETWORK_TIMEOUT]: {
    en: 'Request timed out. Please check your connection and try again',
    ja: 'リクエストがタイムアウトしました。接続を確認して再度お試しください'
  },
  [ErrorCode.NETWORK_OFFLINE]: {
    en: 'You appear to be offline. Please check your connection',
    ja: 'オフラインのようです。接続を確認してください'
  },
  [ErrorCode.CONNECTION_FAILED]: {
    en: 'Failed to connect to server. Please try again',
    ja: 'サーバーへの接続に失敗しました。再度お試しください'
  },
  [ErrorCode.API_UNAVAILABLE]: {
    en: 'Service is temporarily unavailable. Please try again later',
    ja: 'サービスが一時的に利用できません。しばらくしてから再度お試しください'
  },
  [ErrorCode.RATE_LIMIT_EXCEEDED]: {
    en: 'Too many requests. Please wait a moment and try again',
    ja: 'リクエストが多すぎます。しばらく待ってから再度お試しください'
  },
  [ErrorCode.INVALID_CREDENTIALS]: {
    en: 'Invalid email or password',
    ja: 'メールアドレスまたはパスワードが間違っています'
  },
  [ErrorCode.TOKEN_EXPIRED]: {
    en: 'Your session has expired. Please log in again',
    ja: 'セッションが期限切れです。再度ログインしてください'
  },
  [ErrorCode.UNAUTHORIZED]: {
    en: 'You are not authorized to perform this action',
    ja: 'この操作を実行する権限がありません'
  },
  [ErrorCode.COST_GREATER_THAN_PRICE]: {
    en: 'Selling price must be higher than cost price for profit',
    ja: '利益を得るには販売価格は仕入れ価格より高く設定してください'
  },
  [ErrorCode.INVALID_PROFIT_CALCULATION]: {
    en: 'Invalid values for profit calculation',
    ja: '利益計算の値が無効です'
  },
  [ErrorCode.CART_EMPTY]: {
    en: 'Your cart is empty',
    ja: 'カートに商品がありません'
  },
  [ErrorCode.PRODUCT_OUT_OF_STOCK]: {
    en: 'This product is out of stock',
    ja: 'この商品は在庫切れです'
  },
  [ErrorCode.NOT_FOUND]: {
    en: 'The requested resource was not found',
    ja: '要求されたリソースが見つかりません'
  },
  [ErrorCode.FORBIDDEN]: {
    en: 'Access denied',
    ja: 'アクセスが拒否されました'
  },
  [ErrorCode.INTERNAL_SERVER_ERROR]: {
    en: 'Internal server error. Please try again later',
    ja: 'サーバー内部エラーです。しばらくしてから再度お試しください'
  }
};

// Error factory functions
export function createValidationError(
  code: ErrorCode,
  details?: Record<string, any>
): AppError {
  return new AppError(
    ErrorType.VALIDATION,
    code,
    `Validation error: ${code}`,
    ERROR_MESSAGES[code],
    400,
    details
  );
}

export function createNetworkError(
  code: ErrorCode,
  details?: Record<string, any>
): AppError {
  return new AppError(
    ErrorType.NETWORK,
    code,
    `Network error: ${code}`,
    ERROR_MESSAGES[code],
    0, // Network errors don't have HTTP status codes
    details
  );
}

export function createApiError(
  code: ErrorCode,
  statusCode: number,
  details?: Record<string, any>
): AppError {
  return new AppError(
    ErrorType.API,
    code,
    `API error: ${code}`,
    ERROR_MESSAGES[code],
    statusCode,
    details
  );
}

export function createAuthError(
  code: ErrorCode,
  details?: Record<string, any>
): AppError {
  const statusCode = code === ErrorCode.UNAUTHORIZED ? 401 : 
                    code === ErrorCode.TOKEN_EXPIRED ? 401 : 403;
  
  return new AppError(
    ErrorType.AUTH,
    code,
    `Authentication error: ${code}`,
    ERROR_MESSAGES[code],
    statusCode,
    details
  );
}

export function createProfitCalculationError(
  code: ErrorCode,
  details?: Record<string, any>
): AppError {
  return new AppError(
    ErrorType.PROFIT_CALCULATION,
    code,
    `Profit calculation error: ${code}`,
    ERROR_MESSAGES[code],
    400,
    details
  );
}

// Error handling utilities
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function parseHttpError(error: any): AppError {
  if (isAppError(error)) {
    return error;
  }

  // Handle fetch errors
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return createNetworkError(ErrorCode.CONNECTION_FAILED);
  }

  // Handle timeout errors
  if (error.name === 'TimeoutError') {
    return createNetworkError(ErrorCode.NETWORK_TIMEOUT);
  }

  // Handle HTTP response errors
  if (error.status || error.statusCode) {
    const statusCode = error.status || error.statusCode;
    
    switch (statusCode) {
      case 401:
        return createAuthError(ErrorCode.UNAUTHORIZED);
      case 403:
        return createAuthError(ErrorCode.TOKEN_EXPIRED);
      case 404:
        return createApiError(ErrorCode.NOT_FOUND, 404);
      case 429:
        return createApiError(ErrorCode.RATE_LIMIT_EXCEEDED, 429);
      case 500:
        return createApiError(ErrorCode.INTERNAL_SERVER_ERROR, 500);
      default:
        return createApiError(ErrorCode.API_UNAVAILABLE, statusCode);
    }
  }

  // Default unknown error
  return new AppError(
    ErrorType.UNKNOWN,
    ErrorCode.INTERNAL_SERVER_ERROR,
    error.message || 'Unknown error occurred',
    ERROR_MESSAGES[ErrorCode.INTERNAL_SERVER_ERROR],
    500,
    { originalError: error }
  );
}

// Validation utilities
export function validateEmail(email: string): void {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    throw createValidationError(ErrorCode.INVALID_EMAIL, { email });
  }
}

export function validatePassword(password: string): void {
  if (!password || password.length < 6) {
    throw createValidationError(ErrorCode.INVALID_PASSWORD, { length: password?.length });
  }
}

export function validateRequired(value: any, fieldName: string): void {
  if (value === null || value === undefined || value === '') {
    throw createValidationError(ErrorCode.REQUIRED_FIELD, { field: fieldName });
  }
}

export function validatePositiveNumber(value: number, fieldName: string): void {
  if (isNaN(value) || !isFinite(value)) {
    throw createValidationError(ErrorCode.INVALID_NUMBER, { field: fieldName, value });
  }
  if (value < 0) {
    throw createValidationError(ErrorCode.NEGATIVE_VALUE, { field: fieldName, value });
  }
}

export function validateProfitCalculation(cost: number, price: number): void {
  validatePositiveNumber(cost, 'cost');
  validatePositiveNumber(price, 'price');
  
  if (cost >= price) {
    throw createProfitCalculationError(ErrorCode.COST_GREATER_THAN_PRICE, { cost, price });
  }
}

// Async error wrapper
export function withErrorHandling<T extends any[], R>(
  fn: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      throw parseHttpError(error);
    }
  };
}

// React hook for error handling
export function useErrorHandler() {
  const handleError = (error: unknown) => {
    const appError = parseHttpError(error);
    console.error('Application error:', appError.toJSON());
    return appError;
  };

  return { handleError };
}