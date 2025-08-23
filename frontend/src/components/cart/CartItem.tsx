'use client';

import { CartItem as CartItemType } from '@/types/cart';
import { Button, Card } from '@/components/ui';
import Link from 'next/link';

interface CartItemProps {
  item: CartItemType;
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onRemove: (itemId: string) => void;
}

export function CartItem({ item, onUpdateQuantity, onRemove }: CartItemProps) {
  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity <= 0) {
      onRemove(item.id);
    } else {
      onUpdateQuantity(item.id, newQuantity);
    }
  };

  return (
    <Card className="p-4">
      <div className="flex items-center space-x-4">
        {/* Product Image */}
        <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-md border">
          {item.imageUrl ? (
            <img
              src={item.imageUrl}
              alt={item.title}
              className="h-full w-full object-cover object-center"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-gray-100">
              <span className="text-xs text-gray-400">No Image</span>
            </div>
          )}
        </div>

        {/* Product Details */}
        <div className="flex-1">
          <Link href={`/products/${item.productId}`} className="hover:underline">
            <h3 className="text-sm font-medium text-gray-900">{item.title}</h3>
          </Link>
          <p className="text-lg font-semibold text-gray-900">${item.price.toFixed(2)}</p>
        </div>

        {/* Quantity Controls */}
        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleQuantityChange(item.quantity - 1)}
            disabled={item.quantity <= 1}
          >
            -
          </Button>
          <span className="w-8 text-center text-sm">{item.quantity}</span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleQuantityChange(item.quantity + 1)}
          >
            +
          </Button>
        </div>

        {/* Total Price */}
        <div className="text-right">
          <p className="text-lg font-semibold text-gray-900">
            ${(item.price * item.quantity).toFixed(2)}
          </p>
        </div>

        {/* Remove Button */}
        <Button
          size="sm"
          variant="outline"
          onClick={() => onRemove(item.id)}
        >
          Remove
        </Button>
      </div>
    </Card>
  );
}