'use client';

import { AdminLayout, AdminProductForm } from '@/components/admin';

interface AdminEditProductPageProps {
  params: Promise<{
    productId: string;
  }>;
}

export default async function AdminEditProductPage({ params }: AdminEditProductPageProps) {
  const { productId } = await params;
  return (
    <AdminLayout requiredPermissions={['products:write']}>
      <AdminProductForm productId={productId} />
    </AdminLayout>
  );
}