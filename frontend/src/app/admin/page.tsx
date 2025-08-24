'use client';

import { useState, useEffect } from 'react';
import { AdminStats } from '@/types/admin';
import { Card, Button } from '@/components/ui';
import { AdminOnlyAccess } from '@/components/common';
import { useRole } from '@/hooks';
import Link from 'next/link';

export default function AdminPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { isAdmin, isAuthenticated, isLoading } = useRole();

  useEffect(() => {
    // Mock data for now
    setStats({
      totalUsers: 1247,
      totalProducts: 89,
      totalOrders: 342,
      totalRevenue: 45678.90,
      recentOrders: [],
      topProducts: []
    });
    setLoading(false);
  }, []);

  // Show loading while checking authentication
  if (isLoading || loading) {
    return <div className="p-8">Loading...</div>;
  }

  // Show unauthorized access if not authenticated or not admin
  if (!isAuthenticated || !isAdmin) {
    return <AdminOnlyAccess />;
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600">Manage your platform and monitor performance</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.totalUsers.toLocaleString()}</p>
            </div>
            <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Products</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.totalProducts.toLocaleString()}</p>
            </div>
            <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m0 0v5m0-5h4" />
              </svg>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Orders</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.totalOrders.toLocaleString()}</p>
            </div>
            <div className="h-12 w-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <svg className="h-6 w-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">${stats?.totalRevenue.toLocaleString()}</p>
            </div>
            <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <svg className="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Product Management</h3>
          <p className="text-gray-600 mb-4">Manage your product catalog</p>
          <div className="space-y-2">
            <Link href="/products/new">
              <Button className="w-full">Add New Product</Button>
            </Link>
            <Link href="/products">
              <Button variant="outline" className="w-full">View All Products</Button>
            </Link>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Order Management</h3>
          <p className="text-gray-600 mb-4">Process and track orders</p>
          <div className="space-y-2">
            <Link href="/orders">
              <Button className="w-full">View All Orders</Button>
            </Link>
            <Button variant="outline" className="w-full">Export Orders</Button>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Analytics</h3>
          <p className="text-gray-600 mb-4">View performance metrics</p>
          <div className="space-y-2">
            <Link href="/analytics">
              <Button className="w-full">View Analytics</Button>
            </Link>
            <Button variant="outline" className="w-full">Generate Report</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}