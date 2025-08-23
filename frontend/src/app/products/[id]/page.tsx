import Link from 'next/link';
import { Button, Card } from '@/components/ui';

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
              <span className="font-medium text-secondary-900">Product {id}</span>
            </li>
          </ol>
        </nav>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Product Image */}
          <div className="aspect-h-1 aspect-w-1 w-full overflow-hidden rounded-lg bg-secondary-200">
            <div className="flex h-96 items-center justify-center bg-secondary-100">
              <span className="text-secondary-500 text-lg">Product Image</span>
            </div>
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-secondary-900">
                Sample Product {id}
              </h1>
              <p className="mt-2 text-lg text-secondary-600">
                SKU: PROD-{id}
              </p>
            </div>

            {/* Price and Margin Info */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-secondary-900 mb-4">
                Profit Analysis
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-secondary-600">Selling Price</p>
                  <p className="text-2xl font-bold text-secondary-900">$99.99</p>
                </div>
                <div>
                  <p className="text-sm text-secondary-600">Cost Price</p>
                  <p className="text-xl font-semibold text-secondary-900">$49.99</p>
                </div>
                <div>
                  <p className="text-sm text-secondary-600">Profit Margin</p>
                  <p className="text-xl font-bold text-green-600">50%</p>
                </div>
                <div>
                  <p className="text-sm text-secondary-600">ROI</p>
                  <p className="text-xl font-bold text-green-600">100%</p>
                </div>
              </div>
            </Card>

            {/* Sales Performance */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-secondary-900 mb-4">
                Sales Performance
              </h2>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-secondary-900">150</p>
                  <p className="text-sm text-secondary-600">Monthly Sales</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-secondary-900">4.5</p>
                  <p className="text-sm text-secondary-600">Rating</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-secondary-900">89%</p>
                  <p className="text-sm text-secondary-600">Satisfaction</p>
                </div>
              </div>
            </Card>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <Button className="flex-1">
                Add to Cart
              </Button>
              <Button variant="outline">
                Save to Wishlist
              </Button>
              <Button variant="outline">
                Share
              </Button>
            </div>
          </div>
        </div>

        {/* Product Description */}
        <div className="mt-12">
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-secondary-900 mb-4">
              Product Description
            </h2>
            <div className="prose max-w-none text-secondary-600">
              <p>
                This is a detailed description of the product. It provides comprehensive
                information about the features, benefits, and specifications of the item.
                The description helps customers make informed purchasing decisions.
              </p>
              <p>
                Key features include high quality materials, excellent craftsmanship,
                and competitive pricing. This product is ideal for businesses looking
                to expand their inventory with reliable, profitable items.
              </p>
            </div>
          </Card>
        </div>

        {/* Related Products */}
        <div className="mt-12">
          <h2 className="text-xl font-semibold text-secondary-900 mb-6">
            Related Products
          </h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((relatedId) => (
              <Card key={relatedId} className="group cursor-pointer overflow-hidden transition-shadow hover:shadow-lg">
                <div className="aspect-h-1 aspect-w-1 w-full overflow-hidden bg-secondary-200">
                  <div className="flex h-32 items-center justify-center bg-secondary-100">
                    <span className="text-secondary-500 text-sm">Product {relatedId}</span>
                  </div>
                </div>
                <div className="p-3">
                  <h3 className="text-sm font-medium text-secondary-900">
                    Related Product {relatedId}
                  </h3>
                  <p className="mt-1 text-sm text-secondary-600">$79.99</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}