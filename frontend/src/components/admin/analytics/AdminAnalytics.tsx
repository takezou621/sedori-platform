'use client';

import { AdminStats } from '@/types/admin';

interface AdminAnalyticsProps {
  stats: AdminStats;
}

export function AdminAnalytics({ stats }: AdminAnalyticsProps) {
  const chartData = [
    { name: 'Users', value: stats.totalUsers, change: stats.usersChange },
    { name: 'Products', value: stats.totalProducts, change: stats.productsChange },
    { name: 'Orders', value: stats.totalOrders, change: stats.ordersChange },
    { name: 'Revenue', value: stats.totalRevenue, change: stats.revenueChange },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Analytics Dashboard</h2>
        <p className="text-gray-600">Comprehensive overview of platform performance</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {chartData.map((item, index) => (
          <div key={index} className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-sm font-medium text-gray-500">{item.name}</h3>
            <div className="mt-2 flex items-baseline">
              <p className="text-2xl font-semibold text-gray-900">
                {item.name === 'Revenue' ? `¥${item.value.toLocaleString()}` : item.value.toLocaleString()}
              </p>
              <p className={`ml-2 text-sm font-medium ${item.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {item.change >= 0 ? '+' : ''}{item.change}%
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Growth Trends</h3>
          <div className="space-y-4">
            <div className="text-center text-gray-500 py-8">
              📈 Chart visualization would go here
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Metrics</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Average Order Value</span>
              <span className="font-semibold">¥{(stats.totalRevenue / (stats.totalOrders || 1)).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Products per User</span>
              <span className="font-semibold">{(stats.totalProducts / (stats.totalUsers || 1)).toFixed(1)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Orders per User</span>
              <span className="font-semibold">{(stats.totalOrders / (stats.totalUsers || 1)).toFixed(1)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}