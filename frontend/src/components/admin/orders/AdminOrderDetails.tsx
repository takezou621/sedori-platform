'use client';

import { Order } from '@/types/order';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatDate } from '@/lib/utils';

interface AdminOrderDetailsProps {
  order: Order;
  onUpdateStatus: (orderId: string, status: Order['status']) => void;
  onClose: () => void;
}

export function AdminOrderDetails({ order, onUpdateStatus, onClose }: AdminOrderDetailsProps) {
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'default';
      case 'shipped':
        return 'secondary';
      case 'pending':
        return 'outline';
      case 'cancelled':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Order #{order.orderNumber}
          </h3>
          <p className="text-gray-600">{formatDate(order.createdAt)}</p>
        </div>
        <Button variant="outline" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Order Status</h4>
            <div className="flex items-center space-x-2 mb-2">
              <Badge variant={getStatusVariant(order.status)}>
                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
              </Badge>
              <Badge variant={order.paymentStatus === 'paid' ? 'default' : 'outline'}>
                {order.paymentStatus.charAt(0).toUpperCase() + order.paymentStatus.slice(1)}
              </Badge>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {(['pending', 'confirmed', 'processing', 'shipped', 'delivered'] as const).map((status) => (
                <Button
                  key={status}
                  variant={order.status === status ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => onUpdateStatus(order.id, status)}
                  disabled={order.status === status}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 mb-2">Customer Information</h4>
            <div className="space-y-1">
              <p className="text-sm text-gray-600">User ID: {order.userId}</p>
            </div>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 mb-2">Shipping Address</h4>
            <div className="space-y-1 text-sm text-gray-600">
              <p>{order.shippingAddress.name}</p>
              {order.shippingAddress.company && <p>{order.shippingAddress.company}</p>}
              <p>{order.shippingAddress.addressLine1}</p>
              {order.shippingAddress.addressLine2 && <p>{order.shippingAddress.addressLine2}</p>}
              <p>
                {order.shippingAddress.city}, {order.shippingAddress.state}{' '}
                {order.shippingAddress.postalCode}
              </p>
              <p>{order.shippingAddress.country}</p>
              {order.shippingAddress.phone && <p>Phone: {order.shippingAddress.phone}</p>}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Order Items</h4>
            <div className="space-y-2">
              {order.items.map((item) => (
                <div key={item.id} className="flex justify-between items-center py-2 border-b border-gray-100">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.product.name}</p>
                    <p className="text-xs text-gray-500">SKU: {item.product.sku}</p>
                    <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      ¥{item.totalPrice.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500">
                      ¥{item.unitPrice.toLocaleString()} each
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 mb-2">Order Summary</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span>¥{order.subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Tax</span>
                <span>¥{order.tax.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Shipping</span>
                <span>¥{order.shipping.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-medium text-lg border-t border-gray-200 pt-2">
                <span>Total</span>
                <span>¥{order.total.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}