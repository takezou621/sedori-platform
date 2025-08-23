'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Button, Input, Select, Card } from '@/components/ui';
import { Product } from '@/types/product';
import { useCreateProduct, useUpdateProduct } from '@/hooks/useProducts';

const productSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(255, 'Name too long'),
  description: z.string().optional(),
  sku: z.string().min(1, 'SKU is required').max(100, 'SKU too long'),
  brand: z.string().optional(),
  model: z.string().optional(),
  categoryId: z.string().optional(),
  wholesalePrice: z.number().min(0, 'Wholesale price must be positive'),
  retailPrice: z.number().min(0, 'Retail price must be positive'),
  marketPrice: z.number().min(0, 'Market price must be positive').optional(),
  currency: z.enum(['JPY', 'USD', 'EUR']),
  condition: z.enum(['new', 'used', 'refurbished']),
  status: z.enum(['active', 'inactive', 'draft']),
  supplier: z.string().optional(),
  supplierUrl: z.string().url('Invalid URL').optional().or(z.literal('')),
  stockQuantity: z.number().min(0, 'Stock quantity must be non-negative').optional(),
  minOrderQuantity: z.number().min(1, 'Minimum order quantity must be at least 1').optional(),
  maxOrderQuantity: z.number().min(1, 'Maximum order quantity must be at least 1').optional(),
  weight: z.number().min(0, 'Weight must be non-negative').optional(),
  weightUnit: z.enum(['g', 'kg', 'lb', 'oz']).optional(),
  dimensions: z.object({
    length: z.number().min(0),
    width: z.number().min(0),
    height: z.number().min(0),
    unit: z.enum(['cm', 'inch']),
  }).optional(),
  tags: z.array(z.string()).optional(),
}).refine((data) => data.retailPrice >= data.wholesalePrice, {
  message: 'Retail price must be greater than or equal to wholesale price',
  path: ['retailPrice'],
});

type ProductFormData = z.infer<typeof productSchema>;

interface ProductFormProps {
  product?: Product;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function ProductForm({ product, onSuccess, onCancel }: ProductFormProps) {
  const router = useRouter();
  const [tags, setTags] = useState<string[]>(product?.tags || []);
  const [newTag, setNewTag] = useState('');

  const createProductMutation = useCreateProduct();
  const updateProductMutation = useUpdateProduct();

  const isEditing = Boolean(product);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    setValue,
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: product ? {
      name: product.name,
      description: product.description || '',
      sku: product.sku,
      brand: product.brand || '',
      model: product.model || '',
      categoryId: product.categoryId || '',
      wholesalePrice: product.wholesalePrice,
      retailPrice: product.retailPrice,
      marketPrice: product.marketPrice || undefined,
      currency: product.currency,
      condition: product.condition,
      status: product.status,
      supplier: product.supplier || '',
      supplierUrl: product.supplierUrl || '',
      stockQuantity: product.stockQuantity || undefined,
      minOrderQuantity: product.minOrderQuantity || undefined,
      maxOrderQuantity: product.maxOrderQuantity || undefined,
      weight: product.weight || undefined,
      weightUnit: product.weightUnit || 'kg',
      dimensions: product.dimensions || undefined,
      tags: product.tags || [],
    } : {
      currency: 'JPY',
      condition: 'new',
      status: 'draft',
      weightUnit: 'kg',
      tags: [],
    },
  });

  const wholesalePrice = watch('wholesalePrice');
  const retailPrice = watch('retailPrice');

  // Calculate profit metrics in real-time
  const profitMargin = wholesalePrice && retailPrice && retailPrice > 0
    ? ((retailPrice - wholesalePrice) / retailPrice * 100).toFixed(1)
    : '0';

  const roi = wholesalePrice && retailPrice && wholesalePrice > 0
    ? ((retailPrice - wholesalePrice) / wholesalePrice * 100).toFixed(1)
    : '0';

  useEffect(() => {
    setValue('tags', tags);
  }, [tags, setValue]);

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const onSubmit = async (data: ProductFormData) => {
    try {
      const productData = {
        ...data,
        tags,
        supplierUrl: data.supplierUrl || undefined,
        marketPrice: data.marketPrice || undefined,
      };

      if (isEditing && product) {
        await updateProductMutation.mutateAsync({ id: product.id, ...productData });
      } else {
        await createProductMutation.mutateAsync(productData);
      }

      if (onSuccess) {
        onSuccess();
      } else {
        router.push('/products');
      }
    } catch (error) {
      console.error('Failed to save product:', error);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      router.back();
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* Basic Information */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-secondary-900 mb-4">
          Basic Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">
              Product Name *
            </label>
            <Input
              {...register('name')}
              error={errors.name?.message}
              placeholder="Enter product name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">
              SKU *
            </label>
            <Input
              {...register('sku')}
              error={errors.sku?.message}
              placeholder="e.g., PROD-001"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">
              Brand
            </label>
            <Input
              {...register('brand')}
              error={errors.brand?.message}
              placeholder="Enter brand name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">
              Model
            </label>
            <Input
              {...register('model')}
              error={errors.model?.message}
              placeholder="Enter model number"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-secondary-700 mb-1">
              Description
            </label>
            <textarea
              {...register('description')}
              rows={3}
              className="w-full rounded-md border border-secondary-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              placeholder="Enter product description"
            />
          </div>
        </div>
      </Card>

      {/* Pricing */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-secondary-900 mb-4">
          Pricing & Profitability
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">
              Wholesale Price *
            </label>
            <Input
              type="number"
              step="0.01"
              min="0"
              {...register('wholesalePrice', { valueAsNumber: true })}
              error={errors.wholesalePrice?.message}
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">
              Retail Price *
            </label>
            <Input
              type="number"
              step="0.01"
              min="0"
              {...register('retailPrice', { valueAsNumber: true })}
              error={errors.retailPrice?.message}
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">
              Market Price
            </label>
            <Input
              type="number"
              step="0.01"
              min="0"
              {...register('marketPrice', { valueAsNumber: true })}
              error={errors.marketPrice?.message}
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">
              Currency *
            </label>
            <Controller
              name="currency"
              control={control}
              render={({ field }) => (
                <Select {...field} onValueChange={field.onChange}>
                  <option value="JPY">Japanese Yen (¥)</option>
                  <option value="USD">US Dollar ($)</option>
                  <option value="EUR">Euro (€)</option>
                </Select>
              )}
            />
          </div>

          {/* Real-time profit calculations */}
          <div className="bg-secondary-50 p-4 rounded-md">
            <h4 className="text-sm font-medium text-secondary-700 mb-2">Profit Margin</h4>
            <p className="text-2xl font-bold text-primary-600">{profitMargin}%</p>
          </div>

          <div className="bg-secondary-50 p-4 rounded-md">
            <h4 className="text-sm font-medium text-secondary-700 mb-2">ROI</h4>
            <p className="text-2xl font-bold text-blue-600">{roi}%</p>
          </div>
        </div>
      </Card>

      {/* Product Details */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-secondary-900 mb-4">
          Product Details
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">
              Condition *
            </label>
            <Controller
              name="condition"
              control={control}
              render={({ field }) => (
                <Select {...field} onValueChange={field.onChange}>
                  <option value="new">New</option>
                  <option value="used">Used</option>
                  <option value="refurbished">Refurbished</option>
                </Select>
              )}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">
              Status *
            </label>
            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <Select {...field} onValueChange={field.onChange}>
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </Select>
              )}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">
              Stock Quantity
            </label>
            <Input
              type="number"
              min="0"
              {...register('stockQuantity', { valueAsNumber: true })}
              error={errors.stockQuantity?.message}
              placeholder="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">
              Weight
            </label>
            <div className="flex gap-2">
              <Input
                type="number"
                step="0.01"
                min="0"
                {...register('weight', { valueAsNumber: true })}
                error={errors.weight?.message}
                placeholder="0.00"
                className="flex-1"
              />
              <Controller
                name="weightUnit"
                control={control}
                render={({ field }) => (
                  <Select {...field} onValueChange={field.onChange} className="w-20">
                    <option value="g">g</option>
                    <option value="kg">kg</option>
                    <option value="lb">lb</option>
                    <option value="oz">oz</option>
                  </Select>
                )}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Supplier Information */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-secondary-900 mb-4">
          Supplier Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">
              Supplier Name
            </label>
            <Input
              {...register('supplier')}
              error={errors.supplier?.message}
              placeholder="Enter supplier name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">
              Supplier URL
            </label>
            <Input
              type="url"
              {...register('supplierUrl')}
              error={errors.supplierUrl?.message}
              placeholder="https://supplier.com/product"
            />
          </div>
        </div>
      </Card>

      {/* Tags */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-secondary-900 mb-4">
          Tags
        </h3>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              placeholder="Add a tag"
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
              className="flex-1"
            />
            <Button type="button" onClick={addTag} disabled={!newTag.trim()}>
              <PlusIcon className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-3 py-1 bg-primary-100 text-primary-800 rounded-full text-sm"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="ml-1 hover:text-primary-900"
                >
                  <XMarkIcon className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      </Card>

      {/* Form Actions */}
      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline" onClick={handleCancel}>
          Cancel
        </Button>
        <Button
          type="submit"
          isLoading={isSubmitting}
          disabled={isSubmitting}
        >
          {isEditing ? 'Update Product' : 'Create Product'}
        </Button>
      </div>
    </form>
  );
}