'use client';

import { useState } from 'react';
import { CreateProductRequest } from '@/types/product';
import { Card, Button, Input, Select, SelectItem } from '@/components/ui';
import { useRouter } from 'next/navigation';
import { 
  validateProductForm, 
  validateField
} from '@/lib/validation';
import {
  useErrorHandler,
  AppError,
  createValidationError,
  createProfitCalculationError,
  ErrorCode
} from '@/lib/errors';
import { sanitizeString, sanitizeNumber } from '@/lib/validation';
import { ApiErrorDisplay } from '@/components/common/ErrorBoundary';

export default function NewProductPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, AppError | null>>({});
  const [warnings, setWarnings] = useState<string[]>([]);
  const [generalError, setGeneralError] = useState<AppError | null>(null);
  const { handleError } = useErrorHandler();
  const [form, setForm] = useState<CreateProductRequest>({
    title: '',
    description: '',
    price: 0,
    cost: 0,
    imageUrl: '',
    category: '',
    stock: 0
  });

  const categories = [
    'Electronics',
    'Clothing',
    'Home & Garden',
    'Sports & Outdoors',
    'Books',
    'Health & Beauty',
    'Automotive',
    'Toys & Games'
  ];

  const validateAndUpdateForm = (field: keyof CreateProductRequest, value: string | number) => {
    try {
      let sanitizedValue: string | number;
      
      // Sanitize input based on field type
      if (field === 'price' || field === 'cost') {
        sanitizedValue = sanitizeNumber(value);
      } else if (field === 'stock') {
        sanitizedValue = Math.floor(sanitizeNumber(value));
      } else {
        sanitizedValue = typeof value === 'string' ? sanitizeString(value) : value;
      }
      
      // Update form
      const updatedForm = { ...form, [field]: sanitizedValue };
      setForm(updatedForm);
      
      // Clear previous error for this field
      setErrors(prev => ({ ...prev, [field]: null }));
      
      // Validate the specific field
      const fieldValidation = validateField(field, sanitizedValue, 'product');
      if (!fieldValidation.isValid && fieldValidation.errors.length > 0) {
        setErrors(prev => ({ ...prev, [field]: fieldValidation.errors[0] }));
        return;
      }
      
      // Special validation for profit calculation
      if ((field === 'cost' || field === 'price') && updatedForm.cost > 0 && updatedForm.price > 0) {
        try {
          const profit = updatedForm.price - updatedForm.cost;
          if (profit <= 0) {
            throw createProfitCalculationError(ErrorCode.COST_GREATER_THAN_PRICE, {
              cost: updatedForm.cost,
              price: updatedForm.price
            });
          }
          
          // Clear any existing profit-related errors
          setErrors(prev => ({ 
            ...prev, 
            cost: null, 
            price: null,
            profit: null 
          }));
        } catch (profitError) {
          if (profitError instanceof AppError) {
            setErrors(prev => ({ ...prev, profit: profitError }));
          }
        }
      }
      
      // Validate entire form for warnings
      const fullValidation = validateProductForm(updatedForm);
      setWarnings(fullValidation.warnings);
      
    } catch (error) {
      const appError = handleError(error);
      setErrors(prev => ({ ...prev, [field]: appError }));
    }
  };

  const updateForm = (field: keyof CreateProductRequest, value: string | number) => {
    validateAndUpdateForm(field, value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setGeneralError(null);

    try {
      // Comprehensive form validation
      const validation = validateProductForm(form);
      
      if (!validation.isValid) {
        const fieldErrors: Record<string, AppError | null> = {};
        validation.errors.forEach(error => {
          const field = error.details?.field || 'general';
          fieldErrors[field] = error;
        });
        
        setErrors(fieldErrors);
        setGeneralError(validation.errors[0]);
        return;
      }
      
      // Set warnings if any
      setWarnings(validation.warnings);
      
      // Prepare data for API
      const productData = {
        ...form,
        title: sanitizeString(form.title),
        description: sanitizeString(form.description),
        category: sanitizeString(form.category),
        imageUrl: form.imageUrl ? sanitizeString(form.imageUrl) : undefined,
        price: sanitizeNumber(form.price),
        cost: sanitizeNumber(form.cost),
        stock: Math.floor(sanitizeNumber(form.stock))
      };
      
      // API call with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(productData),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`HTTP ${response.status}: ${errorData.message || 'Unknown error'}`);
      }
      
      const result = await response.json();
      
      // Success - redirect to products page
      router.push(`/products/${result.id || ''}?created=true`);
      
    } catch (error: any) {
      console.error('Product creation error:', error);
      
      if (error.name === 'AbortError') {
        setGeneralError(
          createValidationError(ErrorCode.NETWORK_TIMEOUT, {
            message: 'Request timed out. Please try again.'
          })
        );
      } else {
        const appError = handleError(error);
        setGeneralError(appError);
      }
    } finally {
      setLoading(false);
    }
  };

  // Safe profit calculations with error handling
  const calculateProfit = () => {
    try {
      const cost = sanitizeNumber(form.cost);
      const price = sanitizeNumber(form.price);
      
      if (!cost || !price || cost < 0 || price < 0) {
        return { profit: 0, margin: '0', roi: '0', isValid: false };
      }
      
      const profit = price - cost;
      const margin = price > 0 ? ((profit / price) * 100).toFixed(1) : '0';
      const roi = cost > 0 ? ((profit / cost) * 100).toFixed(1) : '0';
      
      return { 
        profit: profit, 
        margin, 
        roi, 
        isValid: profit > 0 && isFinite(profit)
      };
    } catch {
      return { profit: 0, margin: '0', roi: '0', isValid: false };
    }
  };
  
  const { profit, margin, roi, isValid: isProfitValid } = calculateProfit();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Add New Product</h1>
          <p className="text-gray-600">Create a new product for your catalog</p>
        </div>

        {/* General Error Display */}
        {generalError && (
          <div className="mb-6">
            <ApiErrorDisplay
              error={{
                message: generalError.userMessage.ja || generalError.userMessage.en,
                statusCode: generalError.statusCode
              }}
              onRetry={() => setGeneralError(null)}
            />
          </div>
        )}

        {/* Warnings Display */}
        {warnings.length > 0 && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-yellow-400 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div>
                <h3 className="text-sm font-medium text-yellow-800">注意事項 / Warnings</h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <ul className="space-y-1">
                    {warnings.map((warning, index) => (
                      <li key={index}>• {warning}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Basic Information</h2>
            <div className="space-y-4">
              <div>
                <Input
                  placeholder="Product Title"
                  value={form.title}
                  onChange={(e) => updateForm('title', e.target.value)}
                  required
                  className={errors.title ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}
                />
                {errors.title && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.title.userMessage.ja || errors.title.userMessage.en}
                  </p>
                )}
              </div>
              
              <div>
                <textarea
                  placeholder="Product Description"
                  value={form.description}
                  onChange={(e) => updateForm('description', e.target.value)}
                  className={`w-full h-24 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:border-transparent ${
                    errors.description
                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                      : 'border-gray-300 focus:ring-blue-500'
                  }`}
                  required
                />
                {errors.description && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.description.userMessage.ja || errors.description.userMessage.en}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Select
                    value={form.category}
                    onValueChange={(value) => updateForm('category', value)}
                    placeholder="Select Category"
                  >
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </Select>
                  {errors.category && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.category.userMessage.ja || errors.category.userMessage.en}
                    </p>
                  )}
                </div>

                <div>
                  <Input
                    type="url"
                    placeholder="Image URL (optional)"
                    value={form.imageUrl}
                    onChange={(e) => updateForm('imageUrl', e.target.value)}
                    className={errors.imageUrl ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}
                  />
                  {errors.imageUrl && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.imageUrl.userMessage.ja || errors.imageUrl.userMessage.en}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Pricing */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Pricing & Inventory</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cost Price (仕入れ価格)
                </label>
                <Input
                  name="cost-price"
                  data-testid="cost-price-input"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="仕入れ価格を入力 / Cost Price"
                  value={form.cost || ''}
                  onChange={(e) => updateForm('cost', parseFloat(e.target.value) || 0)}
                  className={errors.cost || errors.profit ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}
                  required
                />
                {(errors.cost || errors.profit) && (
                  <p className="mt-1 text-sm text-red-600">
                    {(errors.cost || errors.profit)?.userMessage.ja || (errors.cost || errors.profit)?.userMessage.en}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Selling Price (販売価格)
                </label>
                <Input
                  name="selling-price"
                  data-testid="selling-price-input"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="販売価格を入力 / Selling Price"
                  value={form.price || ''}
                  onChange={(e) => updateForm('price', parseFloat(e.target.value) || 0)}
                  className={errors.price || errors.profit ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}
                  required
                />
                {(errors.price || errors.profit) && (
                  <p className="mt-1 text-sm text-red-600">
                    {(errors.price || errors.profit)?.userMessage.ja || (errors.price || errors.profit)?.userMessage.en}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Stock Quantity
                </label>
                <Input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={form.stock || ''}
                  onChange={(e) => updateForm('stock', parseInt(e.target.value) || 0)}
                  className={errors.stock ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}
                  required
                />
                {errors.stock && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.stock.userMessage.ja || errors.stock.userMessage.en}
                  </p>
                )}
              </div>
            </div>

            {/* Profit Analysis */}
            <div className={`mt-6 p-4 rounded-lg ${
              isProfitValid 
                ? 'bg-gray-50' 
                : errors.profit 
                  ? 'bg-red-50 border border-red-200' 
                  : 'bg-yellow-50 border border-yellow-200'
            }`}>
              <h3 className="font-medium text-gray-900 mb-3">Profit Analysis (利益分析)</h3>
              
              {!isProfitValid && !errors.profit && (
                <div className="mb-3 text-sm text-yellow-700">
                  <p>💡 有効な仕入れ価格と販売価格を入力してください / Enter valid cost and selling prices</p>
                </div>
              )}
              
              <div className="grid grid-cols-3 gap-4 text-center mb-4">
                <div>
                  <div className={`text-lg font-semibold ${
                    !isProfitValid ? 'text-gray-400' :
                    profit > 0 ? 'text-green-600' : 'text-red-600'
                  }`} data-testid="profit-amount">
                    ¥{profit.toFixed(2)}
                  </div>
                  <div className="text-sm text-gray-600">Profit per Unit (単位利益)</div>
                </div>
                <div>
                  <div className={`text-lg font-semibold ${
                    !isProfitValid ? 'text-gray-400' :
                    profit > 0 ? 'text-green-600' : 'text-red-600'
                  }`} data-testid="profit-margin">
                    {margin}%
                  </div>
                  <div className="text-sm text-gray-600">Profit Margin (利益率)</div>
                </div>
                <div>
                  <div className={`text-lg font-semibold ${
                    !isProfitValid ? 'text-gray-400' :
                    profit > 0 ? 'text-green-600' : 'text-red-600'
                  }`} data-testid="roi-percentage">
                    {roi}%
                  </div>
                  <div className="text-sm text-gray-600">ROI (投資収益率)</div>
                </div>
              </div>
              
              {/* Additional Profit Calculation Fields */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Calculated Profit (計算利益)
                  </label>
                  <Input
                    name="calculated-profit"
                    data-testid="calculated-profit-input"
                    type="number"
                    placeholder="利益額 / Profit Amount"
                    value={profit.toFixed(2)}
                    readOnly
                    className="bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Profit Margin (利益マージン)
                  </label>
                  <Input
                    name="profit-margin"
                    data-testid="profit-margin-input"
                    type="text"
                    placeholder="マージン / Margin %"
                    value={`${margin}%`}
                    readOnly
                    className="bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ROI (投資収益率)
                  </label>
                  <Input
                    name="roi-calculation"
                    data-testid="roi-calculation-input"
                    type="text"
                    placeholder="投資収益率 / ROI %"
                    value={`${roi}%`}
                    readOnly
                    className="bg-gray-100"
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Submit */}
          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/products')}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading || !isProfitValid || Object.values(errors).some(e => e !== null)}
            >
              {loading ? '商品作成中... / Creating Product...' : '商品を作成 / Create Product'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}