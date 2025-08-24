'use client';

import { useState } from 'react';
import { Product } from '@/types/product';
import { Button, Badge, Card } from '@/components/ui';
import Image from 'next/image';

interface ProductDetailsProps {
  product: Product;
  onAddToCart: (productId: string, quantity: number) => void;
}

export function ProductDetails({ product, onAddToCart }: ProductDetailsProps) {
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);

  const profit = product.price - product.cost;
  const margin = profit > 0 ? ((profit / product.price) * 100).toFixed(0) : 0;
  const roi = product.cost > 0 ? ((profit / product.cost) * 100).toFixed(0) : 0;

  const handleAddToCart = async () => {
    setLoading(true);
    try {
      await onAddToCart(product.id, quantity);
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = (newQuantity: number) => {
    if (newQuantity >= 1 && newQuantity <= product.stock) {
      setQuantity(newQuantity);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Product Image */}
      <div className="aspect-square overflow-hidden rounded-lg border">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.title}
            width={400}
            height={400}
            className="h-full w-full object-cover object-center"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gray-100">
            <span className="text-gray-400">No Image Available</span>
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{product.title}</h1>
          <div className="mt-2 flex items-center space-x-2">
            <Badge variant="outline">{product.category}</Badge>
            {product.stock > 0 ? (
              <Badge variant="success">In Stock ({product.stock})</Badge>
            ) : (
              <Badge variant="destructive">Out of Stock</Badge>
            )}
          </div>
        </div>

        <div className="prose max-w-none">
          <p className="text-gray-700">{product.description}</p>
        </div>

        {/* Pricing */}
        <Card className="p-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-3xl font-bold text-gray-900">${product.price.toFixed(2)}</div>
              <div className="text-sm text-gray-600">Selling Price</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-gray-700">${product.cost.toFixed(2)}</div>
              <div className="text-sm text-gray-600">Cost Price</div>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-4">
            <div>
              <div className="text-lg font-semibold text-green-600">{margin}%</div>
              <div className="text-sm text-gray-600">Profit Margin</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-green-600">{roi}%</div>
              <div className="text-sm text-gray-600">ROI</div>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t">
            <div className="text-lg font-semibold text-green-600">
              ${profit.toFixed(2)} profit per unit
            </div>
          </div>
        </Card>

        {/* Add to Cart */}
        {product.stock > 0 && (
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium">Quantity:</span>
              <div className="flex items-center space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => updateQuantity(quantity - 1)}
                  disabled={quantity <= 1}
                >
                  -
                </Button>
                <span className="w-12 text-center">{quantity}</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => updateQuantity(quantity + 1)}
                  disabled={quantity >= product.stock}
                >
                  +
                </Button>
              </div>
            </div>

            <Button
              className="w-full"
              onClick={handleAddToCart}
              disabled={loading}
            >
              {loading ? 'Adding to Cart...' : `Add ${quantity} to Cart - $${(product.price * quantity).toFixed(2)}`}
            </Button>
          </div>
        )}

        {/* Product Meta */}
        <div className="text-sm text-gray-500 space-y-1">
          <div>Created: {new Date(product.createdAt).toLocaleDateString()}</div>
          <div>Updated: {new Date(product.updatedAt).toLocaleDateString()}</div>
        </div>
      </div>
    </div>
  );
}