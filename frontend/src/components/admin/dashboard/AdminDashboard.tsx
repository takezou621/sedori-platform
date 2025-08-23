'use client';

import { AdminStatsCards } from './AdminStatsCards';
import { AdminActivityLog } from '../common/AdminActivityLog';
import { AdminStats } from '@/types/admin';

interface AdminDashboardProps {
  stats: AdminStats;
}

export function AdminDashboard({ stats }: AdminDashboardProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Overview of your admin panel</p>
      </div>
      
      <AdminStatsCards stats={stats} />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AdminActivityLog />
      </div>
    </div>
  );
}