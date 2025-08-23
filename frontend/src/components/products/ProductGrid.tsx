'use client';

import { useEffect, useRef } from 'react';
import { ProductCard } from './ProductCard';
import { Button } from '@/components/ui';
import { Product } from '@/types/product';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

interface ProductGridProps {
  products: Product[];
  isLoading?: boolean;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  onLoadMore?: () => void;
  className?: string;
}

export function ProductGrid({
  products,
  isLoading = false,
  hasNextPage = false,
  isFetchingNextPage = false,
  onLoadMore,
  className = "",
}: ProductGridProps) {
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hasNextPage || !onLoadMore || isFetchingNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onLoadMore();
        }
      },
      {
        threshold: 0.1,
        rootMargin: '100px',
      }
    );

    const currentRef = loadMoreRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [hasNextPage, onLoadMore, isFetchingNextPage]);

  if (isLoading && products.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!isLoading && products.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-secondary-500 mb-4">
          <svg
            className="mx-auto h-12 w-12"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-secondary-900 mb-1">No products found</h3>
        <p className="text-secondary-500">
          Try adjusting your search or filter criteria.
        </p>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
        {products.map((product, index) => (
          <ProductCard
            key={product.id}
            product={product}
            priority={index < 8}
          />
        ))}
      </div>

      {hasNextPage && (
        <div ref={loadMoreRef} className="mt-8 flex justify-center">
          {isFetchingNextPage ? (
            <LoadingSpinner />
          ) : (
            <Button
              variant="outline"
              onClick={onLoadMore}
              className="px-6"
            >
              Load More Products
            </Button>
          )}
        </div>
      )}
    </div>
  );
}