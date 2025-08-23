'use client';

import { AdminStats } from '@/types/admin';

interface AdminStatsCardsProps {
  stats: AdminStats;
}

export function AdminStatsCards({ stats }: AdminStatsCardsProps) {
  const statsCards = [
    {
      title: 'Total Users',
      value: stats.totalUsers,
      change: stats.usersChange,
      icon: '👥',
    },
    {
      title: 'Total Products',
      value: stats.totalProducts,
      change: stats.productsChange,
      icon: '📦',
    },
    {
      title: 'Total Orders',
      value: stats.totalOrders,
      change: stats.ordersChange,
      icon: '🛒',
    },
    {
      title: 'Total Revenue',
      value: `¥${stats.totalRevenue.toLocaleString()}`,
      change: stats.revenueChange,
      icon: '💰',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {statsCards.map((card, index) => (
        <div key={index} className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{card.title}</p>
              <p className="text-2xl font-bold text-gray-900">{card.value}</p>
            </div>
            <div className="text-2xl">{card.icon}</div>
          </div>
          <div className="mt-2">
            <span
              className={`text-sm font-medium ${
                card.change >= 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {card.change >= 0 ? '+' : ''}
              {card.change}%
            </span>
            <span className="text-sm text-gray-600"> from last month</span>
          </div>
        </div>
      ))}
    </div>
  );
}