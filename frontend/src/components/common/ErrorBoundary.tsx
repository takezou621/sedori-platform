'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error?: Error; resetError: () => void }>;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return <FallbackComponent error={this.state.error} resetError={this.resetError} />;
    }

    return this.props.children;
  }
}

function DefaultErrorFallback({ 
  error, 
  resetError 
}: { 
  error?: Error; 
  resetError: () => void;
}) {
  const [showDetails, setShowDetails] = useState(false);
  const [reportSent, setReportSent] = useState(false);
  
  const sendErrorReport = async () => {
    try {
      // Send error report to monitoring service
      await fetch('/api/error-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: error?.message,
          stack: error?.stack,
          url: window.location.href,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString()
        })
      });
      setReportSent(true);
    } catch {
      // Ignore if error reporting fails
    }
  };
  
  return (
    <div className="min-h-[400px] flex items-center justify-center p-4">
      <div className="text-center max-w-lg mx-auto">
        <div className="mb-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 mb-4">
            <svg
              className="h-8 w-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
        </div>
        
        <h2 className="text-xl font-bold text-secondary-900 mb-2">
          申し訳ございません / Something went wrong
        </h2>
        
        <p className="text-sm text-secondary-600 mb-6 leading-relaxed">
          予期しないエラーが発生しました。ページを再読み込みするか、しばらく時間をおいてから再度お試しください。<br />
          <span className="text-xs">An unexpected error occurred. Please reload the page or try again later.</span>
        </p>
        
        {error?.message && (
          <div className="mb-6 p-3 bg-gray-50 rounded-lg text-sm text-gray-700">
            <strong>エラー詳細:</strong> {error.message}
          </div>
        )}
        
        <div className="space-y-3 mb-6">
          <div className="flex space-x-3 justify-center">
            <Button onClick={resetError} className="min-w-[120px]">
              再試行 / Try Again
            </Button>
            <Button
              variant="outline"
              onClick={() => window.location.reload()}
              className="min-w-[120px]"
            >
              ページ再読み込み / Reload
            </Button>
          </div>
          
          <div className="flex space-x-3 justify-center">
            <Button
              variant="outline"
              onClick={() => window.location.href = '/'}
              size="sm"
            >
              ホームに戻る / Home
            </Button>
            
            {!reportSent && (
              <Button
                variant="outline"
                onClick={sendErrorReport}
                size="sm"
                className="text-xs"
              >
                エラーレポート送信 / Report Error
              </Button>
            )}
            
            {reportSent && (
              <span className="text-xs text-green-600 flex items-center">
                ✓ レポートを送信しました / Report sent
              </span>
            )}
          </div>
        </div>
        
        {process.env.NODE_ENV === 'development' && error?.stack && (
          <details className="text-left">
            <summary 
              className="text-xs text-secondary-500 cursor-pointer hover:text-secondary-700 mb-2"
              onClick={() => setShowDetails(!showDetails)}
            >
              開発者向け詳細 / Developer Details {showDetails ? '▼' : '▶'}
            </summary>
            {showDetails && (
              <div className="mt-2 p-3 bg-gray-900 text-green-400 rounded text-xs font-mono overflow-auto max-h-48">
                <div className="mb-2 text-yellow-400">Error: {error?.name}</div>
                <div className="mb-2 text-red-400">Message: {error?.message}</div>
                <div className="text-gray-300 whitespace-pre-wrap">
                  {error?.stack}
                </div>
              </div>
            )}
          </details>
        )}
      </div>
    </div>
  );
}

// React Error Boundary Hook for functional components
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ComponentType<{ error?: Error; resetError: () => void }>
) {
  return function WithErrorBoundaryComponent(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}

// Enhanced API Error Display with more comprehensive error handling
export function ApiErrorDisplay({ 
  error, 
  onRetry,
  showDetails = false,
  className = ''
}: { 
  error: { message: string; statusCode?: number; code?: string }; 
  onRetry?: () => void;
  showDetails?: boolean;
  className?: string;
}) {
  const getErrorIcon = (statusCode?: number) => {
    switch (statusCode) {
      case 404:
        return (
          <svg className="h-5 w-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case 401:
      case 403:
        return (
          <svg className="h-5 w-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        );
      case 500:
      case 502:
      case 503:
        return (
          <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return (
          <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  const getErrorTitle = (statusCode?: number, code?: string) => {
    if (statusCode === 404) return 'リソースが見つかりません / Not Found';
    if (statusCode === 401) return '認証が必要です / Authentication Required';
    if (statusCode === 403) return 'アクセスが拒否されました / Access Denied';
    if (statusCode === 429) return 'リクエストが多すぎます / Too Many Requests';
    if (statusCode && statusCode >= 500) return 'サーバーエラー / Server Error';
    if (code === 'NETWORK_ERROR') return 'ネットワークエラー / Network Error';
    return 'エラーが発生しました / Error Occurred';
  };

  const getBgColor = (statusCode?: number) => {
    if (statusCode === 404) return 'bg-orange-50';
    if (statusCode === 401 || statusCode === 403) return 'bg-yellow-50';
    return 'bg-red-50';
  };

  const getTextColor = (statusCode?: number) => {
    if (statusCode === 404) return 'text-orange-800';
    if (statusCode === 401 || statusCode === 403) return 'text-yellow-800';
    return 'text-red-800';
  };

  const getMessageColor = (statusCode?: number) => {
    if (statusCode === 404) return 'text-orange-700';
    if (statusCode === 401 || statusCode === 403) return 'text-yellow-700';
    return 'text-red-700';
  };

  return (
    <div className={`rounded-md ${getBgColor(error.statusCode)} p-4 ${className}`}>
      <div className="flex">
        <div className="flex-shrink-0">
          {getErrorIcon(error.statusCode)}
        </div>
        <div className="ml-3 flex-grow">
          <h3 className={`text-sm font-medium ${getTextColor(error.statusCode)}`}>
            {getErrorTitle(error.statusCode, error.code)}
          </h3>
          <div className={`mt-2 text-sm ${getMessageColor(error.statusCode)}`}>
            <p>{error.message}</p>
          </div>
          
          {showDetails && error.statusCode && (
            <div className="mt-2">
              <details className="text-xs">
                <summary className="cursor-pointer hover:underline">
                  技術詳細 / Technical Details
                </summary>
                <div className="mt-2 p-2 bg-gray-100 rounded text-gray-800">
                  <p>Status Code: {error.statusCode}</p>
                  {error.code && <p>Error Code: {error.code}</p>}
                  <p>Time: {new Date().toLocaleString()}</p>
                </div>
              </details>
            </div>
          )}
          
          {onRetry && (
            <div className="mt-4 flex space-x-2">
              <Button
                size="sm"
                variant="outline"
                onClick={onRetry}
                className={`${
                  error.statusCode === 404 ? 'bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100' :
                  error.statusCode === 401 || error.statusCode === 403 ? 'bg-yellow-50 border-yellow-200 text-yellow-700 hover:bg-yellow-100' :
                  'bg-red-50 border-red-200 text-red-700 hover:bg-red-100'
                }`}
              >
                再試行 / Try Again
              </Button>
              
              {(error.statusCode === 401 || error.statusCode === 403) && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.location.href = '/auth/login'}
                  className="bg-yellow-50 border-yellow-200 text-yellow-700 hover:bg-yellow-100"
                >
                  ログイン / Login
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Specific Error Boundary for Cart functionality
export function CartErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary
      fallback={({ error, resetError }) => (
        <div className="min-h-[200px] flex items-center justify-center p-6">
          <div className="text-center">
            <div className="mb-4">
              <svg className="mx-auto h-12 w-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.1 5M7 13l-1.1 5m0 0h9.1M16 18a2 2 0 11-4 0 2 2 0 014 0zm-8 0a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              カートでエラーが発生しました / Cart Error
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              カートの読み込み中にエラーが発生しました。再試行するか、ページを更新してください。
            </p>
            <div className="space-x-3">
              <Button onClick={resetError}>
                再試行 / Retry
              </Button>
              <Button
                variant="outline"
                onClick={() => window.location.href = '/products'}
              >
                商品一覧へ / Products
              </Button>
            </div>
          </div>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  );
}

// Specific Error Boundary for Authentication functionality
export function AuthErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary
      fallback={({ error, resetError }) => (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <div className="text-center max-w-md">
            <div className="mb-4">
              <svg className="mx-auto h-12 w-12 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              認証エラーが発生しました / Authentication Error
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              認証処理中にエラーが発生しました。再試行するか、別の方法でログインをお試しください。
            </p>
            <div className="space-y-3">
              <Button onClick={resetError} className="w-full">
                再試行 / Retry
              </Button>
              <Button
                variant="outline"
                onClick={() => window.location.href = '/'}
                className="w-full"
              >
                ホームに戻る / Home
              </Button>
            </div>
          </div>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  );
}

export default ErrorBoundary;