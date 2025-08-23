'use client';

import Link from 'next/link';
import { ShoppingBagIcon, TruckIcon, CreditCardIcon } from '@heroicons/react/24/outline';
import { Card, Button } from '@/components/ui';
import { Cart } from '@/types/cart';

interface CartSummaryProps {
  cart: Cart;
  showCheckoutButton?: boolean;
  className?: string;
}

export function CartSummary({ cart, showCheckoutButton = true, className = '' }: CartSummaryProps) {
  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: currency,
    }).format(price);
  };

  const itemCount = cart.items.reduce((total, item) => total + item.quantity, 0);

  return (
    <Card className={`p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-secondary-900 mb-4 flex items-center">
        <ShoppingBagIcon className="h-5 w-5 mr-2" />
        Order Summary
      </h3>

      {/* Items Summary */}
      <div className="space-y-3 mb-6">
        <div className="flex justify-between text-sm">
          <span className="text-secondary-600">
            Items ({itemCount} {itemCount === 1 ? 'item' : 'items'})
          </span>
          <span className="font-medium text-secondary-900">
            {formatPrice(cart.subtotal, cart.currency)}
          </span>
        </div>

        {cart.shipping > 0 ? (
          <div className="flex justify-between text-sm">
            <span className="text-secondary-600 flex items-center">
              <TruckIcon className="h-4 w-4 mr-1" />
              Shipping
            </span>
            <span className="font-medium text-secondary-900">
              {formatPrice(cart.shipping, cart.currency)}
            </span>
          </div>
        ) : (
          <div className="flex justify-between text-sm">
            <span className="text-secondary-600 flex items-center">
              <TruckIcon className="h-4 w-4 mr-1" />
              Shipping
            </span>
            <span className="font-medium text-green-600">Free</span>
          </div>
        )}

        {cart.tax > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-secondary-600">Tax</span>
            <span className="font-medium text-secondary-900">
              {formatPrice(cart.tax, cart.currency)}
            </span>
          </div>
        )}
      </div>

      {/* Total */}
      <div className="border-t border-secondary-200 pt-4 mb-6">
        <div className="flex justify-between text-lg font-semibold">
          <span className="text-secondary-900">Total</span>
          <span className="text-secondary-900">
            {formatPrice(cart.total, cart.currency)}
          </span>
        </div>
      </div>

      {/* Checkout Button */}
      {showCheckoutButton && (
        <div className="space-y-3">
          <Link href="/checkout" className="block">
            <Button className="w-full" size="lg">
              <CreditCardIcon className="h-5 w-5 mr-2" />
              Proceed to Checkout
            </Button>
          </Link>
          
          <div className="text-center">
            <Link
              href="/products"
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      )}

      {/* Security Note */}
      <div className="mt-6 pt-4 border-t border-secondary-200">
        <div className="flex items-center text-xs text-secondary-500">
          <svg className="h-4 w-4 mr-1 text-green-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
          </svg>
          Secure checkout with SSL encryption
        </div>
      </div>

      {/* Promotions */}
      {cart.subtotal > 10000 && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center text-sm text-green-800">
            <svg className="h-4 w-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            You qualify for free shipping!
          </div>
        </div>
      )}
    </Card>
  );
}