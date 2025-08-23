'use client';

import { Suspense } from 'react';
import { DashboardClient } from './components/DashboardClient';

export default function DashboardPage() {
  return (
    <div className="bg-secondary-50 min-h-screen">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-secondary-200 p-6 mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-secondary-900">
            Dashboard
          </h1>
          <p className="mt-2 text-secondary-600">
            Welcome to your Sedori Platform dashboard. Monitor your business performance and key metrics.
          </p>
        </div>

        {/* Dashboard Content */}
        <Suspense
          fallback={
            <div className="grid grid-cols-1 gap-6">
              {/* Loading Skeleton */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="bg-white p-6 rounded-lg shadow-sm border border-secondary-200">
                    <div className="animate-pulse">
                      <div className="h-4 bg-secondary-200 rounded w-1/2 mb-3"></div>
                      <div className="h-8 bg-secondary-200 rounded w-3/4"></div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-lg shadow-sm border border-secondary-200">
                  <div className="animate-pulse">
                    <div className="h-6 bg-secondary-200 rounded w-1/3 mb-4"></div>
                    <div className="h-64 bg-secondary-100 rounded"></div>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border border-secondary-200">
                  <div className="animate-pulse">
                    <div className="h-6 bg-secondary-200 rounded w-1/3 mb-4"></div>
                    <div className="h-64 bg-secondary-100 rounded"></div>
                  </div>
                </div>
              </div>
            </div>
          }
        >
          <DashboardClient />
        </Suspense>
      </div>
    </div>
  );
}