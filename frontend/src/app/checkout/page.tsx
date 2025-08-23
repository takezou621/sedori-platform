'use client';

import { CreateOrder } from '@/components/orders';

export default function CheckoutPage() {
  return (
    <div className="min-h-screen bg-secondary-50 py-8">
      <div className="container mx-auto px-4">
        <CreateOrder />
      </div>
    </div>
  );
}