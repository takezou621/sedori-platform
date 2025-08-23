'use client';

import { useState } from 'react';
import { MagnifyingGlassIcon, FunnelIcon } from '@heroicons/react/24/outline';
import { LoadingSpinner, Card, Button, Badge } from '@/components/ui';
import { OrderCard } from './OrderCard';
import { useOrders } from '@/hooks/useOrder';
import { OrderQuery, Order } from '@/types/order';

interface OrderListProps {
  userId?: string;
  className?: string;
}

export function OrderList({ userId, className = '' }: OrderListProps) {
  const [query, setQuery] = useState<OrderQuery>({
    page: 1,
    limit: 10,
    sortBy: 'date',
    sortOrder: 'desc',
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const { data: orderData, isLoading, error } = useOrders(query);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setQuery(prev => ({
      ...prev,
      search: searchTerm,
      page: 1,
    }));
  };

  const handleStatusFilter = (status?: Order['status']) => {
    setQuery(prev => ({
      ...prev,
      status,
      page: 1,
    }));
  };

  const handlePaymentStatusFilter = (paymentStatus?: Order['paymentStatus']) => {
    setQuery(prev => ({
      ...prev,
      paymentStatus,
      page: 1,
    }));
  };

  const handlePageChange = (page: number) => {
    setQuery(prev => ({ ...prev, page }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-8 text-center">
        <div className="text-red-500 mb-4">
          <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-secondary-900 mb-2">
          Unable to load orders
        </h3>
        <p className="text-secondary-500 mb-4">
          Please check your connection and try again.
        </p>
        <Button onClick={() => window.location.reload()}>
          Try Again
        </Button>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-secondary-900">Orders</h2>
          {orderData && (
            <p className="text-secondary-600 mt-1">
              {orderData.pagination.total} {orderData.pagination.total === 1 ? 'order' : 'orders'} found
            </p>
          )}
        </div>
        
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2"
        >
          <FunnelIcon className="h-4 w-4" />
          Filters
        </Button>
      </div>

      {/* Search and Filters */}
      <Card className="p-4">
        <form onSubmit={handleSearch} className="mb-4">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-secondary-400" />
              <input
                type="text"
                placeholder="Search orders by number, customer, or products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <Button type="submit">
              Search
            </Button>
          </div>
        </form>

        {showFilters && (
          <div className="pt-4 border-t border-secondary-200 space-y-4">
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                Order Status
              </label>
              <div className="flex flex-wrap gap-2">
                <Badge
                  className={`cursor-pointer ${!query.status ? 'bg-primary-100 text-primary-800' : 'bg-secondary-100 text-secondary-800'}`}
                  onClick={() => handleStatusFilter(undefined)}
                >
                  All
                </Badge>
                {['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'].map((status) => (
                  <Badge
                    key={status}
                    className={`cursor-pointer ${query.status === status ? 'bg-primary-100 text-primary-800' : 'bg-secondary-100 text-secondary-800'}`}
                    onClick={() => handleStatusFilter(status as Order['status'])}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Payment Status Filter */}
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                Payment Status
              </label>
              <div className="flex flex-wrap gap-2">
                <Badge
                  className={`cursor-pointer ${!query.paymentStatus ? 'bg-primary-100 text-primary-800' : 'bg-secondary-100 text-secondary-800'}`}
                  onClick={() => handlePaymentStatusFilter(undefined)}
                >
                  All
                </Badge>
                {['pending', 'paid', 'failed', 'refunded'].map((status) => (
                  <Badge
                    key={status}
                    className={`cursor-pointer ${query.paymentStatus === status ? 'bg-primary-100 text-primary-800' : 'bg-secondary-100 text-secondary-800'}`}
                    onClick={() => handlePaymentStatusFilter(status as Order['paymentStatus'])}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Orders List */}
      {orderData && orderData.data.length > 0 ? (
        <div className="space-y-4">
          {orderData.data.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}

          {/* Pagination */}
          {orderData.pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <Button
                variant="outline"
                onClick={() => handlePageChange(query.page! - 1)}
                disabled={query.page! <= 1}
              >
                Previous
              </Button>
              
              <div className="flex items-center gap-2">
                {Array.from({ length: Math.min(5, orderData.pagination.totalPages) }, (_, i) => {
                  const pageNumber = i + 1;
                  const isCurrentPage = pageNumber === query.page;
                  
                  return (
                    <Button
                      key={pageNumber}
                      variant={isCurrentPage ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handlePageChange(pageNumber)}
                    >
                      {pageNumber}
                    </Button>
                  );
                })}
              </div>

              <Button
                variant="outline"
                onClick={() => handlePageChange(query.page! + 1)}
                disabled={query.page! >= orderData.pagination.totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      ) : (
        <Card className="p-8 text-center">
          <div className="text-secondary-300 mb-4">
            <svg className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-secondary-900 mb-2">
            No orders found
          </h3>
          <p className="text-secondary-500 mb-4">
            {query.search || query.status || query.paymentStatus
              ? 'Try adjusting your search criteria or filters.'
              : "You haven't placed any orders yet."}
          </p>
          {query.search || query.status || query.paymentStatus ? (
            <Button
              variant="outline"
              onClick={() => {
                setQuery({
                  page: 1,
                  limit: 10,
                  sortBy: 'date',
                  sortOrder: 'desc',
                });
                setSearchTerm('');
              }}
            >
              Clear Filters
            </Button>
          ) : (
            <Button onClick={() => window.location.href = '/products'}>
              Start Shopping
            </Button>
          )}
        </Card>
      )}
    </div>
  );
}