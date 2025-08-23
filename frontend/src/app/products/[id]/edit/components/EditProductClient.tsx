'use client';

import { useRouter } from 'next/navigation';
import { useProduct } from '@/hooks/useProducts';
import { ProductForm } from '@/components/products/ProductForm';
import { LoadingSpinner } from '@/components/ui';
import { notFound } from 'next/navigation';

interface EditProductClientProps {
  productId: string;
}

export function EditProductClient({ productId }: EditProductClientProps) {
  const router = useRouter();
  const { data: product, isLoading, error } = useProduct(productId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !product) {
    notFound();
  }

  const handleSuccess = () => {
    router.push(`/products/${productId}`);
  };

  const handleCancel = () => {
    router.push(`/products/${productId}`);
  };

  return (
    <ProductForm
      product={product}
      onSuccess={handleSuccess}
      onCancel={handleCancel}
    />
  );
}