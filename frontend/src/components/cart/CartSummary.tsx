'use client';

import { Cart } from '@/types/cart';
import { Button, Card } from '@/components/ui';

interface CartSummaryProps {
  cart: Cart;
  onCheckout: () => void;
  loading?: boolean;
}

export function CartSummary({ cart, onCheckout, loading }: CartSummaryProps) {
  const itemsCount = cart.items.reduce((total, item) => total + item.quantity, 0);
  const subtotal = cart.items.reduce((total, item) => total + (item.price * item.quantity), 0);
  const tax = subtotal * 0.08; // 8% tax
  const shipping = subtotal > 100 ? 0 : 10; // Free shipping over $100
  const total = subtotal + tax + shipping;

  return (
    <Card className="p-6 sticky top-4">
      <h2 className="text-lg font-semibold mb-4">Order Summary</h2>
      
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span>Items ({itemsCount})</span>
          <span>${subtotal.toFixed(2)}</span>
        </div>
        
        <div className="flex justify-between">
          <span>Shipping</span>
          <span>{shipping === 0 ? 'Free' : `$${shipping.toFixed(2)}`}</span>
        </div>
        
        <div className="flex justify-between">
          <span>Tax</span>
          <span>${tax.toFixed(2)}</span>
        </div>
        
        <hr className="my-2" />
        
        <div className="flex justify-between font-semibold text-base">
          <span>Total</span>
          <span>${total.toFixed(2)}</span>
        </div>
      </div>

      {subtotal < 100 && (
        <p className="text-xs text-gray-500 mt-2">
          Add ${(100 - subtotal).toFixed(2)} more for free shipping
        </p>
      )}

      <Button
        className="w-full mt-6"
        onClick={onCheckout}
        disabled={cart.items.length === 0 || loading}
      >
        {loading ? 'Processing...' : `Proceed to Checkout ($${total.toFixed(2)})`}
      </Button>

      <div className="mt-4 text-xs text-gray-500 text-center">
        <p>Secure checkout with SSL encryption</p>
        <p className="mt-1">30-day return policy</p>
      </div>
    </Card>
  );
}