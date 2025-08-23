'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Select } from '@/components/ui';
import { ProductSort as ProductSortType } from '@/types/product';

interface ProductSortProps {
  sort?: ProductSortType;
  onSortChange?: (sort: ProductSortType) => void;
  className?: string;
}

export function ProductSort({ sort, onSortChange, className = "" }: ProductSortProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const currentSort = sort || {
    sortBy: (searchParams.get('sortBy') as ProductSortType['sortBy']) || 'relevance',
    sortOrder: (searchParams.get('sortOrder') as ProductSortType['sortOrder']) || 'desc',
  };

  const handleSortChange = (value: string) => {
    if (!value) return;
    const [sortBy, sortOrder] = value.split('-') as [ProductSortType['sortBy'], ProductSortType['sortOrder']];
    if (!sortBy || !sortOrder) return;
    const newSort = { sortBy, sortOrder };
    
    if (onSortChange) {
      onSortChange(newSort);
      return;
    }

    const params = new URLSearchParams(searchParams.toString());
    params.set('sortBy', sortBy);
    params.set('sortOrder', sortOrder);
    params.delete('page');
    
    const newUrl = params.toString() ? `?${params.toString()}` : '';
    router.push(`/products${newUrl}`, { scroll: false });
  };

  const sortOptions = [
    { value: 'relevance-desc', label: 'Most Relevant' },
    { value: 'newest-desc', label: 'Newest First' },
    { value: 'popular-desc', label: 'Most Popular' },
    { value: 'rating-desc', label: 'Highest Rated' },
    { value: 'price-asc', label: 'Price: Low to High' },
    { value: 'price-desc', label: 'Price: High to Low' },
    { value: 'name-asc', label: 'Name: A to Z' },
    { value: 'name-desc', label: 'Name: Z to A' },
  ];

  const currentValue = `${currentSort.sortBy}-${currentSort.sortOrder}`;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="text-sm text-secondary-600 whitespace-nowrap">Sort by:</span>
      <Select
        value={currentValue}
        onValueChange={handleSortChange}
        className="min-w-[160px]"
      >
        {sortOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
    </div>
  );
}