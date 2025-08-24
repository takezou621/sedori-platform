'use client';

import React from 'react';
import { LoadingSpinner } from './LoadingSpinner';

// Generic loading state component
export function LoadingState({
  message = 'Loading...',
  messageJa = '読み込み中...',
  size = 'md',
  className = ''
}: {
  message?: string;
  messageJa?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  return (
    <div className={`flex items-center justify-center p-8 ${className}`}>
      <div className="text-center">
        <LoadingSpinner size={size} />
        <p className="mt-3 text-sm text-gray-600">
          {messageJa} / {message}
        </p>
      </div>
    </div>
  );
}

// Card loading skeleton
export function CardSkeleton({ count = 1 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="bg-white border border-gray-200 rounded-lg p-4 animate-pulse">
          <div className="h-48 bg-gray-300 rounded mb-4"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-300 rounded w-3/4"></div>
            <div className="h-3 bg-gray-300 rounded w-1/2"></div>
            <div className="flex justify-between items-center mt-4">
              <div className="h-6 bg-gray-300 rounded w-1/3"></div>
              <div className="h-4 bg-gray-300 rounded w-1/4"></div>
            </div>
            <div className="h-8 bg-gray-300 rounded mt-4"></div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Table loading skeleton
export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="px-4 py-5 sm:p-6">
        <div className="animate-pulse">
          {/* Header */}
          <div className="grid gap-4 mb-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
            {Array.from({ length: columns }, (_, i) => (
              <div key={`header-${i}`} className="h-4 bg-gray-300 rounded"></div>
            ))}
          </div>
          
          {/* Rows */}
          {Array.from({ length: rows }, (_, rowIndex) => (
            <div key={rowIndex} className="grid gap-4 mb-3" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
              {Array.from({ length: columns }, (_, colIndex) => (
                <div key={`row-${rowIndex}-col-${colIndex}`} className="h-3 bg-gray-200 rounded"></div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Product loading skeleton
export function ProductSkeleton() {
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden animate-pulse">
      <div className="h-48 bg-gray-300"></div>
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <div className="h-4 bg-gray-300 rounded w-3/4"></div>
          <div className="h-5 bg-gray-300 rounded w-16"></div>
        </div>
        <div className="h-3 bg-gray-200 rounded w-full mb-1"></div>
        <div className="h-3 bg-gray-200 rounded w-2/3 mb-2"></div>
        <div className="h-4 bg-gray-300 rounded w-20 mb-3"></div>
        <div className="flex justify-between items-center mb-3">
          <div>
            <div className="h-5 bg-gray-300 rounded w-16 mb-1"></div>
            <div className="h-3 bg-gray-200 rounded w-20"></div>
          </div>
          <div className="text-right">
            <div className="h-4 bg-gray-300 rounded w-12 mb-1"></div>
            <div className="h-3 bg-gray-200 rounded w-16"></div>
          </div>
        </div>
        <div className="space-y-2">
          <div className="h-8 bg-gray-300 rounded"></div>
          <div className="h-8 bg-gray-200 rounded"></div>
        </div>
      </div>
    </div>
  );
}

// Form loading skeleton
export function FormSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="bg-white p-6 rounded-lg border">
        <div className="h-6 bg-gray-300 rounded w-1/3 mb-4"></div>
        <div className="space-y-4">
          <div className="h-10 bg-gray-200 rounded"></div>
          <div className="h-24 bg-gray-200 rounded"></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg border">
        <div className="h-6 bg-gray-300 rounded w-1/4 mb-4"></div>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="h-10 bg-gray-200 rounded"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
        <div className="h-32 bg-gray-100 rounded"></div>
      </div>
      
      <div className="flex justify-end space-x-3">
        <div className="h-10 bg-gray-200 rounded w-24"></div>
        <div className="h-10 bg-gray-300 rounded w-32"></div>
      </div>
    </div>
  );
}

// Dashboard loading skeleton
export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="bg-white p-6 rounded-lg border">
            <div className="flex items-center justify-between mb-2">
              <div className="h-4 bg-gray-300 rounded w-1/2"></div>
              <div className="h-8 w-8 bg-gray-300 rounded"></div>
            </div>
            <div className="h-8 bg-gray-300 rounded w-1/3 mb-1"></div>
            <div className="h-3 bg-gray-200 rounded w-1/4"></div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg border">
          <div className="h-6 bg-gray-300 rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-gray-100 rounded"></div>
        </div>
        <div className="bg-white p-6 rounded-lg border">
          <div className="h-6 bg-gray-300 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-100 rounded"></div>
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="bg-white rounded-lg border">
        <div className="p-6 border-b">
          <div className="h-6 bg-gray-300 rounded w-1/4"></div>
        </div>
        <TableSkeleton rows={5} columns={5} />
      </div>
    </div>
  );
}

// Cart loading skeleton
export function CartSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="bg-white border rounded-lg">
        <div className="p-6">
          <div className="h-6 bg-gray-300 rounded w-1/3 mb-4"></div>
          <div className="space-y-4">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
                <div className="h-16 w-16 bg-gray-300 rounded"></div>
                <div className="flex-grow">
                  <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2 mb-1"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="h-8 w-8 bg-gray-300 rounded"></div>
                  <div className="h-4 w-8 bg-gray-300 rounded"></div>
                  <div className="h-8 w-8 bg-gray-300 rounded"></div>
                </div>
                <div className="text-right">
                  <div className="h-5 bg-gray-300 rounded w-16 mb-1"></div>
                  <div className="h-3 bg-gray-200 rounded w-12"></div>
                </div>
                <div className="h-8 w-12 bg-gray-300 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Cart Summary */}
      <div className="bg-gray-50 rounded-lg p-6">
        <div className="h-6 bg-gray-300 rounded w-1/4 mb-4"></div>
        <div className="space-y-2 mb-6">
          <div className="flex justify-between">
            <div className="h-4 bg-gray-300 rounded w-16"></div>
            <div className="h-4 bg-gray-300 rounded w-20"></div>
          </div>
          <div className="flex justify-between">
            <div className="h-4 bg-gray-300 rounded w-12"></div>
            <div className="h-4 bg-gray-300 rounded w-16"></div>
          </div>
          <div className="flex justify-between font-semibold">
            <div className="h-4 bg-gray-300 rounded w-16"></div>
            <div className="h-4 bg-gray-300 rounded w-20"></div>
          </div>
        </div>
        <div className="h-12 bg-gray-300 rounded mb-4"></div>
        <div className="h-20 bg-gray-200 rounded"></div>
      </div>
    </div>
  );
}

// Generic empty state component
export function EmptyState({
  icon,
  title,
  titleJa,
  description,
  descriptionJa,
  actionText,
  actionTextJa,
  onAction,
  className = ''
}: {
  icon: React.ReactNode;
  title: string;
  titleJa?: string;
  description: string;
  descriptionJa?: string;
  actionText?: string;
  actionTextJa?: string;
  onAction?: () => void;
  className?: string;
}) {
  return (
    <div className={`text-center py-12 px-4 ${className}`}>
      <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        {titleJa || title}
      </h3>
      <p className="text-gray-600 mb-6 max-w-md mx-auto">
        {descriptionJa || description}
      </p>
      {onAction && actionText && (
        <button
          onClick={onAction}
          className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors"
        >
          {actionTextJa || actionText}
        </button>
      )}
    </div>
  );
}

// Offline state component
export function OfflineState({
  onRetry,
  className = ''
}: {
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div className={`text-center py-12 px-4 bg-yellow-50 border border-yellow-200 rounded-lg ${className}`}>
      <div className="mx-auto w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 2v2m0 16v2m10-10h-2M4 12H2" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-yellow-900 mb-2">
        オフライン / You&apos;re Offline
      </h3>
      <p className="text-yellow-800 mb-6 max-w-md mx-auto">
        インターネット接続を確認してください。キャッシュされたデータを表示しています。<br />
        <span className="text-sm">Please check your internet connection. Showing cached data.</span>
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 transition-colors"
        >
          再試行 / Retry
        </button>
      )}
    </div>
  );
}