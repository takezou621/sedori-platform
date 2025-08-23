'use client';

import Link from 'next/link';
import Image from 'next/image';
import { format } from 'date-fns';
import { 
  TruckIcon, 
  ClockIcon, 
  CheckCircleIcon, 
  XCircleIcon,
  CreditCardIcon,
  ExclamationTriangleIcon 
} from '@heroicons/react/24/outline';
import { Card, Badge, Button } from '@/components/ui';
import { Order } from '@/types/order';

interface OrderCardProps {
  order: Order;
  className?: string;
}

export function OrderCard({ order, className = '' }: OrderCardProps) {
  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: currency,
    }).format(price);
  };

  const getStatusIcon = (status: Order['status']) => {
    switch (status) {
      case 'pending':
        return <ClockIcon className="h-4 w-4 text-yellow-600" />;
      case 'confirmed':
        return <CheckCircleIcon className="h-4 w-4 text-blue-600" />;
      case 'processing':
        return <TruckIcon className="h-4 w-4 text-blue-600" />;
      case 'shipped':
        return <TruckIcon className="h-4 w-4 text-green-600" />;
      case 'delivered':
        return <CheckCircleIcon className="h-4 w-4 text-green-600" />;
      case 'cancelled':
        return <XCircleIcon className="h-4 w-4 text-red-600" />;
      default:
        return <ClockIcon className="h-4 w-4 text-secondary-600" />;
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

  return (
    <Card className={`p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-semibold text-secondary-900">
              Order #{order.orderNumber}
            </h3>
            <div className="flex items-center gap-1">
              {getStatusIcon(order.status)}
              <Badge className={getStatusColor(order.status)}>
                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
              </Badge>
            </div>
          </div>
          <p className="text-sm text-secondary-600">
            Placed on {format(new Date(order.createdAt), 'MMM dd, yyyy')}
          </p>
        </div>
        
        <div className="text-right">
          <div className="text-lg font-bold text-secondary-900">
            {formatPrice(order.total, order.currency)}
          </div>
          <div className="flex items-center gap-1 mt-1">
            <CreditCardIcon className="h-4 w-4" />
            <Badge className={getPaymentStatusColor(order.paymentStatus)}>
              {order.paymentStatus === 'paid' ? 'Paid' : 
               order.paymentStatus === 'pending' ? 'Pending' :
               order.paymentStatus === 'failed' ? 'Failed' : 'Refunded'}
            </Badge>
          </div>
        </div>
      </div>

      {/* Items Preview */}
      <div className="mb-4">
        <div className="flex items-center gap-3">
          <div className="flex -space-x-2">
            {order.items.slice(0, 3).map((item, index) => (
              <div key={item.id} className="relative w-10 h-10 rounded-full border-2 border-white overflow-hidden bg-secondary-100">
                {item.product.primaryImageUrl ? (
                  <Image
                    src={item.product.primaryImageUrl}
                    alt={item.product.name}
                    fill
                    className="object-cover"
                    sizes="40px"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-secondary-400">
                    ?
                  </div>
                )}
              </div>
            ))}
            {order.items.length > 3 && (
              <div className="relative w-10 h-10 rounded-full border-2 border-white bg-secondary-100 flex items-center justify-center">
                <span className="text-xs font-medium text-secondary-600">
                  +{order.items.length - 3}
                </span>
              </div>
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-secondary-900">
              {order.items.length} {order.items.length === 1 ? 'item' : 'items'}
            </p>
            <p className="text-xs text-secondary-600">
              {order.items.slice(0, 2).map(item => item.product.name).join(', ')}
              {order.items.length > 2 && '...'}
            </p>
          </div>
        </div>
      </div>

      {/* Shipping Info */}
      <div className="mb-4 p-3 bg-secondary-50 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TruckIcon className="h-4 w-4 text-secondary-600" />
            <span className="text-sm text-secondary-700">
              Shipping to {order.shippingAddress.city}, {order.shippingAddress.state}
            </span>
          </div>
          {order.trackingNumber && (
            <span className="text-xs font-mono text-secondary-600">
              #{order.trackingNumber}
            </span>
          )}
        </div>
        
        {order.estimatedDelivery && (
          <div className="mt-1 text-xs text-secondary-600">
            Est. delivery: {format(new Date(order.estimatedDelivery), 'MMM dd')}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {order.status === 'pending' && (
            <Button variant="outline" size="sm">
              <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
              Cancel Order
            </Button>
          )}
          
          {order.trackingNumber && (
            <Button variant="outline" size="sm">
              <TruckIcon className="h-4 w-4 mr-1" />
              Track Package
            </Button>
          )}
        </div>

        <Link href={`/orders/${order.id}`}>
          <Button size="sm">
            View Details
          </Button>
        </Link>
      </div>
    </Card>
  );
}