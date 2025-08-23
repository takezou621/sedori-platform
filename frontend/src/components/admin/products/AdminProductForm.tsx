'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  XMarkIcon,
  PlusIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { Card, Button, LoadingSpinner, Badge } from '@/components/ui';
import { useCreateProduct, useUpdateProduct, useProduct, useUploadProductImage } from '@/hooks/useProducts';
import { CreateProductRequest, UpdateProductRequest, Product } from '@/types/product';

interface AdminProductFormProps {
  productId?: string;
  onSuccess?: (product: Product) => void;
}

interface ProductFormData {
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  currency: string;
  sku: string;
  category: string;
  brand: string;
  status: 'active' | 'draft' | 'inactive';
  stockQuantity: number;
  minOrderQuantity?: number;
  maxOrderQuantity?: number;
  weight?: number;
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
  };
  tags: string[];
  primaryImageUrl?: string;
  imageUrls: string[];
  metaTitle?: string;
  metaDescription?: string;
  isDigital: boolean;
  trackInventory: boolean;
}

const initialFormData: ProductFormData = {
  name: '',
  description: '',
  price: 0,
  currency: 'JPY',
  sku: '',
  category: '',
  brand: '',
  status: 'draft',
  stockQuantity: 0,
  weight: 0,
  dimensions: {},
  tags: [],
  imageUrls: [],
  isDigital: false,
  trackInventory: true,
};

export function AdminProductForm({ productId, onSuccess }: AdminProductFormProps) {
  const router = useRouter();
  const isEditing = !!productId;

  const { data: existingProduct, isLoading: isLoadingProduct } = useProduct(productId || '');
  const createProductMutation = useCreateProduct();
  const updateProductMutation = useUpdateProduct();
  const uploadImageMutation = useUploadProductImage();

  const [formData, setFormData] = useState<ProductFormData>(initialFormData);
  const [errors, setErrors] = useState<Partial<ProductFormData>>({});
  const [tagInput, setTagInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Load existing product data when editing
  useEffect(() => {
    if (isEditing && existingProduct) {
      setFormData({
        name: existingProduct.name,
        description: existingProduct.description || '',
        price: existingProduct.price,
        originalPrice: existingProduct.originalPrice,
        currency: existingProduct.currency,
        sku: existingProduct.sku,
        category: existingProduct.category?.id || '',
        brand: existingProduct.brand || '',
        status: existingProduct.status,
        stockQuantity: existingProduct.stockQuantity || 0,
        minOrderQuantity: existingProduct.minOrderQuantity,
        maxOrderQuantity: existingProduct.maxOrderQuantity,
        weight: existingProduct.weight,
        dimensions: existingProduct.dimensions || {},
        tags: existingProduct.tags || [],
        primaryImageUrl: existingProduct.primaryImageUrl,
        imageUrls: existingProduct.imageUrls || [],
        metaTitle: existingProduct.metaTitle,
        metaDescription: existingProduct.metaDescription,
        isDigital: existingProduct.isDigital || false,
        trackInventory: existingProduct.trackInventory !== false,
      });
    }
  }, [isEditing, existingProduct]);

  const validateForm = (): boolean => {
    const newErrors: Partial<ProductFormData> = {};

    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (Number(formData.price) <= 0) newErrors.price = 'Price must be greater than 0' as any;
    if (!formData.sku.trim()) newErrors.sku = 'SKU is required';
    if (!formData.category.trim()) newErrors.category = 'Category is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof ProductFormData, value: string | number | boolean | undefined) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleDimensionChange = (dimension: 'length' | 'width' | 'height', value: number) => {
    setFormData(prev => ({
      ...prev,
      dimensions: {
        ...prev.dimensions,
        [dimension]: value || undefined,
      },
    }));
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()],
      }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove),
    }));
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const result = await uploadImageMutation.mutateAsync({
          productId: productId || 'temp',
          file
        });
        return result.imageUrl;
      });

      const newImageUrls = await Promise.all(uploadPromises);
      
      setFormData(prev => {
        const updatedUrls = [...prev.imageUrls, ...newImageUrls];
        return {
          ...prev,
          imageUrls: updatedUrls,
          primaryImageUrl: prev.primaryImageUrl || updatedUrls[0],
        };
      });
    } catch (error) {
      console.error('Failed to upload images:', error);
      alert('Failed to upload images. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = (imageUrl: string) => {
    setFormData(prev => {
      const updatedUrls = prev.imageUrls.filter(url => url !== imageUrl);
      return {
        ...prev,
        imageUrls: updatedUrls,
        primaryImageUrl: prev.primaryImageUrl === imageUrl 
          ? updatedUrls[0] || undefined 
          : prev.primaryImageUrl,
      };
    });
  };

  const handleSetPrimaryImage = (imageUrl: string) => {
    setFormData(prev => ({ ...prev, primaryImageUrl: imageUrl }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      const baseData = {
        name: formData.name,
        description: formData.description,
        price: formData.price,
        originalPrice: formData.originalPrice,
        currency: formData.currency as 'JPY' | 'USD' | 'EUR',
        sku: formData.sku,
        categoryId: formData.category,
        brand: formData.brand || undefined,
        status: formData.status,
        stockQuantity: formData.trackInventory ? formData.stockQuantity : undefined,
        minOrderQuantity: formData.minOrderQuantity,
        maxOrderQuantity: formData.maxOrderQuantity,
        weight: formData.weight,
        dimensions: formData.dimensions && Object.keys(formData.dimensions).length > 0 ? {
          length: formData.dimensions.length || 0,
          width: formData.dimensions.width || 0,
          height: formData.dimensions.height || 0,
          unit: 'cm' as const
        } : undefined,
        tags: formData.tags.length > 0 ? formData.tags : undefined,
        imageUrls: formData.imageUrls.length > 0 ? formData.imageUrls : undefined,
        metaTitle: formData.metaTitle,
        metaDescription: formData.metaDescription,
        isDigital: formData.isDigital,
        trackInventory: formData.trackInventory,
      };

      let result: Product;
      
      if (isEditing && productId) {
        result = await updateProductMutation.mutateAsync({
          ...baseData as UpdateProductRequest,
          id: productId,
        });
      } else {
        result = await createProductMutation.mutateAsync(baseData as CreateProductRequest);
      }

      if (onSuccess) {
        onSuccess(result);
      } else {
        router.push('/admin/products');
      }
    } catch (error) {
      console.error('Failed to save product:', error);
      alert('Failed to save product. Please try again.');
    }
  };

  const isSubmitting = createProductMutation.isPending || updateProductMutation.isPending;

  if (isEditing && isLoadingProduct) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-secondary-900">
          {isEditing ? 'Edit Product' : 'Create Product'}
        </h1>
        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/admin/products')}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                {isEditing ? 'Updating...' : 'Creating...'}
              </>
            ) : (
              isEditing ? 'Update Product' : 'Create Product'
            )}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <Card className="p-6">
            <h3 className="text-lg font-medium text-secondary-900 mb-4">
              Basic Information
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">
                  Product Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                    errors.name ? 'border-red-300' : 'border-secondary-300'
                  }`}
                  placeholder="Enter product name"
                  required
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">
                  Description *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={4}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                    errors.description ? 'border-red-300' : 'border-secondary-300'
                  }`}
                  placeholder="Enter product description"
                  required
                />
                {errors.description && (
                  <p className="mt-1 text-sm text-red-600">{errors.description}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-2">
                    SKU *
                  </label>
                  <input
                    type="text"
                    value={formData.sku}
                    onChange={(e) => handleInputChange('sku', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                      errors.sku ? 'border-red-300' : 'border-secondary-300'
                    }`}
                    placeholder="Enter SKU"
                    required
                  />
                  {errors.sku && (
                    <p className="mt-1 text-sm text-red-600">{errors.sku}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-2">
                    Brand
                  </label>
                  <input
                    type="text"
                    value={formData.brand}
                    onChange={(e) => handleInputChange('brand', e.target.value)}
                    className="w-full px-4 py-3 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Enter brand name"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">
                  Category *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => handleInputChange('category', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                    errors.category ? 'border-red-300' : 'border-secondary-300'
                  }`}
                  required
                >
                  <option value="">Select a category</option>
                  <option value="electronics">Electronics</option>
                  <option value="clothing">Clothing</option>
                  <option value="home">Home & Garden</option>
                  <option value="books">Books</option>
                  <option value="sports">Sports & Outdoors</option>
                </select>
                {errors.category && (
                  <p className="mt-1 text-sm text-red-600">{errors.category}</p>
                )}
              </div>
            </div>
          </Card>

          {/* Pricing */}
          <Card className="p-6">
            <h3 className="text-lg font-medium text-secondary-900 mb-4">
              Pricing
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">
                  Price *
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || 0)}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                    errors.price ? 'border-red-300' : 'border-secondary-300'
                  }`}
                  placeholder="0.00"
                  required
                />
                {errors.price && (
                  <p className="mt-1 text-sm text-red-600">{errors.price}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">
                  Original Price
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.originalPrice || ''}
                  onChange={(e) => handleInputChange('originalPrice', e.target.value ? parseFloat(e.target.value) : undefined)}
                  className="w-full px-4 py-3 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">
                  Currency
                </label>
                <select
                  value={formData.currency}
                  onChange={(e) => handleInputChange('currency', e.target.value)}
                  className="w-full px-4 py-3 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="JPY">Japanese Yen (JPY)</option>
                  <option value="USD">US Dollar (USD)</option>
                  <option value="EUR">Euro (EUR)</option>
                </select>
              </div>
            </div>
          </Card>

          {/* Images */}
          <Card className="p-6">
            <h3 className="text-lg font-medium text-secondary-900 mb-4">
              Product Images
            </h3>

            {/* Image Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-4">
              {formData.imageUrls.map((imageUrl, index) => (
                <div key={index} className="relative group">
                  <div className="aspect-square bg-secondary-100 rounded-lg overflow-hidden">
                    <Image
                      src={imageUrl}
                      alt={`Product image ${index + 1}`}
                      width={200}
                      height={200}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  {/* Image actions */}
                  <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                    {formData.primaryImageUrl !== imageUrl && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleSetPrimaryImage(imageUrl)}
                        className="text-xs"
                      >
                        Set Primary
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveImage(imageUrl)}
                      className="text-red-600 border-red-600 hover:bg-red-600 hover:text-white"
                    >
                      <TrashIcon className="h-3 w-3" />
                    </Button>
                  </div>
                  
                  {/* Primary image badge */}
                  {formData.primaryImageUrl === imageUrl && (
                    <Badge className="absolute top-2 left-2 bg-primary-600 text-white text-xs">
                      Primary
                    </Badge>
                  )}
                </div>
              ))}

              {/* Add Image Button */}
              <label className="aspect-square border-2 border-dashed border-secondary-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary-500 hover:bg-primary-50 transition-colors">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={isUploading}
                />
                {isUploading ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <>
                    <PlusIcon className="h-8 w-8 text-secondary-400 mb-2" />
                    <span className="text-sm text-secondary-600">Add Image</span>
                  </>
                )}
              </label>
            </div>

            <p className="text-sm text-secondary-500">
              Upload product images. The first image will be used as the primary image.
              You can reorder images by setting a different primary image.
            </p>
          </Card>

          {/* Tags */}
          <Card className="p-6">
            <h3 className="text-lg font-medium text-secondary-900 mb-4">
              Tags
            </h3>
            
            <div className="flex flex-wrap gap-2 mb-4">
              {formData.tags.map((tag, index) => (
                <Badge key={index} className="bg-secondary-100 text-secondary-800 flex items-center gap-1">
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="ml-1 text-secondary-500 hover:text-secondary-700"
                  >
                    <XMarkIcon className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                className="flex-1 px-4 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Enter a tag"
              />
              <Button type="button" onClick={handleAddTag}>
                Add Tag
              </Button>
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status & Visibility */}
          <Card className="p-6">
            <h3 className="text-lg font-medium text-secondary-900 mb-4">
              Status & Visibility
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  className="w-full px-4 py-3 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isDigital"
                  checked={formData.isDigital}
                  onChange={(e) => handleInputChange('isDigital', e.target.checked)}
                  className="rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
                />
                <label htmlFor="isDigital" className="ml-2 text-sm text-secondary-700">
                  Digital Product (no shipping required)
                </label>
              </div>
            </div>
          </Card>

          {/* Inventory */}
          <Card className="p-6">
            <h3 className="text-lg font-medium text-secondary-900 mb-4">
              Inventory
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="trackInventory"
                  checked={formData.trackInventory}
                  onChange={(e) => handleInputChange('trackInventory', e.target.checked)}
                  className="rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
                />
                <label htmlFor="trackInventory" className="ml-2 text-sm text-secondary-700">
                  Track inventory quantity
                </label>
              </div>

              {formData.trackInventory && (
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-2">
                    Stock Quantity
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.stockQuantity}
                    onChange={(e) => handleInputChange('stockQuantity', parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-3 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="0"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-2">
                    Min Order
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.minOrderQuantity || ''}
                    onChange={(e) => handleInputChange('minOrderQuantity', e.target.value ? parseInt(e.target.value) : undefined)}
                    className="w-full px-4 py-3 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-2">
                    Max Order
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.maxOrderQuantity || ''}
                    onChange={(e) => handleInputChange('maxOrderQuantity', e.target.value ? parseInt(e.target.value) : undefined)}
                    className="w-full px-4 py-3 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="No limit"
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Shipping */}
          {!formData.isDigital && (
            <Card className="p-6">
              <h3 className="text-lg font-medium text-secondary-900 mb-4">
                Shipping
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-2">
                    Weight (kg)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.weight || ''}
                    onChange={(e) => handleInputChange('weight', e.target.value ? parseFloat(e.target.value) : undefined)}
                    className="w-full px-4 py-3 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-2">
                    Dimensions (cm)
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={formData.dimensions?.length || ''}
                      onChange={(e) => handleDimensionChange('length', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                      placeholder="L"
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={formData.dimensions?.width || ''}
                      onChange={(e) => handleDimensionChange('width', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                      placeholder="W"
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={formData.dimensions?.height || ''}
                      onChange={(e) => handleDimensionChange('height', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                      placeholder="H"
                    />
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* SEO */}
          <Card className="p-6">
            <h3 className="text-lg font-medium text-secondary-900 mb-4">
              SEO
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">
                  Meta Title
                </label>
                <input
                  type="text"
                  value={formData.metaTitle || ''}
                  onChange={(e) => handleInputChange('metaTitle', e.target.value || undefined)}
                  className="w-full px-4 py-3 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="SEO title"
                  maxLength={60}
                />
                <p className="text-xs text-secondary-500 mt-1">
                  {(formData.metaTitle || '').length}/60 characters
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">
                  Meta Description
                </label>
                <textarea
                  value={formData.metaDescription || ''}
                  onChange={(e) => handleInputChange('metaDescription', e.target.value || undefined)}
                  rows={3}
                  className="w-full px-4 py-3 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="SEO description"
                  maxLength={160}
                />
                <p className="text-xs text-secondary-500 mt-1">
                  {(formData.metaDescription || '').length}/160 characters
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </form>
  );
}