import Link from 'next/link';
import { ProductForm } from '@/components/products/ProductForm';

export default function NewProductPage() {
  return (
    <div className="bg-white">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="border-b border-secondary-200 pb-6 mb-8">
          <nav className="mb-4">
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
                <span className="font-medium text-secondary-900">New Product</span>
              </li>
            </ol>
          </nav>
          <h1 className="text-3xl font-bold tracking-tight text-secondary-900">
            Add New Product
          </h1>
          <p className="mt-2 text-secondary-600">
            Create a new product listing with detailed information and pricing.
          </p>
        </div>

        <ProductForm />
      </div>
    </div>
  );
}