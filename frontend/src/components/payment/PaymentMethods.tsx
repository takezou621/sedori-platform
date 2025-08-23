'use client';

import { CreditCardIcon, BanknotesIcon } from '@heroicons/react/24/outline';
import { PaymentMethod } from '@/types/order';

interface PaymentMethodsProps {
  selectedMethod: PaymentMethod;
  onMethodChange: (method: PaymentMethod) => void;
  className?: string;
}

export function PaymentMethods({ 
  selectedMethod, 
  onMethodChange, 
  className = '' 
}: PaymentMethodsProps) {
  const paymentMethods = [
    {
      id: 'credit_card' as PaymentMethod,
      name: 'Credit Card',
      description: 'Visa, MasterCard, American Express',
      icon: CreditCardIcon,
      popular: true,
    },
    {
      id: 'paypal' as PaymentMethod,
      name: 'PayPal',
      description: 'Pay with your PayPal account',
      icon: BanknotesIcon,
      popular: false,
    },
    {
      id: 'bank_transfer' as PaymentMethod,
      name: 'Bank Transfer',
      description: 'Direct bank transfer',
      icon: BanknotesIcon,
      popular: false,
    },
    {
      id: 'apple_pay' as PaymentMethod,
      name: 'Apple Pay',
      description: 'Touch ID or Face ID',
      icon: CreditCardIcon,
      popular: false,
    },
    {
      id: 'google_pay' as PaymentMethod,
      name: 'Google Pay',
      description: 'Quick and secure payments',
      icon: CreditCardIcon,
      popular: false,
    },
  ];

  return (
    <div className={`space-y-3 ${className}`}>
      {paymentMethods.map((method) => {
        const Icon = method.icon;
        const isSelected = selectedMethod === method.id;

        return (
          <label
            key={method.id}
            className={`relative flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${
              isSelected
                ? 'border-primary-500 bg-primary-50'
                : 'border-secondary-300 hover:bg-secondary-50'
            }`}
          >
            <input
              type="radio"
              name="paymentMethod"
              value={method.id}
              checked={isSelected}
              onChange={(e) => onMethodChange(e.target.value as PaymentMethod)}
              className="sr-only"
            />
            
            <div className="flex items-center flex-1">
              <div
                className={`w-4 h-4 rounded-full border-2 mr-4 flex-shrink-0 ${
                  isSelected
                    ? 'border-primary-600 bg-primary-600'
                    : 'border-secondary-300'
                }`}
              >
                {isSelected && (
                  <div className="w-full h-full rounded-full bg-white transform scale-50"></div>
                )}
              </div>

              <Icon className={`h-6 w-6 mr-3 ${
                isSelected ? 'text-primary-600' : 'text-secondary-400'
              }`} />

              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className={`font-medium ${
                    isSelected ? 'text-primary-900' : 'text-secondary-900'
                  }`}>
                    {method.name}
                  </span>
                  {method.popular && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                      Popular
                    </span>
                  )}
                </div>
                <p className={`text-sm mt-1 ${
                  isSelected ? 'text-primary-700' : 'text-secondary-500'
                }`}>
                  {method.description}
                </p>
              </div>
            </div>

            {/* Selected indicator */}
            {isSelected && (
              <div className="absolute top-2 right-2">
                <div className="w-2 h-2 rounded-full bg-primary-600"></div>
              </div>
            )}
          </label>
        );
      })}
    </div>
  );
}