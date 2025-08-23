'use client';

import { useState } from 'react';
import { AdminSidebar } from './AdminSidebar';
import { AdminHeader } from './AdminHeader';
import { AdminProtectedRoute } from '../auth/AdminProtectedRoute';

interface AdminLayoutProps {
  children: React.ReactNode;
  requiredPermissions?: string[];
}

export function AdminLayout({ children, requiredPermissions }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <AdminProtectedRoute requiredPermissions={requiredPermissions}>
      <div className="min-h-screen bg-secondary-50">
        {/* Sidebar */}
        <AdminSidebar 
          open={sidebarOpen} 
          onClose={() => setSidebarOpen(false)} 
        />

        {/* Main content */}
        <div className="lg:pl-64">
          {/* Header */}
          <AdminHeader onMenuClick={() => setSidebarOpen(true)} />

          {/* Page content */}
          <main className="p-6">
            {children}
          </main>
        </div>
      </div>
    </AdminProtectedRoute>
  );
}