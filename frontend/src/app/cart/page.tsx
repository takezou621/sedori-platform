'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Cart } from '@/types/cart';
import { CartItem, CartSummary } from '@/components/cart';
import { Button, Card } from '@/components/ui';
import Link from 'next/link';

export default function CartPage() {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Mock cart data - in real app, this would fetch from API
    const mockCart: Cart = {
      id: 'cart-1',
      items: [
        {
          id: 'item-1',
          productId: 'prod-1',
          title: 'Sample Product 1',
          price: 99.99,
          quantity: 2,
          imageUrl: ''
        },
        {
          id: 'item-2',
          productId: 'prod-2',
          title: 'Sample Product 2',
          price: 149.99,
          quantity: 1,
          imageUrl: ''
        }
      ],
      total: 349.97,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    };
    
    setCart(mockCart);
    setLoading(false);
  }, []);

  const handleUpdateQuantity = async (itemId: string, quantity: number) => {
    if (!cart) return;
    
    setUpdating(true);
    
    // Mock API call
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const updatedItems = cart.items.map(item =>
      item.id === itemId ? { ...item, quantity } : item
    );
    
    const newTotal = updatedItems.reduce((total, item) => total + (item.price * item.quantity), 0);
    
    setCart({
      ...cart,
      items: updatedItems,
      total: newTotal,
      updatedAt: new Date().toISOString()
    });
    
    setUpdating(false);
  };

  const handleRemoveItem = async (itemId: string) => {
    if (!cart) return;
    
    setUpdating(true);
    
    // Mock API call
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const updatedItems = cart.items.filter(item => item.id !== itemId);
    const newTotal = updatedItems.reduce((total, item) => total + (item.price * item.quantity), 0);
    
    setCart({
      ...cart,
      items: updatedItems,
      total: newTotal,
      updatedAt: new Date().toISOString()
    });
    
    setUpdating(false);
  };

  const handleCheckout = () => {
    router.push('/checkout');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-300 rounded mb-4 w-64"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-32 bg-gray-300 rounded"></div>
                ))}
              </div>
              <div className="h-64 bg-gray-300 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Shopping Cart</h1>
          <Card className="p-12 text-center">
            <div className="mx-auto max-w-md">
              <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Your cart is empty</h3>
              <p className="text-gray-500 mb-6">Add some products to your cart to get started.</p>
              <Link href="/products">
                <Button>Continue Shopping</Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Shopping Cart</h1>
          <p className="text-gray-600 mt-2">{cart.items.length} item{cart.items.length !== 1 ? 's' : ''} in your cart</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2">
            <div className="space-y-4">
              {cart.items.map((item) => (
                <CartItem
                  key={item.id}
                  item={item}
                  onUpdateQuantity={handleUpdateQuantity}
                  onRemove={handleRemoveItem}
                />
              ))}
            </div>

            {/* Continue Shopping */}
            <div className="mt-6">
              <Link href="/products">
                <Button variant="outline">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Continue Shopping
                </Button>
              </Link>
            </div>
          </div>

          {/* Order Summary */}
          <div>
            <CartSummary 
              cart={cart}
              onCheckout={handleCheckout}
              loading={updating}
            />
            
            {/* Trust Badges */}
            <Card className="p-4 mt-4">
              <div className="space-y-3 text-sm text-gray-600">
                <div className="flex items-center">
                  <svg className="w-4 h-4 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Free returns within 30 days
                </div>
                <div className="flex items-center">
                  <svg className="w-4 h-4 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Secure checkout
                </div>
                <div className="flex items-center">
                  <svg className="w-4 h-4 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Fast shipping
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}