import { Order } from '@/types/order';
import { Card, Badge } from '@/components/ui';
import Link from 'next/link';

interface RecentOrdersProps {
  orders: Order[];
}

export function RecentOrders({ orders }: RecentOrdersProps) {
  const getStatusBadge = (status: Order['status']) => {
    const variants = {
      pending: 'warning' as const,
      confirmed: 'success' as const,
      shipped: 'default' as const,
      delivered: 'success' as const,
      cancelled: 'destructive' as const,
    };
    return <Badge variant={variants[status]}>{status}</Badge>;
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Recent Orders</h3>
        <Link href="/orders" className="text-blue-600 hover:text-blue-800 text-sm">
          View All
        </Link>
      </div>
      
      {orders.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No recent orders</p>
      ) : (
        <div className="space-y-3">
          {orders.slice(0, 5).map((order) => (
            <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <Link href={`/orders/${order.id}`} className="font-medium text-gray-900 hover:text-blue-600">
                  {order.id}
                </Link>
                <p className="text-sm text-gray-600">
                  {new Date(order.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="text-right">
                <div className="font-semibold text-gray-900">
                  ${order.total.toFixed(2)}
                </div>
                {getStatusBadge(order.status)}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}