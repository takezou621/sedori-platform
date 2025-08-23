'use client';

import Link from 'next/link';
import { EyeIcon } from '@heroicons/react/24/outline';
import { Card, Badge } from '@/components/ui';
import { ProductPerformance } from '@/types/analytics';

interface ProductPerformanceTableProps {
  products: ProductPerformance[];
  loading?: boolean;
  className?: string;
}

export function ProductPerformanceTable({ 
  products, 
  loading = false, 
  className = '' 
}: ProductPerformanceTableProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const getStockStatusColor = (stockLevel: number) => {
    if (stockLevel === 0) return 'bg-red-100 text-red-800';
    if (stockLevel <= 10) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  const getStockStatusText = (stockLevel: number) => {
    if (stockLevel === 0) return 'Out of Stock';
    if (stockLevel <= 10) return 'Low Stock';
    return 'In Stock';
  };

  const getProfitMarginColor = (margin: number) => {
    if (margin >= 30) return 'text-green-600';
    if (margin >= 15) return 'text-blue-600';
    if (margin >= 5) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-secondary-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-secondary-100 rounded"></div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  if (!products || products.length === 0) {
    return (
      <Card className={`p-6 ${className}`}>
        <h3 className="text-lg font-semibold text-secondary-900 mb-4">
          Top Performing Products
        </h3>
        <div className="text-center py-8">
          <p className="text-secondary-500">No product performance data available.</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-secondary-900">
          Top Performing Products
        </h3>
        <Link 
          href="/products" 
          className="text-sm text-primary-600 hover:text-primary-700 font-medium"
        >
          View All Products →
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-secondary-200">
              <th className="text-left py-3 px-2 text-xs font-medium text-secondary-500 uppercase tracking-wider">
                Product
              </th>
              <th className="text-right py-3 px-2 text-xs font-medium text-secondary-500 uppercase tracking-wider">
                Revenue
              </th>
              <th className="text-right py-3 px-2 text-xs font-medium text-secondary-500 uppercase tracking-wider">
                Profit
              </th>
              <th className="text-right py-3 px-2 text-xs font-medium text-secondary-500 uppercase tracking-wider">
                Margin
              </th>
              <th className="text-right py-3 px-2 text-xs font-medium text-secondary-500 uppercase tracking-wider">
                Units Sold
              </th>
              <th className="text-right py-3 px-2 text-xs font-medium text-secondary-500 uppercase tracking-wider">
                Conversion
              </th>
              <th className="text-center py-3 px-2 text-xs font-medium text-secondary-500 uppercase tracking-wider">
                Stock
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-secondary-100">
            {products.map((product, index) => (
              <tr key={product.id} className="hover:bg-secondary-50 transition-colors">
                <td className="py-4 px-2">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center mr-3">
                      <span className="text-sm font-medium text-primary-700">
                        {index + 1}
                      </span>
                    </div>
                    <div>
                      <Link
                        href={`/products/${product.id}`}
                        className="text-sm font-medium text-secondary-900 hover:text-primary-600"
                      >
                        {product.name}
                      </Link>
                      <p className="text-xs text-secondary-500 mt-1">
                        SKU: {product.sku}
                      </p>
                    </div>
                  </div>
                </td>
                
                <td className="py-4 px-2 text-right">
                  <div className="text-sm font-medium text-secondary-900">
                    {formatCurrency(product.revenue)}
                  </div>
                </td>
                
                <td className="py-4 px-2 text-right">
                  <div className="text-sm font-medium text-secondary-900">
                    {formatCurrency(product.profit)}
                  </div>
                </td>
                
                <td className="py-4 px-2 text-right">
                  <div className={`text-sm font-medium ${getProfitMarginColor(product.profitMargin)}`}>
                    {product.profitMargin.toFixed(1)}%
                  </div>
                </td>
                
                <td className="py-4 px-2 text-right">
                  <div className="text-sm text-secondary-900">
                    {product.unitsSold.toLocaleString()}
                  </div>
                </td>
                
                <td className="py-4 px-2 text-right">
                  <div className="flex items-center justify-end">
                    <span className="text-sm text-secondary-900 mr-2">
                      {product.conversionRate.toFixed(1)}%
                    </span>
                    <div className="flex items-center text-xs text-secondary-500">
                      <EyeIcon className="h-3 w-3 mr-1" />
                      {product.views.toLocaleString()}
                    </div>
                  </div>
                </td>
                
                <td className="py-4 px-2 text-center">
                  <Badge className={getStockStatusColor(product.stockLevel)}>
                    {getStockStatusText(product.stockLevel)}
                  </Badge>
                  <div className="text-xs text-secondary-500 mt-1">
                    {product.stockLevel} units
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}