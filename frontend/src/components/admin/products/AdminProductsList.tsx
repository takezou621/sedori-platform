'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { 
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';
import { Card, Button, Badge, LoadingSpinner } from '@/components/ui';
import { AdminTable } from '../common/AdminTable';
import { AdminConfirmDialog } from '../common/AdminConfirmDialog';
import { useProducts, useDeleteProduct, useBulkUpdateProducts } from '@/hooks/useProducts';
import { useAdminPermissions } from '../auth/AdminProtectedRoute';
import { Product } from '@/types/product';
import { AdminProductFilters } from '@/types/admin';

export function AdminProductsList() {
  const { hasPermission } = useAdminPermissions();
  const deleteProductMutation = useDeleteProduct();
  const bulkUpdateMutation = useBulkUpdateProducts();

  const [filters, setFilters] = useState<AdminProductFilters>({
    page: 1,
    limit: 20,
    sortBy: 'newest',
    sortOrder: 'desc',
  });
  
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [deleteProductId, setDeleteProductId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const { data: productsData, isLoading } = useProducts(filters);

  const formatPrice = (price: number, currency: string = 'JPY') => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: currency,
    }).format(price);
  };

  const getStockStatus = (stock: number) => {
    if (stock === 0) return { label: 'Out of Stock', color: 'bg-red-100 text-red-800' };
    if (stock <= 10) return { label: 'Low Stock', color: 'bg-yellow-100 text-yellow-800' };
    return { label: 'In Stock', color: 'bg-green-100 text-green-800' };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      case 'inactive': return 'bg-red-100 text-red-800';
      default: return 'bg-secondary-100 text-secondary-800';
    }
  };

  const handleSort = (field: string) => {
    const validSortFields = ['name', 'price', 'newest', 'popular', 'rating'];
    const sortBy = validSortFields.includes(field) ? field as AdminProductFilters['sortBy'] : 'newest';
    setFilters(prev => ({
      ...prev,
      sortBy,
      sortOrder: prev.sortBy === sortBy && prev.sortOrder === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handleSearch = (search: string) => {
    setFilters(prev => ({ ...prev, search, page: 1 }));
  };

  const handleFilterChange = (key: keyof AdminProductFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  const handleBulkStatusUpdate = async (status: 'active' | 'inactive') => {
    if (selectedProducts.length === 0) return;

    try {
      await bulkUpdateMutation.mutateAsync(
        selectedProducts.map(id => ({
          id,
          data: { status }
        }))
      );
      setSelectedProducts([]);
    } catch (error) {
      console.error('Failed to update products:', error);
    }
  };

  const handleDeleteProduct = async () => {
    if (!deleteProductId) return;

    try {
      await deleteProductMutation.mutateAsync(deleteProductId);
      setDeleteProductId(null);
    } catch (error) {
      console.error('Failed to delete product:', error);
    }
  };

  const columns = [
    {
      key: 'image',
      title: '',
      render: (product: Product) => (
        <div className="w-12 h-12 rounded-lg overflow-hidden bg-secondary-100">
          {product.primaryImageUrl ? (
            <Image
              src={product.primaryImageUrl}
              alt={product.name}
              width={48}
              height={48}
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-secondary-400">
              <span className="text-xs">No image</span>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'name',
      title: 'Product',
      sortable: true,
      render: (product: Product) => (
        <div>
          <div className="font-medium text-secondary-900">{product.name}</div>
          <div className="text-sm text-secondary-500">SKU: {product.sku}</div>
          {product.brand && (
            <div className="text-xs text-secondary-500">{product.brand}</div>
          )}
        </div>
      ),
    },
    {
      key: 'category',
      title: 'Category',
      render: (product: Product) => (
        <span className="text-sm text-secondary-700">{product.category?.name || 'Uncategorized'}</span>
      ),
    },
    {
      key: 'price',
      title: 'Price',
      sortable: true,
      render: (product: Product) => (
        <div>
          <div className="font-medium text-secondary-900">
            {formatPrice(product.price, product.currency)}
          </div>
          {product.originalPrice && product.originalPrice > product.price && (
            <div className="text-sm text-secondary-500 line-through">
              {formatPrice(product.originalPrice, product.currency)}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'stock',
      title: 'Stock',
      sortable: true,
      render: (product: Product) => {
        const status = getStockStatus(product.stockQuantity || 0);
        return (
          <div>
            <div className="font-medium text-secondary-900">
              {product.stockQuantity || 0}
            </div>
            <Badge className={`text-xs ${status.color}`}>
              {status.label}
            </Badge>
          </div>
        );
      },
    },
    {
      key: 'status',
      title: 'Status',
      render: (product: Product) => (
        <Badge className={getStatusColor(product.status)}>
          {product.status.charAt(0).toUpperCase() + product.status.slice(1)}
        </Badge>
      ),
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (product: Product) => (
        <div className="flex items-center gap-2">
          <Link href={`/products/${product.id}`}>
            <Button variant="ghost" size="sm">
              <EyeIcon className="h-4 w-4" />
            </Button>
          </Link>
          
          {hasPermission('products:write') && (
            <Link href={`/admin/products/${product.id}/edit`}>
              <Button variant="ghost" size="sm">
                <PencilIcon className="h-4 w-4" />
              </Button>
            </Link>
          )}
          
          {hasPermission('products:delete') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDeleteProductId(product.id)}
              className="text-red-600 hover:text-red-700"
            >
              <TrashIcon className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">Products</h1>
          {productsData && (
            <p className="text-secondary-600 mt-1">
              {productsData.pagination.total} products found
            </p>
          )}
        </div>
        
        {hasPermission('products:write') && (
          <Link href="/admin/products/create">
            <Button>
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          </Link>
        )}
      </div>

      {/* Search and Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-secondary-400" />
            <input
              type="text"
              placeholder="Search products by name, SKU, or brand..."
              value={filters.search || ''}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {/* Filter Toggle */}
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <FunnelIcon className="h-4 w-4" />
            Filters
          </Button>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-secondary-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  Category
                </label>
                <select
                  value={filters.category || ''}
                  onChange={(e) => handleFilterChange('category', e.target.value || undefined)}
                  className="w-full border border-secondary-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">All Categories</option>
                  <option value="electronics">Electronics</option>
                  <option value="clothing">Clothing</option>
                  <option value="home">Home & Garden</option>
                  <option value="books">Books</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  Status
                </label>
                <select
                  value={filters.status || ''}
                  onChange={(e) => handleFilterChange('status', e.target.value || undefined)}
                  className="w-full border border-secondary-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">All Status</option>
                  <option value="active">Active</option>
                  <option value="draft">Draft</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  Stock Status
                </label>
                <select
                  value={filters.stockStatus || ''}
                  onChange={(e) => handleFilterChange('stockStatus', e.target.value || undefined)}
                  className="w-full border border-secondary-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">All Stock</option>
                  <option value="in_stock">In Stock</option>
                  <option value="low_stock">Low Stock</option>
                  <option value="out_of_stock">Out of Stock</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  Brand
                </label>
                <input
                  type="text"
                  placeholder="Filter by brand"
                  value={filters.brand || ''}
                  onChange={(e) => handleFilterChange('brand', e.target.value || undefined)}
                  className="w-full border border-secondary-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Bulk Actions */}
      {selectedProducts.length > 0 && hasPermission('products:write') && (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-secondary-600">
              {selectedProducts.length} product{selectedProducts.length === 1 ? '' : 's'} selected
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkStatusUpdate('active')}
                disabled={bulkUpdateMutation.isPending}
              >
                Activate
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkStatusUpdate('inactive')}
                disabled={bulkUpdateMutation.isPending}
              >
                Deactivate
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedProducts([])}
              >
                Clear Selection
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Products Table */}
      {productsData && productsData.data ? (
        <AdminTable
          data={productsData.data as unknown as Record<string, unknown>[]}
          columns={columns as any}
          selectedItems={selectedProducts}
          onSelectionChange={setSelectedProducts}
          onSort={handleSort}
          currentSort={{
            field: filters.sortBy || 'createdAt',
            direction: filters.sortOrder || 'desc',
          }}
        />
      ) : (
        <Card className="p-8 text-center">
          <div className="text-secondary-300 mb-4">
            <svg className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-secondary-900 mb-2">
            No products found
          </h3>
          <p className="text-secondary-500 mb-4">
            {filters.search || filters.category || filters.status || filters.stockStatus
              ? 'Try adjusting your search criteria or filters.'
              : "You haven't added any products yet."}
          </p>
          {hasPermission('products:write') && (
            <Link href="/admin/products/create">
              <Button>
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Your First Product
              </Button>
            </Link>
          )}
        </Card>
      )}

      {/* Pagination */}
      {productsData && productsData.pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => setFilters(prev => ({ ...prev, page: (prev.page || 1) - 1 }))}
            disabled={(filters.page || 1) <= 1}
          >
            Previous
          </Button>
          
          <div className="flex items-center gap-2">
            {Array.from({ length: Math.min(5, productsData.pagination.totalPages) }, (_, i) => {
              const pageNumber = i + 1;
              const isCurrentPage = pageNumber === filters.page;
              
              return (
                <Button
                  key={pageNumber}
                  variant={isCurrentPage ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilters(prev => ({ ...prev, page: pageNumber }))}
                >
                  {pageNumber}
                </Button>
              );
            })}
          </div>

          <Button
            variant="outline"
            onClick={() => setFilters(prev => ({ ...prev, page: (prev.page || 1) + 1 }))}
            disabled={(filters.page || 1) >= productsData.pagination.totalPages}
          >
            Next
          </Button>
        </div>
      )}

      {/* Delete Confirmation */}
      <AdminConfirmDialog
        open={!!deleteProductId}
        onClose={() => setDeleteProductId(null)}
        onConfirm={handleDeleteProduct}
        title="Delete Product"
        description="Are you sure you want to delete this product? This action cannot be undone and will remove all associated data."
        confirmText="Delete"
        isLoading={deleteProductMutation.isPending}
      />
    </div>
  );
}