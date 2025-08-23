'use client';

import { useState } from 'react';
import { CreateProductRequest } from '@/types/product';
import { Card, Button, Input, Select, SelectItem } from '@/components/ui';
import { useRouter } from 'next/navigation';

export default function NewProductPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
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

  const updateForm = (field: keyof CreateProductRequest, value: string | number) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Simulate success
      alert('Product created successfully!');
      router.push('/products');
    } catch {
      alert('Failed to create product. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const profit = form.price - form.cost;
  const margin = form.price > 0 ? ((profit / form.price) * 100).toFixed(1) : 0;
  const roi = form.cost > 0 ? ((profit / form.cost) * 100).toFixed(1) : 0;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Add New Product</h1>
          <p className="text-gray-600">Create a new product for your catalog</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Basic Information</h2>
            <div className="space-y-4">
              <Input
                placeholder="Product Title"
                value={form.title}
                onChange={(e) => updateForm('title', e.target.value)}
                required
              />
              
              <div>
                <textarea
                  placeholder="Product Description"
                  value={form.description}
                  onChange={(e) => updateForm('description', e.target.value)}
                  className="w-full h-24 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                <Input
                  type="url"
                  placeholder="Image URL (optional)"
                  value={form.imageUrl}
                  onChange={(e) => updateForm('imageUrl', e.target.value)}
                />
              </div>
            </div>
          </Card>

          {/* Pricing */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Pricing & Inventory</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cost Price ($)
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={form.cost || ''}
                  onChange={(e) => updateForm('cost', parseFloat(e.target.value) || 0)}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Selling Price ($)
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={form.price || ''}
                  onChange={(e) => updateForm('price', parseFloat(e.target.value) || 0)}
                  required
                />
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
                  required
                />
              </div>
            </div>

            {/* Profit Analysis */}
            {(form.price > 0 || form.cost > 0) && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-3">Profit Analysis</h3>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-lg font-semibold text-gray-900">
                      ${profit.toFixed(2)}
                    </div>
                    <div className="text-sm text-gray-600">Profit per Unit</div>
                  </div>
                  <div>
                    <div className={`text-lg font-semibold ${profit > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {margin}%
                    </div>
                    <div className="text-sm text-gray-600">Profit Margin</div>
                  </div>
                  <div>
                    <div className={`text-lg font-semibold ${profit > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {roi}%
                    </div>
                    <div className="text-sm text-gray-600">ROI</div>
                  </div>
                </div>
              </div>
            )}
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
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating Product...' : 'Create Product'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}