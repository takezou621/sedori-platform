'use client';

import { useState } from 'react';
import { Card, Button, Input } from '@/components/ui';
import { CartSummary } from '@/components/cart';

interface ShippingForm {
  firstName: string;
  lastName: string;
  email: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

interface PaymentForm {
  cardNumber: string;
  expiryDate: string;
  cvv: string;
  cardholderName: string;
}

export default function CheckoutPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [shippingForm, setShippingForm] = useState<ShippingForm>({
    firstName: '',
    lastName: '',
    email: '',
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'USA'
  });
  
  const [paymentForm, setPaymentForm] = useState<PaymentForm>({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardholderName: ''
  });

  const [loading, setLoading] = useState(false);

  // Mock cart data
  const mockCart = {
    id: 'cart-1',
    items: [
      {
        id: 'item-1',
        productId: 'prod-1',
        title: 'Sample Product',
        price: 99.99,
        quantity: 2,
        imageUrl: ''
      }
    ],
    total: 199.98,
    createdAt: '',
    updatedAt: ''
  };

  const handleShippingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentStep(2);
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Mock payment processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Redirect to success page or handle success
    alert('Order placed successfully!');
    setLoading(false);
  };

  const updateShippingForm = (field: keyof ShippingForm, value: string) => {
    setShippingForm(prev => ({ ...prev, [field]: value }));
  };

  const updatePaymentForm = (field: keyof PaymentForm, value: string) => {
    setPaymentForm(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Checkout</h1>
          <div className="flex items-center mt-4 space-x-4">
            <div className={`flex items-center ${currentStep >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-300'}`}>
                1
              </div>
              <span className="ml-2">Shipping</span>
            </div>
            <div className={`w-8 h-1 ${currentStep >= 2 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
            <div className={`flex items-center ${currentStep >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-300'}`}>
                2
              </div>
              <span className="ml-2">Payment</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {currentStep === 1 && (
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-6">Shipping Information</h2>
                <form onSubmit={handleShippingSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      placeholder="First Name"
                      value={shippingForm.firstName}
                      onChange={(e) => updateShippingForm('firstName', e.target.value)}
                      required
                    />
                    <Input
                      placeholder="Last Name"
                      value={shippingForm.lastName}
                      onChange={(e) => updateShippingForm('lastName', e.target.value)}
                      required
                    />
                  </div>
                  
                  <Input
                    type="email"
                    placeholder="Email Address"
                    value={shippingForm.email}
                    onChange={(e) => updateShippingForm('email', e.target.value)}
                    required
                  />
                  
                  <Input
                    placeholder="Street Address"
                    value={shippingForm.street}
                    onChange={(e) => updateShippingForm('street', e.target.value)}
                    required
                  />
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input
                      placeholder="City"
                      value={shippingForm.city}
                      onChange={(e) => updateShippingForm('city', e.target.value)}
                      required
                    />
                    <Input
                      placeholder="State"
                      value={shippingForm.state}
                      onChange={(e) => updateShippingForm('state', e.target.value)}
                      required
                    />
                    <Input
                      placeholder="ZIP Code"
                      value={shippingForm.zipCode}
                      onChange={(e) => updateShippingForm('zipCode', e.target.value)}
                      required
                    />
                  </div>
                  
                  <Button type="submit" className="w-full">
                    Continue to Payment
                  </Button>
                </form>
              </Card>
            )}

            {currentStep === 2 && (
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-6">Payment Information</h2>
                <form onSubmit={handlePaymentSubmit} className="space-y-4">
                  <Input
                    placeholder="Cardholder Name"
                    value={paymentForm.cardholderName}
                    onChange={(e) => updatePaymentForm('cardholderName', e.target.value)}
                    required
                  />
                  
                  <Input
                    placeholder="Card Number"
                    value={paymentForm.cardNumber}
                    onChange={(e) => updatePaymentForm('cardNumber', e.target.value)}
                    required
                  />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      placeholder="MM/YY"
                      value={paymentForm.expiryDate}
                      onChange={(e) => updatePaymentForm('expiryDate', e.target.value)}
                      required
                    />
                    <Input
                      placeholder="CVV"
                      value={paymentForm.cvv}
                      onChange={(e) => updatePaymentForm('cvv', e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="flex space-x-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setCurrentStep(1)}
                      className="flex-1"
                    >
                      Back to Shipping
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={loading}
                      className="flex-1"
                    >
                      {loading ? 'Processing...' : 'Place Order'}
                    </Button>
                  </div>
                </form>
              </Card>
            )}
          </div>

          {/* Order Summary */}
          <div>
            <CartSummary 
              cart={mockCart}
              onCheckout={() => {}}
              loading={loading}
            />
          </div>
        </div>
      </div>
    </div>
  );
}