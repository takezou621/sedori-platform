'use client';

import { useState } from 'react';
import { subDays } from 'date-fns';
import { 
  CurrencyYenIcon, 
  ShoppingBagIcon, 
  CubeIcon, 
  ChartBarIcon 
} from '@heroicons/react/24/outline';
import { useAnalytics } from '@/hooks/useAnalytics';
import { DateRange } from '@/types/analytics';
import {
  MetricCard,
  SalesChart,
  ProductPerformanceTable,
  ProfitTrendChart,
  InventoryWidget,
  DateRangePicker,
  AlertsWidget,
} from '@/components/dashboard';

export function DashboardClient() {
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(new Date(), 30),
    to: new Date(),
    period: '30d',
  });

  const { 
    data: analyticsData, 
    isLoading, 
    error 
  } = useAnalytics(dateRange);

  // Mock data for demonstration when API is not available
  const mockData = {
    metrics: {
      totalRevenue: 1250000,
      totalProfit: 425000,
      totalOrders: 156,
      averageOrderValue: 8012,
      profitMargin: 34.0,
      conversionRate: 2.8,
      activeProducts: 89,
      lowStockProducts: 12,
      revenueChange: 12.5,
      profitChange: 18.3,
      ordersChange: -3.2,
      conversionChange: 0.4,
    },
    salesData: Array.from({ length: 30 }, (_, i) => ({
      date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      revenue: Math.floor(Math.random() * 50000) + 30000,
      profit: Math.floor(Math.random() * 20000) + 10000,
      orders: Math.floor(Math.random() * 20) + 5,
      visitors: Math.floor(Math.random() * 200) + 100,
    })),
    topProducts: [
      {
        id: '1',
        name: 'iPhone 15 Pro Max',
        sku: 'APPLE-IP15PM-256',
        revenue: 89000,
        profit: 23400,
        profitMargin: 26.3,
        unitsSold: 23,
        views: 1245,
        conversionRate: 1.8,
        stockLevel: 45,
      },
      {
        id: '2', 
        name: 'MacBook Air M3',
        sku: 'APPLE-MBA-M3-512',
        revenue: 67500,
        profit: 18900,
        profitMargin: 28.0,
        unitsSold: 15,
        views: 892,
        conversionRate: 1.7,
        stockLevel: 8,
      },
      {
        id: '3',
        name: 'Sony WH-1000XM5',
        sku: 'SONY-WH1000XM5-BLK',
        revenue: 45600,
        profit: 15960,
        profitMargin: 35.0,
        unitsSold: 32,
        views: 2156,
        conversionRate: 1.5,
        stockLevel: 0,
      },
    ],
    inventoryStatus: {
      totalProducts: 89,
      inStock: 65,
      lowStock: 12,
      outOfStock: 12,
      totalValue: 4567890,
      averageTurnover: 4.2,
    },
    alerts: [
      {
        id: '1',
        type: 'error' as const,
        title: 'Products Out of Stock',
        description: '12 products are currently out of stock and need immediate restocking.',
        timestamp: new Date().toISOString(),
        actionRequired: true,
        link: '/products?filter=out-of-stock',
      },
      {
        id: '2',
        type: 'warning' as const,
        title: 'Low Stock Alert',
        description: '8 products have low inventory levels (less than 10 units remaining).',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        actionRequired: true,
        link: '/products?filter=low-stock',
      },
      {
        id: '3',
        type: 'info' as const,
        title: 'Weekly Report Available',
        description: 'Your weekly business performance report is ready for review.',
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        actionRequired: false,
        link: '/analytics/reports',
      },
    ],
  };

  // Use mock data if API data is not available
  const data = analyticsData || mockData;
  const metrics = data.metrics;

  if (error && !data) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 mb-4">
          <ChartBarIcon className="h-12 w-12 mx-auto" />
        </div>
        <h3 className="text-lg font-medium text-secondary-900 mb-1">
          Unable to load dashboard data
        </h3>
        <p className="text-secondary-500">
          Please check your connection and try again.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Date Range Picker */}
      <div className="flex justify-end">
        <DateRangePicker
          value={dateRange}
          onChange={setDateRange}
        />
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Revenue"
          value={metrics.totalRevenue}
          change={metrics.revenueChange}
          format="currency"
          icon={<CurrencyYenIcon className="h-6 w-6" />}
        />
        <MetricCard
          title="Total Profit"
          value={metrics.totalProfit}
          change={metrics.profitChange}
          format="currency"
          icon={<ChartBarIcon className="h-6 w-6" />}
        />
        <MetricCard
          title="Total Orders"
          value={metrics.totalOrders}
          change={metrics.ordersChange}
          format="number"
          icon={<ShoppingBagIcon className="h-6 w-6" />}
        />
        <MetricCard
          title="Active Products"
          value={metrics.activeProducts}
          format="number"
          icon={<CubeIcon className="h-6 w-6" />}
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Average Order Value"
          value={metrics.averageOrderValue}
          format="currency"
        />
        <MetricCard
          title="Profit Margin"
          value={metrics.profitMargin}
          format="percentage"
        />
        <MetricCard
          title="Conversion Rate"
          value={metrics.conversionRate}
          change={metrics.conversionChange}
          format="percentage"
        />
        <MetricCard
          title="Low Stock Products"
          value={metrics.lowStockProducts}
          format="number"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SalesChart 
          data={data.salesData} 
          loading={isLoading}
        />
        <ProfitTrendChart 
          data={data.salesData} 
          loading={isLoading}
        />
      </div>

      {/* Analytics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ProductPerformanceTable 
            products={data.topProducts} 
            loading={isLoading}
          />
        </div>
        <div>
          <InventoryWidget 
            data={data.inventoryStatus} 
            loading={isLoading}
          />
        </div>
      </div>

      {/* Alerts Row */}
      <div className="grid grid-cols-1">
        <AlertsWidget 
          alerts={data.alerts} 
          loading={isLoading}
        />
      </div>
    </div>
  );
}