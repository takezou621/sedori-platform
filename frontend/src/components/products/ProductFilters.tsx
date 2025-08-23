'use client';

import { useState } from 'react';
import { ProductFilters as ProductFiltersType, ProductSort } from '@/types/product';
import { Button, Input, Select, SelectItem, Checkbox } from '@/components/ui';

interface ProductFiltersProps {
  filters: ProductFiltersType;
  sort: ProductSort;
  onFiltersChange: (filters: ProductFiltersType) => void;
  onSortChange: (sort: ProductSort) => void;
  categories: string[];
}

export function ProductFilters({ 
  filters, 
  sort, 
  onFiltersChange, 
  onSortChange, 
  categories 
}: ProductFiltersProps) {
  const [showFilters, setShowFilters] = useState(false);

  const handleFilterChange = (key: keyof ProductFiltersType, value: string | number | boolean | undefined) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  return (
    <div className="space-y-4">
      {/* Search and Quick Actions */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex-1 max-w-lg">
          <Input
            type="search"
            placeholder="Search products..."
            value={filters.search || ''}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className="w-full"
          />
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => setShowFilters(!showFilters)}
          >
            Filter {showFilters ? '▲' : '▼'}
          </Button>
          <Select
            value={`${sort.field}-${sort.direction}`}
            onValueChange={(value) => {
              const [field, direction] = value.split('-');
              onSortChange({ 
                field: field as ProductSort['field'], 
                direction: direction as 'asc' | 'desc' 
              });
            }}
            placeholder="Sort by..."
          >
            <SelectItem value="title-asc">Title A-Z</SelectItem>
            <SelectItem value="title-desc">Title Z-A</SelectItem>
            <SelectItem value="price-asc">Price Low to High</SelectItem>
            <SelectItem value="price-desc">Price High to Low</SelectItem>
            <SelectItem value="createdAt-desc">Newest First</SelectItem>
            <SelectItem value="createdAt-asc">Oldest First</SelectItem>
          </Select>
        </div>
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <div className="border rounded-lg p-4 space-y-4 bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Category Filter */}
            <div>
              <label className="text-sm font-medium mb-2 block">Category</label>
              <Select
                value={filters.category || ''}
                onValueChange={(value) => handleFilterChange('category', value || undefined)}
                placeholder="All categories"
              >
                <SelectItem value="">All categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </Select>
            </div>

            {/* Price Range */}
            <div>
              <label className="text-sm font-medium mb-2 block">Min Price</label>
              <Input
                type="number"
                placeholder="$0"
                value={filters.minPrice || ''}
                onChange={(e) => handleFilterChange('minPrice', e.target.value ? Number(e.target.value) : undefined)}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Max Price</label>
              <Input
                type="number"
                placeholder="$1000"
                value={filters.maxPrice || ''}
                onChange={(e) => handleFilterChange('maxPrice', e.target.value ? Number(e.target.value) : undefined)}
              />
            </div>

            {/* Stock Filter */}
            <div className="flex items-center space-y-0">
              <Checkbox
                checked={filters.inStock || false}
                onCheckedChange={(checked) => handleFilterChange('inStock', checked || undefined)}
              >
                In stock only
              </Checkbox>
            </div>
          </div>

          {/* Clear Filters */}
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onFiltersChange({})}
            >
              Clear Filters
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}