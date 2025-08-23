'use client';

import { format } from 'date-fns';
import Image from 'next/image';
import Link from 'next/link';
import { 
  TruckIcon, 
  ClockIcon, 
  CheckCircleIcon, 
  XCircleIcon,
  CreditCardIcon,
  ExclamationTriangleIcon,
  ArrowLeftIcon,
  MapPinIcon,
  PhoneIcon,
  EnvelopeIcon
} from '@heroicons/react/24/outline';
import { Card, Badge, Button, LoadingSpinner } from '@/components/ui';
import { useOrder, useCancelOrder, useTrackOrder } from '@/hooks/useOrder';
import { Order } from '@/types/order';

interface OrderDetailsProps {
  orderId: string;
  className?: string;
}

export function OrderDetails({ orderId, className = '' }: OrderDetailsProps) {
  const { data: order, isLoading, error } = useOrder(orderId);
  const cancelOrderMutation = useCancelOrder();
  const trackOrderMutation = useTrackOrder();

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: currency,
    }).format(price);
  };

  const getStatusIcon = (status: Order['status']) => {
    switch (status) {
      case 'pending':
        return <ClockIcon className="h-5 w-5 text-yellow-600" />;
      case 'confirmed':
        return <CheckCircleIcon className="h-5 w-5 text-blue-600" />;
      case 'processing':
        return <TruckIcon className="h-5 w-5 text-blue-600" />;
      case 'shipped':
        return <TruckIcon className="h-5 w-5 text-green-600" />;
      case 'delivered':
        return <CheckCircleIcon className="h-5 w-5 text-green-600" />;
      case 'cancelled':
        return <XCircleIcon className="h-5 w-5 text-red-600" />;
      default:
        return <ClockIcon className="h-5 w-5 text-secondary-600" />;
    }
  };

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'shipped':
        return 'bg-green-100 text-green-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-secondary-100 text-secondary-800';
    }
  };

  const getPaymentStatusColor = (status: Order['paymentStatus']) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'refunded':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-secondary-100 text-secondary-800';
    }
  };

  const handleCancelOrder = async () => {
    if (!order || !window.confirm('Are you sure you want to cancel this order?')) return;
    
    try {
      await cancelOrderMutation.mutateAsync(order.id);
    } catch (error) {
      console.error('Failed to cancel order:', error);
    }
  };

  const handleTrackOrder = async () => {
    if (!order?.trackingNumber) return;
    
    try {
      const trackingData = await trackOrderMutation.mutateAsync(order.trackingNumber);
      // Handle tracking data display
      console.log('Tracking data:', trackingData);
    } catch (error) {
      console.error('Failed to track order:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <Card className="p-8 text-center">
        <div className="text-red-500 mb-4">
          <XCircleIcon className="h-12 w-12 mx-auto" />
        </div>
        <h3 className="text-lg font-medium text-secondary-900 mb-2">
          Order not found
        </h3>
        <p className="text-secondary-500 mb-4">
          The order you're looking for doesn't exist or you don't have permission to view it.
        </p>
        <Link href="/orders">
          <Button>
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back to Orders
          </Button>
        </Link>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/orders">
            <Button variant="ghost" size="sm">
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              Back to Orders
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-secondary-900">
              Order #{order.orderNumber}
            </h1>
            <p className="text-secondary-600 mt-1">
              Placed on {format(new Date(order.createdAt), 'MMMM dd, yyyy at h:mm a')}
            </p>
          </div>
        </div>

        <div className="text-right">
          <div className="text-2xl font-bold text-secondary-900 mb-2">
            {formatPrice(order.total, order.currency)}
          </div>
          <div className="flex items-center gap-2">
            {getStatusIcon(order.status)}
            <Badge className={getStatusColor(order.status)}>
              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
            </Badge>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Items */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-secondary-900 mb-4">
              Order Items ({order.items.length} {order.items.length === 1 ? 'item' : 'items'})
            </h3>
            
            <div className="space-y-4">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-start gap-4 p-4 bg-secondary-50 rounded-lg">
                  <div className="flex-shrink-0">
                    <Link href={`/products/${item.product.id}`}>
                      <div className="relative w-16 h-16 rounded-md overflow-hidden bg-white">
                        {item.product.primaryImageUrl ? (
                          <Image
                            src={item.product.primaryImageUrl}
                            alt={item.product.name}
                            fill
                            className="object-cover"
                            sizes="64px"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-secondary-400">
                            <span className="text-xs">No image</span>
                          </div>
                        )}
                      </div>
                    </Link>
                  </div>

                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/products/${item.product.id}`}
                      className="text-sm font-medium text-secondary-900 hover:text-primary-600 block"
                    >
                      {item.product.name}
                    </Link>
                    
                    <div className="flex items-center gap-2 mt-1 text-xs text-secondary-500">
                      {item.product.brand && (
                        <span>{item.product.brand}</span>
                      )}
                      <span>SKU: {item.product.sku}</span>
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      <span className="text-sm text-secondary-600">
                        Qty: {item.quantity}
                      </span>
                      <div className="text-right">
                        <div className="text-sm font-medium text-secondary-900">
                          {formatPrice(item.price * item.quantity, item.currency)}
                        </div>
                        <div className="text-xs text-secondary-500">
                          {formatPrice(item.price, item.currency)} each
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Shipping Address */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-secondary-900 mb-4 flex items-center">
              <MapPinIcon className="h-5 w-5 mr-2" />
              Shipping Address
            </h3>
            
            <div className="space-y-2">
              <div className="font-medium text-secondary-900">
                {order.shippingAddress.name}
              </div>
              <div className="text-secondary-600">
                {order.shippingAddress.street}
                {order.shippingAddress.street2 && (
                  <><br />{order.shippingAddress.street2}</>
                )}
              </div>
              <div className="text-secondary-600">
                {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}
              </div>
              <div className="text-secondary-600">
                {order.shippingAddress.country}
              </div>
              {order.shippingAddress.phone && (
                <div className="flex items-center text-secondary-600 mt-3">
                  <PhoneIcon className="h-4 w-4 mr-2" />
                  {order.shippingAddress.phone}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Payment Information */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-secondary-900 mb-4 flex items-center">
              <CreditCardIcon className="h-5 w-5 mr-2" />
              Payment
            </h3>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-secondary-600">Status</span>
                <Badge className={getPaymentStatusColor(order.paymentStatus)}>
                  {order.paymentStatus === 'paid' ? 'Paid' : 
                   order.paymentStatus === 'pending' ? 'Pending' :
                   order.paymentStatus === 'failed' ? 'Failed' : 'Refunded'}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-secondary-600">Method</span>
                <span className="text-sm font-medium text-secondary-900">
                  {order.paymentMethod.type}
                </span>
              </div>

              {order.paymentDate && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-secondary-600">Paid on</span>
                  <span className="text-sm font-medium text-secondary-900">
                    {format(new Date(order.paymentDate), 'MMM dd, yyyy')}
                  </span>
                </div>
              )}
            </div>
          </Card>

          {/* Order Summary */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-secondary-900 mb-4">
              Order Summary
            </h3>
            
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-secondary-600">Subtotal</span>
                <span className="font-medium text-secondary-900">
                  {formatPrice(order.subtotal, order.currency)}
                </span>
              </div>

              {order.shipping > 0 ? (
                <div className="flex justify-between text-sm">
                  <span className="text-secondary-600">Shipping</span>
                  <span className="font-medium text-secondary-900">
                    {formatPrice(order.shipping, order.currency)}
                  </span>
                </div>
              ) : (
                <div className="flex justify-between text-sm">
                  <span className="text-secondary-600">Shipping</span>
                  <span className="font-medium text-green-600">Free</span>
                </div>
              )}

              {order.tax > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-secondary-600">Tax</span>
                  <span className="font-medium text-secondary-900">
                    {formatPrice(order.tax, order.currency)}
                  </span>
                </div>
              )}

              <div className="border-t border-secondary-200 pt-3">
                <div className="flex justify-between text-lg font-semibold">
                  <span className="text-secondary-900">Total</span>
                  <span className="text-secondary-900">
                    {formatPrice(order.total, order.currency)}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* Shipping Information */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-secondary-900 mb-4 flex items-center">
              <TruckIcon className="h-5 w-5 mr-2" />
              Shipping
            </h3>
            
            <div className="space-y-3">
              {order.trackingNumber && (
                <div>
                  <span className="text-sm text-secondary-600 block mb-1">Tracking Number</span>
                  <span className="text-sm font-mono font-medium text-secondary-900">
                    {order.trackingNumber}
                  </span>
                </div>
              )}
              
              {order.estimatedDelivery && (
                <div>
                  <span className="text-sm text-secondary-600 block mb-1">Estimated Delivery</span>
                  <span className="text-sm font-medium text-secondary-900">
                    {format(new Date(order.estimatedDelivery), 'MMMM dd, yyyy')}
                  </span>
                </div>
              )}
            </div>
          </Card>

          {/* Actions */}
          <Card className="p-6">
            <div className="space-y-3">
              {order.status === 'pending' && (
                <Button
                  variant="outline"
                  onClick={handleCancelOrder}
                  disabled={cancelOrderMutation.isPending}
                  className="w-full text-red-600 border-red-200 hover:bg-red-50"
                >
                  <ExclamationTriangleIcon className="h-4 w-4 mr-2" />
                  Cancel Order
                </Button>
              )}
              
              {order.trackingNumber && (
                <Button
                  variant="outline"
                  onClick={handleTrackOrder}
                  disabled={trackOrderMutation.isPending}
                  className="w-full"
                >
                  <TruckIcon className="h-4 w-4 mr-2" />
                  Track Package
                </Button>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}