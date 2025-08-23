'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useInfiniteProducts } from '@/hooks/useProducts';
import { ProductGrid } from './ProductGrid';
import { ProductSearch } from './ProductSearch';
import { ProductFilters } from './ProductFilters';
import { ProductSort } from './ProductSort';
// LoadingSpinner import removed as it's unused
import { ProductQuery, ProductFilters as ProductFiltersType, ProductSort as ProductSortType } from '@/types/product';

interface ProductListProps {
  initialQuery?: ProductQuery;
  showSearch?: boolean;
  showFilters?: boolean;
  showSort?: boolean;
  limit?: number;
  className?: string;
}

export function ProductList({
  initialQuery = {},
  showSearch = true,
  showFilters = true,
  showSort = true,
  limit = 20,
  className = "",
}: ProductListProps) {
  const searchParams = useSearchParams();
  
  const [query, setQuery] = useState<Omit<ProductQuery, 'page'>>({
    ...initialQuery,
    search: searchParams.get('search') || initialQuery.search || '',
    categoryId: searchParams.get('categoryId') || initialQuery.categoryId || '',
    brand: searchParams.get('brand') || initialQuery.brand || '',
    condition: searchParams.get('condition') || initialQuery.condition || '',
    minPrice: searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : initialQuery.minPrice,
    maxPrice: searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : initialQuery.maxPrice,
    inStock: searchParams.get('inStock') === 'true' || initialQuery.inStock || false,
    tags: searchParams.getAll('tags') || initialQuery.tags || [],
    sortBy: (searchParams.get('sortBy') as ProductSortType['sortBy']) || initialQuery.sortBy || 'relevance',
    sortOrder: (searchParams.get('sortOrder') as ProductSortType['sortOrder']) || initialQuery.sortOrder || 'desc',
    limit,
  });

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
  } = useInfiniteProducts(query);

  useEffect(() => {
    const newQuery = {
      ...query,
      search: searchParams.get('search') || '',
      categoryId: searchParams.get('categoryId') || '',
      brand: searchParams.get('brand') || '',
      condition: searchParams.get('condition') || '',
      minPrice: searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : undefined,
      maxPrice: searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : undefined,
      inStock: searchParams.get('inStock') === 'true',
      tags: searchParams.getAll('tags'),
      sortBy: (searchParams.get('sortBy') as ProductSortType['sortBy']) || 'relevance',
      sortOrder: (searchParams.get('sortOrder') as ProductSortType['sortOrder']) || 'desc',
    };
    setQuery(newQuery);
  }, [searchParams, query]);

  const handleSearch = (searchQuery: string) => {
    setQuery(prev => ({ ...prev, search: searchQuery }));
  };

  const handleFiltersChange = (filters: ProductFiltersType) => {
    setQuery(prev => ({ ...prev, ...filters }));
  };

  const handleSortChange = (sort: ProductSortType) => {
    setQuery(prev => ({ ...prev, ...sort }));
  };

  const products = data?.pages.flatMap(page => page.data) || [];
  const totalCount = data?.pages[0]?.pagination.total || 0;

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 mb-4">
          <svg
            className="mx-auto h-12 w-12"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-secondary-900 mb-1">
          Error loading products
        </h3>
        <p className="text-secondary-500">
          {error instanceof Error ? error.message : 'Something went wrong. Please try again.'}
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {showSearch && (
        <ProductSearch onSearch={handleSearch} />
      )}

      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-4">
          {showFilters && (
            <ProductFilters onFiltersChange={handleFiltersChange} />
          )}
          
          {!isLoading && totalCount > 0 && (
            <div className="text-sm text-secondary-600">
              {totalCount.toLocaleString()} {totalCount === 1 ? 'product' : 'products'}
            </div>
          )}
        </div>

        {showSort && <ProductSort onSortChange={handleSortChange} />}
      </div>

      <ProductGrid
        products={products}
        isLoading={isLoading}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        onLoadMore={fetchNextPage}
      />
    </div>
  );
}