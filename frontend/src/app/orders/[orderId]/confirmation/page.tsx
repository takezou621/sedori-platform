'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { CheckCircleIcon, TruckIcon, ReceiptRefundIcon } from '@heroicons/react/24/outline';
import { Card, Button, LoadingSpinner } from '@/components/ui';
import { useOrder } from '@/hooks/useOrder';
import { OrderStatusTimeline } from '@/components/orders/OrderStatus';
import { PaymentStatusCard } from '@/components/payment/PaymentStatus';

interface OrderConfirmationPageProps {
  params: Promise<{
    orderId: string;
  }>;
}

export default async function OrderConfirmationPage({ params }: OrderConfirmationPageProps) {
  const { orderId } = await params;
  const { data: order, isLoading, error } = useOrder(orderId);

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: currency,
    }).format(price);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="p-8 text-center max-w-md mx-auto">
          <div className="text-red-500 mb-4">
            <CheckCircleIcon className="h-12 w-12 mx-auto" />
          </div>
          <h1 className="text-xl font-semibold text-secondary-900 mb-2">
            Order Not Found
          </h1>
          <p className="text-secondary-600 mb-4">
            We couldn't find the order you're looking for.
          </p>
          <Link href="/orders">
            <Button>View All Orders</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Success Header */}
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircleIcon className="h-10 w-10 text-green-600" />
        </div>
        <h1 className="text-3xl font-bold text-secondary-900 mb-2">
          Order Confirmed!
        </h1>
        <p className="text-lg text-secondary-600">
          Thank you for your order. We've received it and will process it shortly.
        </p>
      </div>

      {/* Order Details Card */}
      <Card className="p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-secondary-900">
              Order #{order.orderNumber}
            </h2>
            <p className="text-secondary-600">
              Placed on {new Date(order.createdAt).toLocaleDateString()}
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-secondary-900">
              {formatPrice(order.total, order.currency)}
            </div>
            <p className="text-sm text-secondary-600">Total Amount</p>
          </div>
        </div>

        {/* Payment Status */}
        <PaymentStatusCard
          status={order.paymentStatus}
          paymentMethod={order.paymentMethod.type}
          amount={order.total}
          currency={order.currency}
          paymentDate={order.paymentDate}
          transactionId={order.id}
          className="mb-6"
        />

        {/* Order Items Summary */}
        <div className="border-t border-secondary-200 pt-6">
          <h3 className="text-lg font-medium text-secondary-900 mb-4">
            Items Ordered ({order.items.length} {order.items.length === 1 ? 'item' : 'items'})
          </h3>
          <div className="space-y-3">
            {order.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-secondary-100 rounded-md"></div>
                  <div>
                    <div className="font-medium text-secondary-900">
                      {item.product.name}
                    </div>
                    <div className="text-sm text-secondary-500">
                      Qty: {item.quantity}
                    </div>
                  </div>
                </div>
                <div className="font-medium text-secondary-900">
                  {formatPrice(item.price * item.quantity, item.currency)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Shipping Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-secondary-900 mb-4 flex items-center">
            <TruckIcon className="h-5 w-5 mr-2" />
            Shipping Address
          </h3>
          <div className="text-secondary-600">
            <div className="font-medium text-secondary-900">{order.shippingAddress.name}</div>
            <div>{order.shippingAddress.street}</div>
            {order.shippingAddress.street2 && <div>{order.shippingAddress.street2}</div>}
            <div>
              {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}
            </div>
            <div>{order.shippingAddress.country}</div>
            {order.shippingAddress.phone && (
              <div className="mt-2">{order.shippingAddress.phone}</div>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-secondary-900 mb-4">
            Order Summary
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-secondary-600">Subtotal</span>
              <span className="font-medium">{formatPrice(order.subtotal, order.currency)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-secondary-600">Shipping</span>
              <span className="font-medium">
                {order.shipping > 0 ? formatPrice(order.shipping, order.currency) : 'Free'}
              </span>
            </div>
            {order.tax > 0 && (
              <div className="flex justify-between">
                <span className="text-secondary-600">Tax</span>
                <span className="font-medium">{formatPrice(order.tax, order.currency)}</span>
              </div>
            )}
            <div className="border-t border-secondary-200 pt-2">
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span>{formatPrice(order.total, order.currency)}</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Order Status Timeline */}
      <Card className="p-6 mb-6">
        <h3 className="text-lg font-semibold text-secondary-900 mb-4">
          Order Status
        </h3>
        <OrderStatusTimeline
          currentStatus={order.status}
          createdAt={order.createdAt}
          confirmedAt={order.confirmedAt}
          shippedAt={order.shippedAt}
          deliveredAt={order.deliveredAt}
          cancelledAt={order.cancelledAt}
        />
      </Card>

      {/* Next Steps */}
      <Card className="p-6 mb-6">
        <h3 className="text-lg font-semibold text-secondary-900 mb-4">
          What happens next?
        </h3>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs font-medium text-primary-600">1</span>
            </div>
            <div>
              <div className="font-medium text-secondary-900">Order Processing</div>
              <div className="text-sm text-secondary-600">
                We'll review and confirm your order within 24 hours.
              </div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs font-medium text-primary-600">2</span>
            </div>
            <div>
              <div className="font-medium text-secondary-900">Shipping</div>
              <div className="text-sm text-secondary-600">
                Your order will be packed and shipped within 2-3 business days.
              </div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs font-medium text-primary-600">3</span>
            </div>
            <div>
              <div className="font-medium text-secondary-900">Delivery</div>
              <div className="text-sm text-secondary-600">
                You'll receive tracking information and estimated delivery date.
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Link href={`/orders/${order.id}`}>
          <Button variant="outline" size="lg" className="w-full sm:w-auto">
            View Order Details
          </Button>
        </Link>
        <Link href="/orders">
          <Button variant="outline" size="lg" className="w-full sm:w-auto">
            <ReceiptRefundIcon className="h-5 w-5 mr-2" />
            View All Orders
          </Button>
        </Link>
        <Link href="/products">
          <Button size="lg" className="w-full sm:w-auto">
            Continue Shopping
          </Button>
        </Link>
      </div>

      {/* Support Information */}
      <div className="text-center mt-8 text-sm text-secondary-600">
        <p>
          Need help with your order?{' '}
          <Link href="/support" className="text-primary-600 hover:text-primary-700 font-medium">
            Contact Support
          </Link>
        </p>
      </div>
    </div>
  );
}