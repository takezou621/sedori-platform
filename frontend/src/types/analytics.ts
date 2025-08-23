export interface DashboardMetrics {
  totalRevenue: number;
  totalProfit: number;
  totalOrders: number;
  averageOrderValue: number;
  profitMargin: number;
  conversionRate: number;
  activeProducts: number;
  lowStockProducts: number;
  revenueChange: number;
  profitChange: number;
  ordersChange: number;
  conversionChange: number;
}

export interface SalesData {
  date: string;
  revenue: number;
  profit: number;
  orders: number;
  visitors: number;
}

export interface ProductPerformance {
  id: string;
  name: string;
  sku: string;
  revenue: number;
  profit: number;
  profitMargin: number;
  unitsSold: number;
  views: number;
  conversionRate: number;
  stockLevel: number;
}

export interface CategoryAnalytics {
  id: string;
  name: string;
  revenue: number;
  profit: number;
  productCount: number;
  averageMargin: number;
  growth: number;
}

export interface TopSupplier {
  id: string;
  name: string;
  productCount: number;
  totalRevenue: number;
  averageMargin: number;
  reliability: number;
}

export interface InventoryStatus {
  totalProducts: number;
  inStock: number;
  lowStock: number;
  outOfStock: number;
  totalValue: number;
  averageTurnover: number;
}

export interface MarketTrend {
  category: string;
  trend: 'up' | 'down' | 'stable';
  change: number;
  opportunity: 'high' | 'medium' | 'low';
  description: string;
}

export interface AlertItem {
  id: string;
  type: 'warning' | 'info' | 'success' | 'error';
  title: string;
  description: string;
  timestamp: string;
  actionRequired: boolean;
  link?: string;
}

export interface DateRange {
  from: Date;
  to: Date;
  period: '7d' | '30d' | '90d' | '1y' | 'custom';
}

export interface AnalyticsResponse {
  metrics: DashboardMetrics;
  salesData: SalesData[];
  topProducts: ProductPerformance[];
  categoryAnalytics: CategoryAnalytics[];
  topSuppliers: TopSupplier[];
  inventoryStatus: InventoryStatus;
  marketTrends: MarketTrend[];
  alerts: AlertItem[];
}