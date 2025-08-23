'use client';

import { useState } from 'react';
import { CreditCardIcon, LockClosedIcon } from '@heroicons/react/24/outline';
import { Card, Button, LoadingSpinner } from '@/components/ui';
import { PaymentMethods } from './PaymentMethods';
import { CreditCardForm } from './CreditCardForm';
import { PaymentMethod } from '@/types/order';

interface PaymentFormProps {
  amount: number;
  currency: string;
  onSubmit: (paymentData: any) => Promise<void>;
  isProcessing?: boolean;
  className?: string;
}

interface CreditCardData {
  cardNumber: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
  cardholderName: string;
}

export function PaymentForm({
  amount,
  currency,
  onSubmit,
  isProcessing = false,
  className = '',
}: PaymentFormProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('credit_card');
  const [creditCardData, setCreditCardData] = useState<CreditCardData>({
    cardNumber: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
    cardholderName: '',
  });
  const [billingAddress, setBillingAddress] = useState({
    sameAsShipping: true,
    name: '',
    street: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'JP',
  });

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: currency,
    }).format(price);
  };

  const validateCreditCard = (): boolean => {
    const { cardNumber, expiryMonth, expiryYear, cvv, cardholderName } = creditCardData;
    
    return !!(
      cardNumber.replace(/\s/g, '').length >= 13 &&
      expiryMonth &&
      expiryYear &&
      cvv.length >= 3 &&
      cardholderName.trim()
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedMethod === 'credit_card' && !validateCreditCard()) {
      alert('Please fill in all credit card information');
      return;
    }

    const paymentData = {
      method: selectedMethod,
      amount,
      currency,
      ...(selectedMethod === 'credit_card' && {
        creditCard: creditCardData,
        billingAddress: billingAddress.sameAsShipping ? null : billingAddress,
      }),
    };

    try {
      await onSubmit(paymentData);
    } catch (error) {
      console.error('Payment failed:', error);
      throw error;
    }
  };

  return (
    <form onSubmit={handleSubmit} className={`space-y-6 ${className}`}>
      {/* Payment Amount Summary */}
      <Card className="p-6 bg-primary-50 border-primary-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-100 rounded-lg">
              <CreditCardIcon className="h-6 w-6 text-primary-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-secondary-900">
                Payment Required
              </h3>
              <p className="text-secondary-600">
                Complete your payment to place the order
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-secondary-900">
              {formatPrice(amount, currency)}
            </div>
            <p className="text-sm text-secondary-600">Total Amount</p>
          </div>
        </div>
      </Card>

      {/* Payment Methods */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-secondary-900 mb-4">
          Payment Method
        </h3>
        <PaymentMethods
          selectedMethod={selectedMethod}
          onMethodChange={setSelectedMethod}
        />
      </Card>

      {/* Credit Card Form */}
      {selectedMethod === 'credit_card' && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-secondary-900 mb-4">
            Credit Card Information
          </h3>
          <CreditCardForm onDataChange={setCreditCardData} />

          {/* Billing Address */}
          <div className="mt-6 pt-6 border-t border-secondary-200">
            <h4 className="text-md font-medium text-secondary-900 mb-4">
              Billing Address
            </h4>
            
            <label className="flex items-center mb-4">
              <input
                type="checkbox"
                checked={billingAddress.sameAsShipping}
                onChange={(e) => setBillingAddress(prev => ({ 
                  ...prev, 
                  sameAsShipping: e.target.checked 
                }))}
                className="rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="ml-2 text-sm text-secondary-700">
                Same as shipping address
              </span>
            </label>

            {!billingAddress.sameAsShipping && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={billingAddress.name}
                    onChange={(e) => setBillingAddress(prev => ({ 
                      ...prev, 
                      name: e.target.value 
                    }))}
                    className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">
                    Street Address
                  </label>
                  <input
                    type="text"
                    value={billingAddress.street}
                    onChange={(e) => setBillingAddress(prev => ({ 
                      ...prev, 
                      street: e.target.value 
                    }))}
                    className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      value={billingAddress.city}
                      onChange={(e) => setBillingAddress(prev => ({ 
                        ...prev, 
                        city: e.target.value 
                      }))}
                      className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-1">
                      State/Prefecture
                    </label>
                    <input
                      type="text"
                      value={billingAddress.state}
                      onChange={(e) => setBillingAddress(prev => ({ 
                        ...prev, 
                        state: e.target.value 
                      }))}
                      className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-1">
                      Postal Code
                    </label>
                    <input
                      type="text"
                      value={billingAddress.postalCode}
                      onChange={(e) => setBillingAddress(prev => ({ 
                        ...prev, 
                        postalCode: e.target.value 
                      }))}
                      className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-1">
                      Country
                    </label>
                    <select
                      value={billingAddress.country}
                      onChange={(e) => setBillingAddress(prev => ({ 
                        ...prev, 
                        country: e.target.value 
                      }))}
                      className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      required
                    >
                      <option value="JP">Japan</option>
                      <option value="US">United States</option>
                      <option value="GB">United Kingdom</option>
                      <option value="CA">Canada</option>
                      <option value="AU">Australia</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* PayPal */}
      {selectedMethod === 'paypal' && (
        <Card className="p-6">
          <div className="text-center py-8">
            <div className="text-blue-600 mb-4">
              <svg className="h-12 w-12 mx-auto" viewBox="0 0 24 24" fill="currentColor">
                <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a.397.397 0 0 0-.077-.437c-.983-5.05-4.349-6.797-8.647-6.797H10.31c-.524 0-.968.382-1.05.9L8.14 7.689h2.19c4.298 0 7.664-1.747 8.647-6.797.03-.149.054-.294.077-.437.292-1.867-.002-3.138-1.012-4.287z"/>
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-secondary-900 mb-2">
              Pay with PayPal
            </h3>
            <p className="text-secondary-600 mb-6">
              You will be redirected to PayPal to complete your payment securely.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
              <h4 className="font-medium text-blue-900 mb-2">Payment Amount</h4>
              <p className="text-2xl font-bold text-blue-900">
                {formatPrice(amount, currency)}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Bank Transfer */}
      {selectedMethod === 'bank_transfer' && (
        <Card className="p-6">
          <div className="text-center py-8">
            <div className="text-secondary-600 mb-4">
              <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-secondary-900 mb-2">
              Bank Transfer
            </h3>
            <p className="text-secondary-600 mb-6">
              Complete your order and we'll provide bank transfer details.
            </p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-left">
              <h4 className="font-medium text-yellow-900 mb-2">Please Note</h4>
              <ul className="text-sm text-yellow-800 space-y-1">
                <li>• Payment must be completed within 7 days</li>
                <li>• Processing may take 1-3 business days</li>
                <li>• Bank transfer fees may apply</li>
              </ul>
            </div>
          </div>
        </Card>
      )}

      {/* Submit Button */}
      <div className="flex items-center justify-between pt-6 border-t border-secondary-200">
        <div className="flex items-center text-sm text-secondary-600">
          <LockClosedIcon className="h-4 w-4 mr-2" />
          256-bit SSL encryption
        </div>

        <Button
          type="submit"
          size="lg"
          disabled={isProcessing || (selectedMethod === 'credit_card' && !validateCreditCard())}
          className="min-w-[200px]"
        >
          {isProcessing ? (
            <>
              <LoadingSpinner size="sm" className="mr-2" />
              Processing...
            </>
          ) : (
            <>
              <LockClosedIcon className="h-5 w-5 mr-2" />
              Pay {formatPrice(amount, currency)}
            </>
          )}
        </Button>
      </div>

      {/* Security Notice */}
      <div className="text-xs text-center text-secondary-500 mt-4">
        Your payment information is secure and encrypted. We never store your complete card details.
      </div>
    </form>
  );
}