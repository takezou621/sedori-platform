'use client';

import { useProduct } from '@/hooks/useProducts';
import { ProductDetail } from '@/components/products/ProductDetail';
import { LoadingSpinner } from '@/components/ui';
import { notFound } from 'next/navigation';

interface ProductDetailClientProps {
  productId: string;
}

export function ProductDetailClient({ productId }: ProductDetailClientProps) {
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

  const handleAddToCart = (productId: string, quantity: number) => {
    // TODO: Implement cart functionality
    console.log('Adding to cart:', productId, quantity);
  };

  const handleToggleWishlist = (productId: string) => {
    // TODO: Implement wishlist functionality
    console.log('Toggle wishlist:', productId);
  };

  return (
    <ProductDetail
      product={product}
      onAddToCart={handleAddToCart}
      onToggleWishlist={handleToggleWishlist}
      isInWishlist={false} // TODO: Get from wishlist state
    />
  );
}