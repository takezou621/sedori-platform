import { Button, Input, Card } from '@/components/ui';

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
              <Button>Add Product</Button>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="mt-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex-1 max-w-lg">
              <Input
                type="search"
                placeholder="Search products..."
                className="w-full"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline">Filter</Button>
              <Button variant="outline">Sort</Button>
            </div>
          </div>
        </div>

        {/* Products Grid */}
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {/* Sample Product Cards */}
          {[1, 2, 3, 4, 5, 6, 7, 8].map((id) => (
            <Card key={id} className="group cursor-pointer overflow-hidden transition-shadow hover:shadow-lg">
              <div className="aspect-h-1 aspect-w-1 w-full overflow-hidden bg-secondary-200">
                <div className="flex h-48 items-center justify-center bg-secondary-100">
                  <span className="text-secondary-500">Product Image</span>
                </div>
              </div>
              <div className="p-4">
                <h3 className="text-sm font-medium text-secondary-900">
                  Sample Product {id}
                </h3>
                <p className="mt-1 text-sm text-secondary-600">
                  Brief product description goes here
                </p>
                <div className="mt-3 flex items-center justify-between">
                  <div>
                    <p className="text-lg font-semibold text-secondary-900">
                      $99.99
                    </p>
                    <p className="text-sm text-secondary-600">Cost: $49.99</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-green-600">
                      50% margin
                    </p>
                    <p className="text-xs text-secondary-600">ROI: 100%</p>
                  </div>
                </div>
                <div className="mt-3">
                  <Button size="sm" className="w-full">
                    View Details
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Pagination */}
        <div className="mt-8 flex items-center justify-center">
          <div className="flex gap-2">
            <Button variant="outline" disabled>
              Previous
            </Button>
            <Button variant="outline">1</Button>
            <Button>2</Button>
            <Button variant="outline">3</Button>
            <Button variant="outline">
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}