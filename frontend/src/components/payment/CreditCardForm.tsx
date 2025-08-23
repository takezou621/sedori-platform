'use client';

import { useState } from 'react';
import { CreditCardIcon, LockClosedIcon } from '@heroicons/react/24/outline';

interface CreditCardData {
  cardNumber: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
  cardholderName: string;
}

interface CreditCardFormProps {
  onDataChange: (data: CreditCardData) => void;
  className?: string;
}

export function CreditCardForm({ onDataChange, className = '' }: CreditCardFormProps) {
  const [cardData, setCardData] = useState<CreditCardData>({
    cardNumber: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
    cardholderName: '',
  });

  const handleChange = (field: keyof CreditCardData, value: string) => {
    let formattedValue = value;

    // Format card number with spaces
    if (field === 'cardNumber') {
      formattedValue = value
        .replace(/\s/g, '')
        .replace(/(.{4})/g, '$1 ')
        .trim()
        .slice(0, 19); // Max 16 digits + 3 spaces
    }

    // Limit CVV to 4 digits
    if (field === 'cvv') {
      formattedValue = value.replace(/\D/g, '').slice(0, 4);
    }

    // Limit expiry month to 2 digits and validate
    if (field === 'expiryMonth') {
      formattedValue = value.replace(/\D/g, '').slice(0, 2);
      if (formattedValue && parseInt(formattedValue) > 12) {
        formattedValue = '12';
      }
    }

    // Limit expiry year to 2 digits
    if (field === 'expiryYear') {
      formattedValue = value.replace(/\D/g, '').slice(0, 2);
    }

    const updatedData = { ...cardData, [field]: formattedValue };
    setCardData(updatedData);
    onDataChange(updatedData);
  };

  const getCardType = (cardNumber: string): string => {
    const number = cardNumber.replace(/\s/g, '');
    
    if (number.match(/^4/)) return 'visa';
    if (number.match(/^5[1-5]/) || number.match(/^2[2-7]/)) return 'mastercard';
    if (number.match(/^3[47]/)) return 'amex';
    if (number.match(/^6011/) || number.match(/^65/)) return 'discover';
    
    return 'unknown';
  };

  const cardType = getCardType(cardData.cardNumber);
  const currentYear = new Date().getFullYear() % 100; // Get last 2 digits

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Card Preview */}
      <div className="relative bg-gradient-to-br from-primary-600 to-primary-700 rounded-xl p-6 text-white">
        <div className="flex justify-between items-start mb-8">
          <CreditCardIcon className="h-8 w-8" />
          <div className="text-right text-sm opacity-75">
            {cardType === 'visa' && 'VISA'}
            {cardType === 'mastercard' && 'MasterCard'}
            {cardType === 'amex' && 'AMEX'}
            {cardType === 'discover' && 'Discover'}
          </div>
        </div>
        
        <div className="mb-4">
          <div className="font-mono text-lg tracking-wider">
            {cardData.cardNumber || '•••• •••• •••• ••••'}
          </div>
        </div>
        
        <div className="flex justify-between items-end">
          <div>
            <div className="text-xs opacity-75 mb-1">CARDHOLDER NAME</div>
            <div className="font-medium text-sm uppercase">
              {cardData.cardholderName || 'YOUR NAME HERE'}
            </div>
          </div>
          <div>
            <div className="text-xs opacity-75 mb-1">EXPIRES</div>
            <div className="font-mono">
              {cardData.expiryMonth || 'MM'}/{cardData.expiryYear || 'YY'}
            </div>
          </div>
        </div>
      </div>

      {/* Form Fields */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-secondary-700 mb-2">
            Cardholder Name
          </label>
          <input
            type="text"
            value={cardData.cardholderName}
            onChange={(e) => handleChange('cardholderName', e.target.value)}
            className="w-full px-4 py-3 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="John Doe"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-secondary-700 mb-2">
            Card Number
          </label>
          <div className="relative">
            <input
              type="text"
              value={cardData.cardNumber}
              onChange={(e) => handleChange('cardNumber', e.target.value)}
              className="w-full px-4 py-3 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono"
              placeholder="1234 5678 9012 3456"
              required
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <CreditCardIcon className="h-5 w-5 text-secondary-400" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">
              Month
            </label>
            <select
              value={cardData.expiryMonth}
              onChange={(e) => handleChange('expiryMonth', e.target.value)}
              className="w-full px-3 py-3 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
            >
              <option value="">MM</option>
              {Array.from({ length: 12 }, (_, i) => {
                const month = (i + 1).toString().padStart(2, '0');
                return (
                  <option key={month} value={month}>
                    {month}
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">
              Year
            </label>
            <select
              value={cardData.expiryYear}
              onChange={(e) => handleChange('expiryYear', e.target.value)}
              className="w-full px-3 py-3 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
            >
              <option value="">YY</option>
              {Array.from({ length: 10 }, (_, i) => {
                const year = (currentYear + i).toString().padStart(2, '0');
                return (
                  <option key={year} value={year}>
                    {year}
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">
              CVV
            </label>
            <div className="relative">
              <input
                type="text"
                value={cardData.cvv}
                onChange={(e) => handleChange('cvv', e.target.value)}
                className="w-full px-3 py-3 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono"
                placeholder="123"
                maxLength={4}
                required
              />
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                <LockClosedIcon className="h-4 w-4 text-secondary-400" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Security Note */}
      <div className="flex items-center p-3 bg-green-50 border border-green-200 rounded-lg">
        <LockClosedIcon className="h-5 w-5 text-green-600 mr-2 flex-shrink-0" />
        <div className="text-sm text-green-800">
          <span className="font-medium">Secure Payment</span>
          <br />
          Your payment information is encrypted and secure.
        </div>
      </div>
    </div>
  );
}