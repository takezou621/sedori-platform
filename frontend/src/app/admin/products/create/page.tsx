'use client';

import { AdminLayout, AdminProductForm } from '@/components/admin';

export default function AdminCreateProductPage() {
  return (
    <AdminLayout requiredPermissions={['products:write']}>
      <AdminProductForm />
    </AdminLayout>
  );
}