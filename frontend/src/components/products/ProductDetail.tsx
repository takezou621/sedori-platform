'use client';

import { useState } from 'react';
import { StarIcon, HeartIcon, ShareIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid, HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';
import { Product } from '@/types/product';
import { Button, Badge } from '@/components/ui';
import { ProfitAnalysis } from './ProfitAnalysis';
import { ProductImageGallery } from './ProductImageGallery';
import { ProductSpecs } from './ProductSpecs';

interface ProductDetailProps {
  product: Product;
  onAddToCart?: (productId: string, quantity: number) => void;
  onToggleWishlist?: (productId: string) => void;
  isInWishlist?: boolean;
}

export function ProductDetail({ 
  product, 
  onAddToCart, 
  onToggleWishlist,
  isInWishlist = false 
}: ProductDetailProps) {
  const [quantity, setQuantity] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-red-100 text-red-800';
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(<StarIconSolid key={i} className="h-5 w-5 text-yellow-400" />);
      } else if (i === fullStars && hasHalfStar) {
        stars.push(
          <div key={i} className="relative">
            <StarIcon className="h-5 w-5 text-yellow-400" />
            <StarIconSolid className="absolute inset-0 h-5 w-5 text-yellow-400 opacity-50" />
          </div>
        );
      } else {
        stars.push(<StarIcon key={i} className="h-5 w-5 text-gray-300" />);
      }
    }
    return stars;
  };

  return (
    <div className="bg-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Product Images */}
          <div className="space-y-4">
            <ProductImageGallery 
              images={product.images || []}
              primaryImage={product.primaryImageUrl}
              productName={product.name}
              selectedIndex={selectedImageIndex}
              onImageSelect={setSelectedImageIndex}
            />
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge className={getStatusColor(product.status)}>
                  {product.status}
                </Badge>
                <Badge className={getConditionColor(product.condition)}>
                  {product.condition}
                </Badge>
                {product.stockQuantity !== undefined && product.stockQuantity <= 5 && (
                  <Badge className="bg-red-100 text-red-800">
                    Low Stock ({product.stockQuantity} left)
                  </Badge>
                )}
              </div>

              {product.brand && (
                <p className="text-lg text-secondary-600 font-medium mb-1">
                  {product.brand}
                </p>
              )}

              <h1 className="text-3xl font-bold tracking-tight text-secondary-900">
                {product.name}
              </h1>

              <div className="flex items-center gap-4 mt-4">
                <div className="flex items-center gap-1">
                  {renderStars(product.averageRating || 0)}
                  <span className="ml-2 text-sm text-secondary-600">
                    {product.averageRating?.toFixed(1)} ({product.reviewCount || 0} reviews)
                  </span>
                </div>
                {product.viewCount && (
                  <span className="text-sm text-secondary-500">
                    {product.viewCount.toLocaleString()} views
                  </span>
                )}
              </div>

              {product.description && (
                <p className="mt-4 text-secondary-600">
                  {product.description}
                </p>
              )}
            </div>

            {/* Pricing */}
            <div className="border-t border-gray-200 pt-6">
              <div className="flex items-baseline gap-4">
                <span className="text-3xl font-bold text-secondary-900">
                  {formatPrice(product.retailPrice, product.currency)}
                </span>
                {product.marketPrice && product.marketPrice !== product.retailPrice && (
                  <span className="text-lg text-secondary-500 line-through">
                    {formatPrice(product.marketPrice, product.currency)}
                  </span>
                )}
              </div>
              <p className="text-sm text-secondary-600 mt-1">
                Wholesale: {formatPrice(product.wholesalePrice, product.currency)}
              </p>
            </div>

            {/* Product Details */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-secondary-900">SKU:</span>
                <span className="ml-2 text-secondary-600">{product.sku}</span>
              </div>
              {product.model && (
                <div>
                  <span className="font-medium text-secondary-900">Model:</span>
                  <span className="ml-2 text-secondary-600">{product.model}</span>
                </div>
              )}
              {product.category && (
                <div>
                  <span className="font-medium text-secondary-900">Category:</span>
                  <span className="ml-2 text-secondary-600">{product.category.name}</span>
                </div>
              )}
              {product.supplier && (
                <div>
                  <span className="font-medium text-secondary-900">Supplier:</span>
                  <span className="ml-2 text-secondary-600">{product.supplier}</span>
                </div>
              )}
            </div>

            {/* Quantity and Actions */}
            <div className="border-t border-gray-200 pt-6">
              <div className="flex items-center gap-4 mb-4">
                <label className="text-sm font-medium text-secondary-900">Quantity:</label>
                <div className="flex items-center border border-secondary-300 rounded-md">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-3 py-2 text-secondary-600 hover:text-secondary-900"
                    disabled={quantity <= 1}
                  >
                    −
                  </button>
                  <span className="px-4 py-2 border-x border-secondary-300 text-center min-w-[60px]">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="px-3 py-2 text-secondary-600 hover:text-secondary-900"
                    disabled={product.maxOrderQuantity ? quantity >= product.maxOrderQuantity : false}
                  >
                    +
                  </button>
                </div>
                {product.minOrderQuantity && quantity < product.minOrderQuantity && (
                  <span className="text-sm text-red-600">
                    Min order: {product.minOrderQuantity}
                  </span>
                )}
              </div>

              <div className="flex gap-4">
                <Button 
                  className="flex-1"
                  onClick={() => onAddToCart?.(product.id, quantity)}
                  disabled={product.status !== 'active' || (product.stockQuantity !== undefined && product.stockQuantity < quantity)}
                >
                  Add to Cart
                </Button>
                <Button
                  variant="outline"
                  onClick={() => onToggleWishlist?.(product.id)}
                  className="px-4"
                >
                  {isInWishlist ? (
                    <HeartIconSolid className="h-5 w-5 text-red-500" />
                  ) : (
                    <HeartIcon className="h-5 w-5" />
                  )}
                </Button>
                <Button variant="outline" className="px-4">
                  <ShareIcon className="h-5 w-5" />
                </Button>
                <Button variant="outline" className="px-4">
                  <ChartBarIcon className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Tags */}
            {product.tags && product.tags.length > 0 && (
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-sm font-medium text-secondary-900 mb-2">Tags:</h3>
                <div className="flex flex-wrap gap-2">
                  {product.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Profit Analysis */}
        <div className="mt-12">
          <ProfitAnalysis product={product} />
        </div>

        {/* Product Specifications */}
        {product.specifications && Object.keys(product.specifications).length > 0 && (
          <div className="mt-12">
            <ProductSpecs specifications={product.specifications} />
          </div>
        )}
      </div>
    </div>
  );
}