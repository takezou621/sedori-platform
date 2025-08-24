'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui';
import { ApiErrorDisplay } from '@/components/common/ErrorBoundary';
import { useErrorHandler, AppError, createApiError, ErrorCode } from '@/lib/errors';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

interface CartItem {
  id: string;
  productId: string;
  title: string;
  price: number;
  cost: number;
  quantity: number;
  imageUrl?: string;
  stock: number;
}

interface CartData {
  items: CartItem[];
  total: number;
  itemCount: number;
}

export default function CartPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AppError | null>(null);
  const [cartData, setCartData] = useState<CartData | null>(null);
  const [processingCheckout, setProcessingCheckout] = useState(false);
  const { handleError } = useErrorHandler();

  // Load cart data on component mount
  useEffect(() => {
    loadCartData();
  }, []);

  const loadCartData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Try to load from localStorage first for offline support
      const localCart = localStorage.getItem('sedori_cart');
      if (localCart) {
        const parsedCart = JSON.parse(localCart);
        setCartData(parsedCart);
      }

      // Then try to sync with backend
      try {
        const response = await fetch('/api/cart', {
          credentials: 'include',
          headers: {
            'Cache-Control': 'no-cache'
          }
        });

        if (!response.ok) {
          if (response.status === 404) {
            // Cart not found, use empty cart
            setCartData({ items: [], total: 0, itemCount: 0 });
            return;
          }
          throw new Error(`HTTP ${response.status}`);
        }

        const serverCartData = await response.json();
        setCartData(serverCartData);
        
        // Update localStorage
        localStorage.setItem('sedori_cart', JSON.stringify(serverCartData));
      } catch (fetchError) {
        // If server request fails but we have local data, use that
        if (cartData === null) {
          throw createApiError(ErrorCode.API_UNAVAILABLE, 503, {
            message: 'Unable to load cart data'
          });
        }
        console.warn('Failed to sync cart with server, using local data:', fetchError);
      }
    } catch (err) {
      const appError = handleError(err);
      setError(appError);
      
      // Set empty cart as fallback
      setCartData({ items: [], total: 0, itemCount: 0 });
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (productId: string, newQuantity: number) => {
    if (!cartData) return;

    try {
      if (newQuantity <= 0) {
        await removeItem(productId);
        return;
      }

      const updatedItems = cartData.items.map(item => {
        if (item.productId === productId) {
          return { ...item, quantity: Math.min(newQuantity, item.stock) };
        }
        return item;
      });

      const updatedCart = {
        ...cartData,
        items: updatedItems,
        total: updatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0),
        itemCount: updatedItems.reduce((sum, item) => sum + item.quantity, 0)
      };

      setCartData(updatedCart);
      localStorage.setItem('sedori_cart', JSON.stringify(updatedCart));

      // Try to sync with server
      try {
        await fetch(`/api/cart/items/${productId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ quantity: newQuantity })
        });
      } catch {
        console.warn('Failed to sync cart update with server');
      }
    } catch (err) {
      const appError = handleError(err);
      setError(appError);
    }
  };

  const removeItem = async (productId: string) => {
    if (!cartData) return;

    try {
      const updatedItems = cartData.items.filter(item => item.productId !== productId);
      const updatedCart = {
        ...cartData,
        items: updatedItems,
        total: updatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0),
        itemCount: updatedItems.reduce((sum, item) => sum + item.quantity, 0)
      };

      setCartData(updatedCart);
      localStorage.setItem('sedori_cart', JSON.stringify(updatedCart));

      // Try to sync with server
      try {
        await fetch(`/api/cart/items/${productId}`, {
          method: 'DELETE',
          credentials: 'include'
        });
      } catch {
        console.warn('Failed to sync cart removal with server');
      }
    } catch (err) {
      const appError = handleError(err);
      setError(appError);
    }
  };

  const handleCheckout = async () => {
    if (!cartData || cartData.items.length === 0) {
      setError(createApiError(ErrorCode.CART_EMPTY, 400));
      return;
    }

    try {
      setProcessingCheckout(true);
      setError(null);

      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ cartItems: cartData.items })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw createApiError(
          ErrorCode.API_UNAVAILABLE,
          response.status,
          { message: errorData.message || 'Checkout failed' }
        );
      }

      const checkoutData = await response.json();
      
      // Clear cart after successful checkout
      setCartData({ items: [], total: 0, itemCount: 0 });
      localStorage.removeItem('sedori_cart');
      
      // Redirect to success page or show success message
      window.location.href = `/checkout/success?orderId=${checkoutData.orderId}`;
    } catch (err) {
      const appError = handleError(err);
      setError(appError);
    } finally {
      setProcessingCheckout(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center min-h-[400px]">
            <LoadingSpinner size="lg" />
            <span className="ml-3 text-secondary-600">カートを読み込み中...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error && (!cartData || cartData.items.length === 0)) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-secondary-900">ショッピングカート</h1>
            <p className="text-secondary-600 mt-2">選択した商品を確認し、注文を完了してください。</p>
          </div>
          <ApiErrorDisplay 
            error={{
              message: error.userMessage.ja || error.userMessage.en,
              statusCode: error.statusCode
            }}
            onRetry={loadCartData}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-secondary-900">ショッピングカート</h1>
          <p className="text-secondary-600 mt-2">選択した商品を確認し、注文を完了してください。</p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6">
            <ApiErrorDisplay 
              error={{
                message: error.userMessage.ja || error.userMessage.en,
                statusCode: error.statusCode
              }}
              onRetry={() => setError(null)}
            />
          </div>
        )}

        {/* Empty Cart State */}
        {(!cartData || cartData.items.length === 0) && (
          <div className="bg-white rounded-lg border border-secondary-200 p-8 text-center">
            <div className="mx-auto w-16 h-16 bg-secondary-100 rounded-full flex items-center justify-center mb-4">
              <svg
                className="w-8 h-8 text-secondary-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.1 5M7 13l-1.1 5m0 0h9.1M16 18a2 2 0 11-4 0 2 2 0 014 0zm-8 0a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            
            <h2 className="text-xl font-semibold text-secondary-900 mb-2">カートに商品がありません</h2>
            <p className="text-secondary-600 mb-6">
              商品を追加してから再度お試しください。せどり商品を見つけて利益を最大化しましょう！
            </p>
            
            <Button 
              size="lg"
              onClick={() => window.location.href = '/products'}
            >
              商品を見る
            </Button>
          </div>
        )}

        {/* Cart Items */}
        {cartData && cartData.items.length > 0 && (
          <>
            <div className="bg-white rounded-lg border border-secondary-200 mb-6">
              <div className="p-6">
                <h2 className="text-lg font-semibold text-secondary-900 mb-4">
                  カート内商品 ({cartData.itemCount}個)
                </h2>
                
                <div className="space-y-4">
                  {cartData.items.map((item) => {
                    const profit = (item.price - item.cost) * item.quantity;
                    const margin = item.price > 0 ? ((item.price - item.cost) / item.price * 100).toFixed(1) : '0';
                    
                    return (
                      <div key={item.id} className="flex items-center space-x-4 p-4 border border-secondary-100 rounded-lg">
                        {/* Product Image */}
                        <div className="flex-shrink-0 w-16 h-16">
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={item.title}
                              className="w-full h-full object-cover rounded"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="w-full h-full bg-secondary-100 rounded flex items-center justify-center">
                              <span className="text-xs text-secondary-400">No Image</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Product Details */}
                        <div className="flex-grow">
                          <h3 className="font-medium text-secondary-900">{item.title}</h3>
                          <p className="text-sm text-secondary-600">価格: ¥{item.price.toLocaleString()}</p>
                          <p className="text-xs text-green-600">予想利益率: {margin}%</p>
                        </div>
                        
                        {/* Quantity Controls */}
                        <div className="flex items-center space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                            disabled={item.quantity <= 1}
                          >
                            -
                          </Button>
                          <span className="w-12 text-center text-sm">{item.quantity}</span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                            disabled={item.quantity >= item.stock}
                          >
                            +
                          </Button>
                        </div>
                        
                        {/* Total Price */}
                        <div className="text-right">
                          <p className="font-semibold text-secondary-900">
                            ¥{(item.price * item.quantity).toLocaleString()}
                          </p>
                          <p className="text-xs text-green-600">
                            利益: ¥{profit.toLocaleString()}
                          </p>
                        </div>
                        
                        {/* Remove Button */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => removeItem(item.productId)}
                          className="text-red-600 border-red-200 hover:bg-red-50"
                        >
                          削除
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Cart Summary Section */}
            <div className="bg-secondary-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-secondary-900 mb-4">注文概要</h3>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-secondary-600">小計</span>
                  <span className="text-secondary-900">¥{cartData.total.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary-600">送料</span>
                  <span className="text-secondary-900">無料</span>
                </div>
                <div className="border-t border-secondary-200 pt-2">
                  <div className="flex justify-between font-semibold">
                    <span className="text-secondary-900">合計</span>
                    <span className="text-secondary-900">¥{cartData.total.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <Button 
                  className="w-full" 
                  size="lg"
                  onClick={handleCheckout}
                  disabled={processingCheckout || cartData.items.length === 0}
                >
                  {processingCheckout ? '処理中...' : '注文を完了'}
                </Button>
              </div>

              {/* Profit Information */}
              {(() => {
                const totalProfit = cartData.items.reduce((sum, item) => 
                  sum + ((item.price - item.cost) * item.quantity), 0
                );
                const avgMargin = cartData.total > 0 ? (totalProfit / cartData.total * 100).toFixed(1) : '0';
                
                return (
                  <div className="mt-4 p-4 bg-primary-50 rounded-lg border border-primary-200">
                    <div className="flex items-center space-x-2">
                      <svg
                        className="w-5 h-5 text-primary-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                        />
                      </svg>
                      <span className="text-sm font-medium text-primary-700">
                        予想利益率: {avgMargin}%
                      </span>
                    </div>
                    <div className="mt-2 text-sm">
                      <p className="text-primary-600">
                        予想利益: ¥{totalProfit.toLocaleString()}
                      </p>
                      <p className="text-xs text-primary-600 mt-1">
                        この注文による予想利益を表示しています
                      </p>
                    </div>
                  </div>
                );
              })()
              }
            </div>
          </>
        )}
      </div>
    </div>
  );
}