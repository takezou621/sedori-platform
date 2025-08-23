export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  permissions: Permission[];
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminRole {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
  description: string;
}

export interface AdminStats {
  totalUsers: number;
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  revenueChange: number;
  ordersChange: number;
  usersChange: number;
  productsChange: number;
}

export interface AdminProductFilters {
  search?: string;
  category?: string;
  brand?: string;
  status?: 'active' | 'inactive' | 'draft';
  stockStatus?: 'in_stock' | 'low_stock' | 'out_of_stock';
  sortBy?: 'name' | 'price' | 'newest' | 'popular' | 'rating';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface AdminOrderFilters {
  search?: string;
  status?: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  paymentStatus?: 'pending' | 'paid' | 'failed' | 'refunded';
  dateFrom?: string;
  dateTo?: string;
  sortBy?: 'createdAt' | 'total' | 'status';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface AdminUserFilters {
  search?: string;
  role?: string;
  isActive?: boolean;
  sortBy?: 'name' | 'email' | 'createdAt' | 'lastLogin';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface CreateAdminUserRequest {
  email: string;
  name: string;
  password: string;
  roleId: string;
  isActive: boolean;
}

export interface UpdateAdminUserRequest {
  name?: string;
  roleId?: string;
  isActive?: boolean;
  permissions?: string[];
}

export interface CreateRoleRequest {
  name: string;
  description: string;
  permissions: string[];
  isActive: boolean;
}

export interface UpdateRoleRequest {
  name?: string;
  description?: string;
  permissions?: string[];
  isActive?: boolean;
}

export interface AdminLoginRequest {
  email: string;
  password: string;
}

export interface AdminAuthResponse {
  user: AdminUser;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AdminNotification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  metadata?: Record<string, any>;
}

export interface AdminActivityLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
}

export interface AdminDashboardData {
  stats: AdminStats;
  recentOrders: import('./order').Order[];
  recentUsers: import('./common').User[];
  lowStockProducts: import('./product').Product[];
  notifications: AdminNotification[];
  activityLogs: AdminActivityLog[];
}