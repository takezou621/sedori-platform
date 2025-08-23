'use client';

import { useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronDownIcon, FunnelIcon } from '@heroicons/react/24/outline';
import { Button, Select, Input, Checkbox } from '@/components/ui';
import { ProductFilters as ProductFiltersType } from '@/types/product';

interface ProductFiltersProps {
  onFiltersChange?: (filters: ProductFiltersType) => void;
  categories?: Array<{ id: string; name: string }>;
  brands?: string[];
  className?: string;
}

export function ProductFilters({ 
  onFiltersChange,
  categories = [],
  brands = [],
  className = "" 
}: ProductFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState<ProductFiltersType>({
    categoryId: searchParams.get('categoryId') || '',
    brand: searchParams.get('brand') || '',
    condition: searchParams.get('condition') || '',
    minPrice: searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : undefined,
    maxPrice: searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : undefined,
    inStock: searchParams.get('inStock') === 'true',
    tags: searchParams.getAll('tags'),
  });

  const applyFilters = useCallback(() => {
    if (onFiltersChange) {
      onFiltersChange(localFilters);
      return;
    }

    const params = new URLSearchParams(searchParams.toString());
    
    // Clear existing filter params
    params.delete('categoryId');
    params.delete('brand');
    params.delete('condition');
    params.delete('minPrice');
    params.delete('maxPrice');
    params.delete('inStock');
    params.delete('tags');
    params.delete('page');

    // Apply new filters
    if (localFilters.categoryId) params.set('categoryId', localFilters.categoryId);
    if (localFilters.brand) params.set('brand', localFilters.brand);
    if (localFilters.condition) params.set('condition', localFilters.condition);
    if (localFilters.minPrice !== undefined) params.set('minPrice', localFilters.minPrice.toString());
    if (localFilters.maxPrice !== undefined) params.set('maxPrice', localFilters.maxPrice.toString());
    if (localFilters.inStock) params.set('inStock', 'true');
    if (localFilters.tags) localFilters.tags.forEach(tag => params.append('tags', tag));

    const newUrl = params.toString() ? `?${params.toString()}` : '';
    router.push(`/products${newUrl}`, { scroll: false });
  }, [localFilters, onFiltersChange, searchParams, router]);

  const clearFilters = () => {
    const clearedFilters: ProductFiltersType = {
      categoryId: '',
      brand: '',
      condition: '',
      minPrice: undefined,
      maxPrice: undefined,
      inStock: false,
      tags: [],
    };
    setLocalFilters(clearedFilters);
    
    if (onFiltersChange) {
      onFiltersChange(clearedFilters);
    } else {
      const params = new URLSearchParams(searchParams.toString());
      params.delete('categoryId');
      params.delete('brand');
      params.delete('condition');
      params.delete('minPrice');
      params.delete('maxPrice');
      params.delete('inStock');
      params.delete('tags');
      params.delete('page');
      
      const newUrl = params.toString() ? `?${params.toString()}` : '';
      router.push(`/products${newUrl}`, { scroll: false });
    }
  };

  const hasActiveFilters = Object.values(localFilters).some(value => {
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'boolean') return value;
    return Boolean(value);
  });

  return (
    <div className={className}>
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2"
        >
          <FunnelIcon className="h-4 w-4" />
          Filters
          {hasActiveFilters && (
            <span className="ml-1 bg-primary-100 text-primary-800 text-xs px-2 py-0.5 rounded-full">
              {Object.values(localFilters).filter(value => {
                if (Array.isArray(value)) return value.length > 0;
                if (typeof value === 'boolean') return value;
                return Boolean(value);
              }).length}
            </span>
          )}
          <ChevronDownIcon className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </Button>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear filters
          </Button>
        )}
      </div>

      {isOpen && (
        <div className="mt-4 p-4 border rounded-lg bg-white shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Category
              </label>
              <Select
                value={localFilters.categoryId}
                onValueChange={(value: string) =>
                  setLocalFilters({ ...localFilters, categoryId: value })
                }
              >
                <option value="">All Categories</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Brand
              </label>
              <Select
                value={localFilters.brand}
                onValueChange={(value: string) =>
                  setLocalFilters({ ...localFilters, brand: value })
                }
              >
                <option value="">All Brands</option>
                {brands.map((brand) => (
                  <option key={brand} value={brand}>
                    {brand}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Condition
              </label>
              <Select
                value={localFilters.condition}
                onValueChange={(value: string) =>
                  setLocalFilters({ ...localFilters, condition: value })
                }
              >
                <option value="">All Conditions</option>
                <option value="new">New</option>
                <option value="used">Used</option>
                <option value="refurbished">Refurbished</option>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Stock Status
              </label>
              <Checkbox
                checked={localFilters.inStock}
                onChange={(checked: boolean) =>
                  setLocalFilters({ ...localFilters, inStock: checked })
                }
                label="In Stock Only"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Min Price (¥)
              </label>
              <Input
                type="number"
                value={localFilters.minPrice || ''}
                onChange={(e) =>
                  setLocalFilters({
                    ...localFilters,
                    minPrice: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                placeholder="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Max Price (¥)
              </label>
              <Input
                type="number"
                value={localFilters.maxPrice || ''}
                onChange={(e) =>
                  setLocalFilters({
                    ...localFilters,
                    maxPrice: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                placeholder="No limit"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={applyFilters}>
              Apply Filters
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}