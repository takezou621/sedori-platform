import Link from 'next/link';
import { Suspense } from 'react';
import { LoadingSpinner } from '@/components/ui';
import { ProductDetailClient } from './components/ProductDetailClient';

interface ProductDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { id } = await params;

  return (
    <div className="bg-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="mb-8">
          <ol className="flex items-center space-x-2 text-sm">
            <li>
              <Link href="/products" className="text-secondary-600 hover:text-secondary-900">
                Products
              </Link>
            </li>
            <li>
              <span className="text-secondary-400">/</span>
            </li>
            <li>
              <span className="font-medium text-secondary-900">Product Details</span>
            </li>
          </ol>
        </nav>

        <Suspense fallback={<LoadingSpinner size="lg" />}>
          <ProductDetailClient productId={id} />
        </Suspense>
      </div>
    </div>
  );
}