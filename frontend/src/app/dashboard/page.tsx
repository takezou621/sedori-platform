'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui';

export default function DashboardPage() {
  const { user, token } = useAuthStore();
  const router = useRouter();

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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Quick Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Total Products</CardTitle>
            <CardDescription>Active products in your catalog</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary-600">0</div>
            <p className="text-sm text-secondary-500">No products yet</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Total Sales</CardTitle>
            <CardDescription>Revenue this month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">$0</div>
            <p className="text-sm text-secondary-500">No sales yet</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pending Orders</CardTitle>
            <CardDescription>Orders awaiting fulfillment</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">0</div>
            <p className="text-sm text-secondary-500">All caught up!</p>
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