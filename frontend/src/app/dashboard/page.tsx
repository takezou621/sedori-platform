'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui';

export default function DashboardPage() {
  const { user, token, initialize } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    // Initialize auth state from cookies on client side
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (!user || !token) {
      router.push('/login');
    }
  }, [user, token, router]);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-secondary-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-secondary-900">
          Welcome back, {user.name}!
        </h1>
        <p className="text-secondary-600 mt-2">
          Here&apos;s what&apos;s happening with your business today.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Sedori Business Metrics */}
        <Card className="stats analytics">
          <CardHeader>
            <CardTitle className="text-lg">今月の売上</CardTitle>
            <CardDescription>Total revenue this month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary-600">¥1,240,000</div>
            <p className="text-sm text-green-600">+12.5% 前月比</p>
          </CardContent>
        </Card>

        <Card className="stats analytics">
          <CardHeader>
            <CardTitle className="text-lg">純利益</CardTitle>
            <CardDescription>Net profit and margin</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">¥320,000</div>
            <p className="text-sm text-green-600">利益率 25.8%</p>
          </CardContent>
        </Card>

        <Card className="stats analytics">
          <CardHeader>
            <CardTitle className="text-lg">ROI</CardTitle>
            <CardDescription>Return on investment</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">34.6%</div>
            <p className="text-sm text-blue-600">+2.1% 前月比</p>
          </CardContent>
        </Card>

        <Card className="stats analytics">
          <CardHeader>
            <CardTitle className="text-lg">取扱商品数</CardTitle>
            <CardDescription>Active products in catalog</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">1,847</div>
            <p className="text-sm text-orange-600">+127 今月</p>
          </CardContent>
        </Card>
      </div>

      {/* Getting Started Section */}
      <div className="mt-12">
        <Card>
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
            <CardDescription>
              Take these steps to set up your Sedori Platform account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                    <span className="text-primary-600 font-semibold text-sm">1</span>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-secondary-900">
                    Add your first product
                  </h3>
                  <p className="text-sm text-secondary-500">
                    Start by adding products to your catalog
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-secondary-100 rounded-full flex items-center justify-center">
                    <span className="text-secondary-600 font-semibold text-sm">2</span>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-secondary-900">
                    Set up sales tracking
                  </h3>
                  <p className="text-sm text-secondary-500">
                    Configure your sales channels and tracking
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-secondary-100 rounded-full flex items-center justify-center">
                    <span className="text-secondary-600 font-semibold text-sm">3</span>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-secondary-900">
                    Review analytics
                  </h3>
                  <p className="text-sm text-secondary-500">
                    Monitor your business performance with detailed reports
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}