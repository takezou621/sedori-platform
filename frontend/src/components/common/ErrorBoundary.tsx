'use client';

import React from 'react';
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
  return (
    <div className="min-h-[400px] flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-4">
        <div className="mb-6">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <svg
              className="h-6 w-6 text-red-600"
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
        <h2 className="text-lg font-semibold text-secondary-900 mb-2">
          Something went wrong
        </h2>
        <p className="text-sm text-secondary-600 mb-6">
          {error?.message || 'An unexpected error occurred'}
        </p>
        <div className="space-x-3">
          <Button onClick={resetError}>
            Try again
          </Button>
          <Button
            variant="outline"
            onClick={() => window.location.reload()}
          >
            Reload page
          </Button>
        </div>
        {process.env.NODE_ENV === 'development' && error?.stack && (
          <details className="mt-6 text-left">
            <summary className="text-xs text-secondary-500 cursor-pointer hover:text-secondary-700">
              Error details (development only)
            </summary>
            <pre className="mt-2 text-xs bg-secondary-100 p-2 rounded overflow-auto text-secondary-800">
              {error.stack}
            </pre>
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

// Utility for displaying API errors
export function ApiErrorDisplay({ 
  error, 
  onRetry 
}: { 
  error: { message: string; statusCode?: number }; 
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-md bg-red-50 p-4">
      <div className="flex">
        <div className="flex-shrink-0">
          <svg
            className="h-5 w-5 text-red-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-red-800">
            {error.statusCode === 404 ? 'Not Found' : 'Error'}
          </h3>
          <div className="mt-2 text-sm text-red-700">
            <p>{error.message}</p>
          </div>
          {onRetry && (
            <div className="mt-4">
              <Button
                size="sm"
                variant="outline"
                onClick={onRetry}
                className="bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
              >
                Try again
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ErrorBoundary;