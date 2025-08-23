'use client';

import { useState } from 'react';
import { Button, Card } from '@/components/ui';
import { useProducts } from '@/hooks';
import { SearchBar } from '@/components/products/SearchBar';
import { ProductFilters, ProductSort } from '@/types/product';

export default function ProductsPage() {
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<ProductFilters>({});
  const [sort, setSort] = useState<ProductSort>({ field: 'title', direction: 'asc' });
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const { data, isLoading, error, isFetching } = useProducts({
    page,
    limit: 12,
    search,
    filters,
    sort,
  });

  const handleFilterChange = (newFilters: Partial<ProductFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setPage(1); // Reset to first page when filtering
  };

  const handleSortChange = (newSort: ProductSort) => {
    setSort(newSort);
    setPage(1); // Reset to first page when sorting
  };

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
                {data ? `${data.pagination.total} products available` : 'Search and discover products for your business'}
                {isFetching && <span className="ml-2 text-blue-600">Updating...</span>}
              </p>
            </div>
            <div className="mt-4 sm:ml-4 sm:mt-0 flex gap-2">
              <Button
                variant={viewMode === 'grid' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
                aria-label="Grid view"
              >
                Grid
              </Button>
              <Button
                variant={viewMode === 'list' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
                aria-label="List view"
              >
                List
              </Button>
              <Button>Add Product</Button>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="mt-8" role="search" aria-label="Product search and filters">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex-1 max-w-lg">
              <SearchBar
                value={search}
                onChange={setSearch}
                placeholder="Search products..."
                className="w-full"
              />
            </div>
            <div className="flex gap-2 items-center">
              <select
                value={filters.category || 'all'}
                onChange={(e) => handleFilterChange({ category: e.target.value === 'all' ? undefined : e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                aria-label="Filter by category"
              >
                <option value="all">All Categories</option>
                <option value="Electronics">Electronics</option>
                <option value="Books">Books</option>
                <option value="Clothing">Clothing</option>
                <option value="Home">Home</option>
              </select>
              
              <select
                value={`${sort.field}-${sort.direction}`}
                onChange={(e) => {
                  const [field, direction] = e.target.value.split('-') as [string, 'asc' | 'desc'];
                  handleSortChange({ field: field as 'title' | 'price' | 'createdAt', direction });
                }}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                aria-label="Sort products"
              >
                <option value="title-asc">Name A-Z</option>
                <option value="title-desc">Name Z-A</option>
                <option value="price-asc">Price Low-High</option>
                <option value="price-desc">Price High-Low</option>
                <option value="createdAt-desc">Newest First</option>
                <option value="createdAt-asc">Oldest First</option>
              </select>
            </div>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="mt-8" role="alert" data-type="error">
            <div className="rounded-md bg-red-50 p-4 error-indicator">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error loading products</h3>
                  <p className="mt-2 text-sm text-red-700">
                    Unable to load products. Please try again later.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }, (_, i) => (
              <Card key={i} className="overflow-hidden">
                <div className="h-48 bg-gray-200 animate-pulse"></div>
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-3 bg-gray-200 rounded animate-pulse w-3/4"></div>
                  <div className="flex justify-between items-center">
                    <div className="h-6 bg-gray-200 rounded animate-pulse w-16"></div>
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-12"></div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Products Grid */}
        {!isLoading && !error && data && (
          <section 
            className="mt-8" 
            aria-label="Product listings"
            aria-describedby="products-count"
          >
            <div id="products-count" className="sr-only">
              Showing {data.products.length} of {data.pagination.total} products
            </div>

            {data.products.length === 0 ? (
              <div className="text-center py-12">
                <div className="mx-auto max-w-md">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2 2v-5m16 0h-2M4 13h2m8-8V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v1m8 8l-2-2m0 0l-2-2m2 2l2-2m-2 2l2 2" />
                  </svg>
                  <h3 className="mt-4 text-lg font-medium text-gray-900">No products found</h3>
                  <p className="mt-2 text-sm text-gray-500">
                    {search ? `No products match your search for "${search}".` : 'No products available with the current filters.'}
                  </p>
                  {(search || Object.keys(filters).length > 0) && (
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={() => {
                        setSearch('');
                        setFilters({});
                      }}
                    >
                      Clear filters
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className={
                viewMode === 'grid' 
                  ? "grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                  : "space-y-4"
              }>
                {data.products.map((product) => {
                  const profit = product.price - product.cost;
                  const margin = profit > 0 ? Math.round((profit / product.price) * 100) : 0;
                  const roi = profit > 0 ? Math.round((profit / product.cost) * 100) : 0;

                  return (
                    <Card 
                      key={product.id} 
                      className={`group cursor-pointer overflow-hidden transition-shadow hover:shadow-lg ${
                        viewMode === 'list' ? 'flex' : ''
                      }`}
                      role="article"
                      aria-labelledby={`product-title-${product.id}`}
                      aria-describedby={`product-desc-${product.id} product-price-${product.id}`}
                    >
                      <div className={`bg-secondary-200 overflow-hidden ${
                        viewMode === 'list' 
                          ? 'w-32 h-32 flex-shrink-0' 
                          : 'aspect-h-1 aspect-w-1 w-full'
                      }`}>
                        <div 
                          className={`flex items-center justify-center bg-secondary-100 ${
                            viewMode === 'list' ? 'h-full' : 'h-48'
                          }`}
                          role="img"
                          aria-label={`${product.title} image`}
                        >
                          <span className="text-secondary-500 text-sm">Product Image</span>
                        </div>
                      </div>
                      <div className={`p-4 ${viewMode === 'list' ? 'flex-1' : ''}`}>
                        <h3 
                          id={`product-title-${product.id}`}
                          className="text-sm font-medium text-secondary-900 line-clamp-2"
                        >
                          {product.title}
                        </h3>
                        <p 
                          id={`product-desc-${product.id}`}
                          className="mt-1 text-sm text-secondary-600 line-clamp-2"
                        >
                          {product.description}
                        </p>
                        <div 
                          id={`product-price-${product.id}`}
                          className={`mt-3 ${
                            viewMode === 'list' 
                              ? 'flex items-center gap-4' 
                              : 'flex items-center justify-between'
                          }`}
                          aria-label="Pricing information"
                        >
                          <div>
                            <p className="text-lg font-semibold text-secondary-900">
                              <span className="sr-only">Selling price:</span>
                              ${product.price.toFixed(2)}
                            </p>
                            <p className="text-sm text-secondary-600">
                              <span className="sr-only">Cost price:</span>
                              Cost: ${product.cost.toFixed(2)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-green-600 success-indicator">
                              <span className="sr-only">Profit margin:</span>
                              {margin}% margin
                            </p>
                            <p className="text-xs text-secondary-600">
                              <span className="sr-only">Return on investment:</span>
                              ROI: {roi}%
                            </p>
                          </div>
                        </div>
                        <div className="mt-3">
                          <Button 
                            size="sm" 
                            className="w-full"
                            aria-label={`View details for ${product.title}`}
                          >
                            View Details
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* Pagination */}
        {!isLoading && !error && data && data.pagination.totalPages > 1 && (
          <nav 
            className="mt-8 flex items-center justify-center" 
            role="navigation" 
            aria-label="Product pagination"
          >
            <div className="flex gap-2" role="group" aria-label="Page navigation">
              <Button 
                variant="outline" 
                disabled={page === 1 || isFetching}
                aria-label="Go to previous page"
                aria-disabled={page === 1 || isFetching}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              
              {/* Page Numbers */}
              {Array.from({ length: Math.min(5, data.pagination.totalPages) }, (_, i) => {
                const pageNum = i + 1;
                const isCurrentPage = pageNum === page;
                
                return (
                  <Button 
                    key={pageNum}
                    variant={isCurrentPage ? 'primary' : 'outline'}
                    disabled={isFetching}
                    aria-label={isCurrentPage ? `Current page, page ${pageNum}` : `Go to page ${pageNum}`}
                    aria-current={isCurrentPage ? 'page' : 'false'}
                    onClick={() => setPage(pageNum)}
                  >
                    {pageNum}
                  </Button>
                );
              })}
              
              <Button 
                variant="outline"
                disabled={page >= data.pagination.totalPages || isFetching}
                aria-label="Go to next page"
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
            
            <div className="mt-4 text-sm text-gray-500 text-center">
              Page {page} of {data.pagination.totalPages} ({data.pagination.total} total products)
            </div>
          </nav>
        )}
      </div>
    </div>
  );
}