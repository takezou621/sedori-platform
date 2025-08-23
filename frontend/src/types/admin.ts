export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'super_admin';
  createdAt: string;
}

export interface AdminStats {
  totalUsers: number;
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  recentOrders: Order[];
  topProducts: Product[];
}

export interface AdminFilters {
  startDate?: string;
  endDate?: string;
  status?: string;
}

import { Order } from './order';
import { Product } from './product';