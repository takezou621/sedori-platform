'use client';

import { 
  CubeIcon, 
  ExclamationTriangleIcon, 
  CheckCircleIcon,
  XCircleIcon,
  ArrowTrendingUpIcon 
} from '@heroicons/react/24/outline';
import { Card, Badge } from '@/components/ui';
import { InventoryStatus } from '@/types/analytics';

interface InventoryWidgetProps {
  data: InventoryStatus;
  loading?: boolean;
  className?: string;
}

export function InventoryWidget({ data, loading = false, className = '' }: InventoryWidgetProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const getStockHealthColor = () => {
    const lowStockRatio = data.lowStock / data.totalProducts;
    const outOfStockRatio = data.outOfStock / data.totalProducts;
    
    if (outOfStockRatio > 0.1 || lowStockRatio > 0.2) return 'text-red-600';
    if (outOfStockRatio > 0.05 || lowStockRatio > 0.1) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getStockHealthStatus = () => {
    const lowStockRatio = data.lowStock / data.totalProducts;
    const outOfStockRatio = data.outOfStock / data.totalProducts;
    
    if (outOfStockRatio > 0.1 || lowStockRatio > 0.2) return 'Critical';
    if (outOfStockRatio > 0.05 || lowStockRatio > 0.1) return 'Warning';
    return 'Healthy';
  };

  if (loading) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-secondary-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-secondary-100 rounded w-full"></div>
            <div className="h-4 bg-secondary-100 rounded w-3/4"></div>
            <div className="h-4 bg-secondary-100 rounded w-1/2"></div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-secondary-900">
          Inventory Status
        </h3>
        <div className={`flex items-center ${getStockHealthColor()}`}>
          <span className="text-sm font-medium mr-1">
            {getStockHealthStatus()}
          </span>
          {getStockHealthStatus() === 'Healthy' && <CheckCircleIcon className="h-4 w-4" />}
          {getStockHealthStatus() === 'Warning' && <ExclamationTriangleIcon className="h-4 w-4" />}
          {getStockHealthStatus() === 'Critical' && <XCircleIcon className="h-4 w-4" />}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-center">
            <CubeIcon className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <div className="text-2xl font-bold text-blue-900">
                {data.totalProducts.toLocaleString()}
              </div>
              <div className="text-sm text-blue-600">Total Products</div>
            </div>
          </div>
        </div>

        <div className="bg-green-50 p-4 rounded-lg">
          <div className="flex items-center">
            <CheckCircleIcon className="h-8 w-8 text-green-600 mr-3" />
            <div>
              <div className="text-2xl font-bold text-green-900">
                {data.inStock.toLocaleString()}
              </div>
              <div className="text-sm text-green-600">In Stock</div>
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 p-4 rounded-lg">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-8 w-8 text-yellow-600 mr-3" />
            <div>
              <div className="text-2xl font-bold text-yellow-900">
                {data.lowStock.toLocaleString()}
              </div>
              <div className="text-sm text-yellow-600">Low Stock</div>
            </div>
          </div>
        </div>

        <div className="bg-red-50 p-4 rounded-lg">
          <div className="flex items-center">
            <XCircleIcon className="h-8 w-8 text-red-600 mr-3" />
            <div>
              <div className="text-2xl font-bold text-red-900">
                {data.outOfStock.toLocaleString()}
              </div>
              <div className="text-sm text-red-600">Out of Stock</div>
            </div>
          </div>
        </div>
      </div>

      {/* Stock Distribution */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-secondary-700 mb-3">Stock Distribution</h4>
        <div className="flex h-2 bg-secondary-100 rounded-full overflow-hidden">
          <div 
            className="bg-green-500" 
            style={{ width: `${(data.inStock / data.totalProducts) * 100}%` }}
          />
          <div 
            className="bg-yellow-500" 
            style={{ width: `${(data.lowStock / data.totalProducts) * 100}%` }}
          />
          <div 
            className="bg-red-500" 
            style={{ width: `${(data.outOfStock / data.totalProducts) * 100}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-secondary-600 mt-2">
          <span>In Stock ({((data.inStock / data.totalProducts) * 100).toFixed(1)}%)</span>
          <span>Low Stock ({((data.lowStock / data.totalProducts) * 100).toFixed(1)}%)</span>
          <span>Out of Stock ({((data.outOfStock / data.totalProducts) * 100).toFixed(1)}%)</span>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-secondary-200">
        <div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-secondary-600">Total Inventory Value</span>
            <ArrowTrendingUpIcon className="h-4 w-4 text-secondary-400" />
          </div>
          <div className="text-xl font-bold text-secondary-900 mt-1">
            {formatCurrency(data.totalValue)}
          </div>
        </div>
        
        <div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-secondary-600">Average Turnover</span>
            <ArrowTrendingUpIcon className="h-4 w-4 text-secondary-400" />
          </div>
          <div className="text-xl font-bold text-secondary-900 mt-1">
            {data.averageTurnover.toFixed(1)}x/year
          </div>
        </div>
      </div>

      {/* Action Items */}
      {(data.lowStock > 0 || data.outOfStock > 0) && (
        <div className="mt-6 pt-4 border-t border-secondary-200">
          <h4 className="text-sm font-medium text-secondary-700 mb-3">Action Required</h4>
          <div className="space-y-2">
            {data.outOfStock > 0 && (
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <div className="flex items-center">
                  <XCircleIcon className="h-4 w-4 text-red-600 mr-2" />
                  <span className="text-sm text-red-800">
                    {data.outOfStock} products out of stock
                  </span>
                </div>
                <Badge className="bg-red-100 text-red-800">
                  Urgent
                </Badge>
              </div>
            )}
            
            {data.lowStock > 0 && (
              <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                <div className="flex items-center">
                  <ExclamationTriangleIcon className="h-4 w-4 text-yellow-600 mr-2" />
                  <span className="text-sm text-yellow-800">
                    {data.lowStock} products running low
                  </span>
                </div>
                <Badge className="bg-yellow-100 text-yellow-800">
                  Restock Soon
                </Badge>
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}