'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { TrashIcon, MinusIcon, PlusIcon } from '@heroicons/react/24/outline';
import { CartItem as CartItemType } from '@/types/cart';
import { Button, Badge } from '@/components/ui';
import { useUpdateCartItem, useRemoveFromCart } from '@/hooks/useCart';

interface CartItemProps {
  item: CartItemType;
  className?: string;
}

export function CartItem({ item, className = '' }: CartItemProps) {
  const [quantity, setQuantity] = useState(item.quantity);
  const [isUpdating, setIsUpdating] = useState(false);

  const updateCartItemMutation = useUpdateCartItem();
  const removeFromCartMutation = useRemoveFromCart();

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: currency,
    }).format(price);
  };

  const handleQuantityChange = async (newQuantity: number) => {
    if (newQuantity < 1) return;
    
    // Check against product constraints
    if (item.product.minOrderQuantity && newQuantity < item.product.minOrderQuantity) {
      return;
    }
    if (item.product.maxOrderQuantity && newQuantity > item.product.maxOrderQuantity) {
      return;
    }
    if (item.product.stockQuantity && newQuantity > item.product.stockQuantity) {
      return;
    }

    setQuantity(newQuantity);
    setIsUpdating(true);

    try {
      await updateCartItemMutation.mutateAsync({
        itemId: item.id,
        quantity: newQuantity,
      });
    } catch (error) {
      // Revert on error
      setQuantity(item.quantity);
      console.error('Failed to update cart item:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRemove = async () => {
    try {
      await removeFromCartMutation.mutateAsync(item.id);
    } catch (error) {
      console.error('Failed to remove cart item:', error);
    }
  };

  const isOutOfStock = item.product.stockQuantity === 0;
  const isLowStock = item.product.stockQuantity !== undefined && item.product.stockQuantity <= 5;

  return (
    <div className={`flex items-start gap-4 p-4 bg-white border border-secondary-200 rounded-lg ${className}`}>
      {/* Product Image */}
      <div className="flex-shrink-0">
        <Link href={`/products/${item.product.id}`}>
          <div className="relative w-20 h-20 rounded-md overflow-hidden bg-secondary-100">
            {item.product.primaryImageUrl ? (
              <Image
                src={item.product.primaryImageUrl}
                alt={item.product.name}
                fill
                className="object-cover"
                sizes="80px"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-secondary-400">
                <span className="text-xs">No image</span>
              </div>
            )}
          </div>
        </Link>
      </div>

      {/* Product Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between">
          <div>
            <Link
              href={`/products/${item.product.id}`}
              className="text-sm font-medium text-secondary-900 hover:text-primary-600 line-clamp-2"
            >
              {item.product.name}
            </Link>
            
            <div className="flex items-center gap-2 mt-1">
              {item.product.brand && (
                <span className="text-xs text-secondary-500">{item.product.brand}</span>
              )}
              <span className="text-xs text-secondary-500">SKU: {item.product.sku}</span>
            </div>

            {/* Stock Status */}
            <div className="flex items-center gap-2 mt-2">
              {isOutOfStock && (
                <Badge className="bg-red-100 text-red-800 text-xs">Out of Stock</Badge>
              )}
              {!isOutOfStock && isLowStock && (
                <Badge className="bg-yellow-100 text-yellow-800 text-xs">
                  {item.product.stockQuantity} left
                </Badge>
              )}
              {!isOutOfStock && !isLowStock && item.product.stockQuantity && (
                <Badge className="bg-green-100 text-green-800 text-xs">In Stock</Badge>
              )}
            </div>
          </div>

          {/* Remove Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRemove}
            disabled={removeFromCartMutation.isPending}
            className="text-secondary-400 hover:text-red-600 p-1"
          >
            <TrashIcon className="h-4 w-4" />
          </Button>
        </div>

        {/* Quantity and Price */}
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-secondary-600">Qty:</span>
            <div className="flex items-center border border-secondary-300 rounded-md">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleQuantityChange(quantity - 1)}
                disabled={
                  isUpdating || 
                  quantity <= 1 || 
                  (item.product.minOrderQuantity && quantity <= item.product.minOrderQuantity) ||
                  isOutOfStock
                }
                className="px-2 py-1 h-8"
              >
                <MinusIcon className="h-3 w-3" />
              </Button>
              
              <span className="px-3 py-1 text-sm font-medium min-w-[40px] text-center">
                {isUpdating ? '...' : quantity}
              </span>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleQuantityChange(quantity + 1)}
                disabled={
                  isUpdating || 
                  (item.product.maxOrderQuantity && quantity >= item.product.maxOrderQuantity) ||
                  (item.product.stockQuantity && quantity >= item.product.stockQuantity) ||
                  isOutOfStock
                }
                className="px-2 py-1 h-8"
              >
                <PlusIcon className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Pricing */}
          <div className="text-right">
            <div className="text-sm font-medium text-secondary-900">
              {formatPrice(item.price * quantity, item.currency)}
            </div>
            <div className="text-xs text-secondary-500">
              {formatPrice(item.price, item.currency)} each
            </div>
          </div>
        </div>

        {/* Constraints Info */}
        {(item.product.minOrderQuantity || item.product.maxOrderQuantity) && (
          <div className="mt-2 text-xs text-secondary-500">
            {item.product.minOrderQuantity && (
              <span>Min: {item.product.minOrderQuantity}</span>
            )}
            {item.product.minOrderQuantity && item.product.maxOrderQuantity && (
              <span> • </span>
            )}
            {item.product.maxOrderQuantity && (
              <span>Max: {item.product.maxOrderQuantity}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}