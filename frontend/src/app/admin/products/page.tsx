'use client';

import { AdminLayout, AdminProductsList } from '@/components/admin';

export default function AdminProductsPage() {
  return (
    <AdminLayout requiredPermissions={['products:read']}>
      <AdminProductsList />
    </AdminLayout>
  );
}