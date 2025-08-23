'use client';

import { OrderDetails } from '@/components/orders';

interface OrderPageProps {
  params: Promise<{
    orderId: string;
  }>;
}

export default async function OrderPage({ params }: OrderPageProps) {
  const { orderId } = await params;
  return (
    <div className="container mx-auto px-4 py-8">
      <OrderDetails orderId={orderId} />
    </div>
  );
}