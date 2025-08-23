'use client';

import { Product } from '@/types/product';
import { Card, Button, Badge } from '@/components/ui';
import Link from 'next/link';

interface ProductCardProps {
  product: Product;
  onAddToCart?: (productId: string) => void;
  showAddToCart?: boolean;
}

export function ProductCard({ product, onAddToCart, showAddToCart = true }: ProductCardProps) {
  const profit = product.price - product.cost;
  const margin = profit > 0 ? ((profit / product.price) * 100).toFixed(0) : 0;
  const roi = product.cost > 0 ? ((profit / product.cost) * 100).toFixed(0) : 0;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    onAddToCart?.(product.id);
  };

  return (
    <Card className="group cursor-pointer overflow-hidden transition-shadow hover:shadow-lg">
      <Link href={`/products/${product.id}`}>
        <div className="aspect-h-1 aspect-w-1 w-full overflow-hidden bg-secondary-200">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.title}
              className="h-48 w-full object-cover object-center group-hover:opacity-75"
            />
          ) : (
            <div className="flex h-48 items-center justify-center bg-secondary-100">
              <span className="text-secondary-500">No Image</span>
            </div>
          )}
        </div>
        <div className="p-4">
          <div className="flex items-start justify-between">
            <h3 className="text-sm font-medium text-secondary-900 line-clamp-2">
              {product.title}
            </h3>
            {product.stock > 0 ? (
              <Badge variant="success" size="sm">In Stock</Badge>
            ) : (
              <Badge variant="destructive" size="sm">Out of Stock</Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-secondary-600 line-clamp-2">
            {product.description}
          </p>
          <Badge variant="outline" size="sm" className="mt-2">
            {product.category}
          </Badge>
          <div className="mt-3 flex items-center justify-between">
            <div>
              <p className="text-lg font-semibold text-secondary-900">
                ${product.price.toFixed(2)}
              </p>
              <p className="text-sm text-secondary-600">Cost: ${product.cost.toFixed(2)}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-green-600">
                {margin}% margin
              </p>
              <p className="text-xs text-secondary-600">ROI: {roi}%</p>
            </div>
          </div>
          <div className="mt-3 space-y-2">
            {showAddToCart && (
              <Button 
                size="sm" 
                className="w-full" 
                onClick={handleAddToCart}
                disabled={product.stock === 0}
              >
                {product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
              </Button>
            )}
            <Button size="sm" variant="outline" className="w-full">
              View Details
            </Button>
          </div>
        </div>
      </Link>
    </Card>
  );
}