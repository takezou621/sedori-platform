'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Product } from '@/types/product';
import { Card } from '@/components/ui/Card';

interface ProductCardProps {
  product: Product;
  priority?: boolean;
}

export function ProductCard({ product, priority = false }: ProductCardProps) {
  const profitMargin = product.profitabilityData?.margin || 0;
  const roi = product.profitabilityData?.roi || 0;

  const formatPrice = (price: number, currency: string = 'JPY') => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: currency,
    }).format(price);
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'new':
        return 'bg-green-100 text-green-800';
      case 'used':
        return 'bg-yellow-100 text-yellow-800';
      case 'refurbished':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getProfitColor = (margin: number) => {
    if (margin >= 20) return 'text-green-600';
    if (margin >= 10) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
    >
      <Link href={`/products/${product.id}`}>
        <Card className="h-full overflow-hidden hover:shadow-lg transition-shadow">
          <div className="relative aspect-square">
            <Image
              src={product.primaryImageUrl || product.images?.[0] || '/placeholder-product.jpg'}
              alt={product.name}
              fill
              className="object-cover"
              priority={priority}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
            />
            <div className="absolute top-2 left-2 flex gap-1">
              <span
                className={`px-2 py-1 text-xs font-medium rounded-full ${getConditionColor(
                  product.condition
                )}`}
              >
                {product.condition}
              </span>
              {product.status === 'draft' && (
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                  Draft
                </span>
              )}
            </div>
            {product.stockQuantity !== undefined && product.stockQuantity <= 5 && (
              <div className="absolute top-2 right-2">
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                  Low Stock
                </span>
              </div>
            )}
          </div>

          <div className="p-4">
            <div className="mb-2">
              {product.brand && (
                <span className="text-sm text-secondary-600 font-medium">
                  {product.brand}
                </span>
              )}
              <h3 className="font-semibold text-secondary-900 line-clamp-2 leading-tight">
                {product.name}
              </h3>
            </div>

            {product.category && (
              <div className="mb-2">
                <span className="text-xs text-secondary-500 bg-secondary-100 px-2 py-1 rounded">
                  {product.category.name}
                </span>
              </div>
            )}

            <div className="space-y-2 mb-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-secondary-600">Wholesale:</span>
                <span className="font-semibold text-secondary-900">
                  {formatPrice(product.wholesalePrice, product.currency)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-secondary-600">Retail:</span>
                <span className="font-semibold text-primary-600">
                  {formatPrice(product.retailPrice, product.currency)}
                </span>
              </div>
              {product.marketPrice && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-secondary-600">Market:</span>
                  <span className="text-sm text-secondary-700">
                    {formatPrice(product.marketPrice, product.currency)}
                  </span>
                </div>
              )}
            </div>

            <div className="border-t pt-3 space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-sm text-secondary-600">Margin:</span>
                <span className={`font-semibold ${getProfitColor(profitMargin)}`}>
                  {profitMargin.toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-secondary-600">ROI:</span>
                <span className={`font-semibold ${getProfitColor(roi)}`}>
                  {roi.toFixed(1)}%
                </span>
              </div>
              {product.profitabilityData?.estimatedProfit && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-secondary-600">Est. Profit:</span>
                  <span className="font-semibold text-green-600">
                    {formatPrice(product.profitabilityData.estimatedProfit, product.currency)}
                  </span>
                </div>
              )}
            </div>

            {product.tags && product.tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1">
                {product.tags.slice(0, 3).map((tag, index) => (
                  <span
                    key={index}
                    className="text-xs bg-primary-50 text-primary-700 px-2 py-1 rounded"
                  >
                    {tag}
                  </span>
                ))}
                {product.tags.length > 3 && (
                  <span className="text-xs text-secondary-500">
                    +{product.tags.length - 3} more
                  </span>
                )}
              </div>
            )}
          </div>
        </Card>
      </Link>
    </motion.div>
  );
}