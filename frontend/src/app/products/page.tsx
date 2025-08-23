import Link from 'next/link';
import { Suspense } from 'react';
import { Button } from '@/components/ui';
import { ProductList } from '@/components/products';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export default function ProductsPage() {
  return (
    <div className="bg-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="border-b border-secondary-200 pb-8">
          <div className="sm:flex sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-secondary-900">
                Products
              </h1>
              <p className="mt-2 text-sm text-secondary-600">
                Search and discover products for your business
              </p>
            </div>
            <div className="mt-4 sm:ml-4 sm:mt-0">
              <Link href="/products/new">
                <Button>Add Product</Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Products List */}
        <div className="mt-8">
          <Suspense
            fallback={
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner size="lg" />
              </div>
            }
          >
            <ProductList />
          </Suspense>
        </div>
      </div>
    </div>
  );
}