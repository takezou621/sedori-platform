'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CreditCardIcon, TruckIcon, ShoppingBagIcon } from '@heroicons/react/24/outline';
import { Card, Button, LoadingSpinner } from '@/components/ui';
import { useCart } from '@/hooks/useCart';
import { useCreateOrder } from '@/hooks/useOrder';
import { CreateOrderRequest, ShippingAddress, PaymentMethod } from '@/types/order';

interface CreateOrderProps {
  className?: string;
}

export function CreateOrder({ className = '' }: CreateOrderProps) {
  const router = useRouter();
  const { data: cart, isLoading: isCartLoading } = useCart();
  const createOrderMutation = useCreateOrder();
  
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress>({
    name: '',
    addressLine1: '',
    addressLine2: '',
    street: '',
    street2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'JP',
    phone: '',
  });

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('credit_card');
  const [isProcessing, setIsProcessing] = useState(false);

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: currency,
    }).format(price);
  };

  const handleAddressChange = (field: keyof ShippingAddress, value: string) => {
    setShippingAddress(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = (): boolean => {
    const required = ['name', 'street', 'city', 'state', 'postalCode'];
    return required.every(field => shippingAddress[field as keyof ShippingAddress]?.trim());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!cart || cart.items.length === 0) {
      alert('Your cart is empty');
      return;
    }

    if (!validateForm()) {
      alert('Please fill in all required shipping information');
      return;
    }

    setIsProcessing(true);

    try {
      const orderData: CreateOrderRequest = {
        items: cart.items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
        })),
        shippingAddress,
        paymentMethod: { type: paymentMethod },
      };

      const order = await createOrderMutation.mutateAsync(orderData);
      
      // Redirect to order confirmation or payment page
      router.push(`/orders/${order.id}/confirmation`);
    } catch (error) {
      console.error('Failed to create order:', error);
      alert('Failed to create order. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (isCartLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <Card className="p-8 text-center">
        <ShoppingBagIcon className="h-16 w-16 text-secondary-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-secondary-900 mb-2">
          Your cart is empty
        </h3>
        <p className="text-secondary-500 mb-4">
          Add some products to create an order
        </p>
        <Button onClick={() => router.push('/products')}>
          Continue Shopping
        </Button>
      </Card>
    );
  }

  return (
    <div className={`max-w-4xl mx-auto ${className}`}>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-secondary-900">Checkout</h1>
        <p className="text-secondary-600 mt-2">
          Review your order and provide shipping information
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Shipping Information */}
          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-secondary-900 mb-4 flex items-center">
                <TruckIcon className="h-5 w-5 mr-2" />
                Shipping Information
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={shippingAddress.name}
                    onChange={(e) => handleAddressChange('name', e.target.value)}
                    className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Enter your full name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">
                    Street Address *
                  </label>
                  <input
                    type="text"
                    required
                    value={shippingAddress.street}
                    onChange={(e) => handleAddressChange('street', e.target.value)}
                    className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Enter your street address"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">
                    Apartment, suite, etc. (optional)
                  </label>
                  <input
                    type="text"
                    value={shippingAddress.street2}
                    onChange={(e) => handleAddressChange('street2', e.target.value)}
                    className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Apartment, suite, building, etc."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-1">
                      City *
                    </label>
                    <input
                      type="text"
                      required
                      value={shippingAddress.city}
                      onChange={(e) => handleAddressChange('city', e.target.value)}
                      className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="City"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-1">
                      State/Prefecture *
                    </label>
                    <input
                      type="text"
                      required
                      value={shippingAddress.state}
                      onChange={(e) => handleAddressChange('state', e.target.value)}
                      className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="State/Prefecture"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-1">
                      Postal Code *
                    </label>
                    <input
                      type="text"
                      required
                      value={shippingAddress.postalCode}
                      onChange={(e) => handleAddressChange('postalCode', e.target.value)}
                      className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="Postal Code"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-1">
                      Country *
                    </label>
                    <select
                      required
                      value={shippingAddress.country}
                      onChange={(e) => handleAddressChange('country', e.target.value)}
                      className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value="JP">Japan</option>
                      <option value="US">United States</option>
                      <option value="GB">United Kingdom</option>
                      <option value="CA">Canada</option>
                      <option value="AU">Australia</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">
                    Phone Number (optional)
                  </label>
                  <input
                    type="tel"
                    value={shippingAddress.phone}
                    onChange={(e) => handleAddressChange('phone', e.target.value)}
                    className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Phone number"
                  />
                </div>
              </div>
            </Card>

            {/* Payment Method */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-secondary-900 mb-4 flex items-center">
                <CreditCardIcon className="h-5 w-5 mr-2" />
                Payment Method
              </h3>

              <div className="space-y-3">
                <label className="flex items-center p-3 border border-secondary-300 rounded-lg cursor-pointer hover:bg-secondary-50">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="credit_card"
                    checked={paymentMethod === 'credit_card'}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="text-primary-600"
                  />
                  <div className="ml-3">
                    <div className="font-medium text-secondary-900">Credit Card</div>
                    <div className="text-sm text-secondary-600">Visa, MasterCard, AMEX</div>
                  </div>
                </label>

                <label className="flex items-center p-3 border border-secondary-300 rounded-lg cursor-pointer hover:bg-secondary-50">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="paypal"
                    checked={paymentMethod === 'paypal'}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="text-primary-600"
                  />
                  <div className="ml-3">
                    <div className="font-medium text-secondary-900">PayPal</div>
                    <div className="text-sm text-secondary-600">Pay with your PayPal account</div>
                  </div>
                </label>

                <label className="flex items-center p-3 border border-secondary-300 rounded-lg cursor-pointer hover:bg-secondary-50">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="bank_transfer"
                    checked={paymentMethod === 'bank_transfer'}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="text-primary-600"
                  />
                  <div className="ml-3">
                    <div className="font-medium text-secondary-900">Bank Transfer</div>
                    <div className="text-sm text-secondary-600">Direct bank transfer</div>
                  </div>
                </label>
              </div>
            </Card>
          </div>

          {/* Order Summary */}
          <div>
            <Card className="p-6 sticky top-6">
              <h3 className="text-lg font-semibold text-secondary-900 mb-4">
                Order Summary
              </h3>

              <div className="space-y-3 mb-6">
                {cart.items.map((item) => (
                  <div key={item.id} className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-secondary-100 rounded-md flex-shrink-0"></div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-secondary-900 truncate">
                        {item.product.name}
                      </div>
                      <div className="text-xs text-secondary-500">
                        Qty: {item.quantity}
                      </div>
                    </div>
                    <div className="text-sm font-medium text-secondary-900">
                      {formatPrice(item.price * item.quantity, item.currency)}
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-2 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-secondary-600">Subtotal</span>
                  <span className="font-medium">{formatPrice(cart.subtotal, cart.currency)}</span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-secondary-600">Shipping</span>
                  <span className="font-medium">
                    {cart.shipping > 0 ? formatPrice(cart.shipping, cart.currency) : 'Free'}
                  </span>
                </div>

                {cart.tax > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-secondary-600">Tax</span>
                    <span className="font-medium">{formatPrice(cart.tax, cart.currency)}</span>
                  </div>
                )}

                <div className="border-t border-secondary-200 pt-2">
                  <div className="flex justify-between font-semibold">
                    <span>Total</span>
                    <span>{formatPrice(cart.total, cart.currency)}</span>
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={isProcessing || createOrderMutation.isPending || !validateForm()}
              >
                {isProcessing || createOrderMutation.isPending ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCardIcon className="h-5 w-5 mr-2" />
                    Place Order
                  </>
                )}
              </Button>

              <p className="text-xs text-secondary-500 text-center mt-3">
                By placing this order, you agree to our Terms of Service and Privacy Policy.
              </p>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}