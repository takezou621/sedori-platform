'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { 
  AdminUser, 
  AdminRole, 
  AdminStats, 
  AdminDashboardData,
  AdminLoginRequest,
  AdminAuthResponse,
  CreateAdminUserRequest,
  UpdateAdminUserRequest,
  CreateRoleRequest,
  UpdateRoleRequest,
  AdminUserFilters,
  AdminNotification,
  AdminActivityLog
} from '@/types/admin';

// Auth hooks
export function useAdminLogin() {
  return useMutation({
    mutationFn: async (credentials: AdminLoginRequest) => {
      const response = await api.post<AdminAuthResponse>('/admin/auth/login', credentials);
      return response.data;
    },
    onSuccess: (data) => {
      // Store tokens in localStorage or secure storage
      localStorage.setItem('adminAccessToken', data.accessToken);
      localStorage.setItem('adminRefreshToken', data.refreshToken);
    },
  });
}

export function useAdminLogout() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      await api.post('/admin/auth/logout');
    },
    onSuccess: () => {
      localStorage.removeItem('adminAccessToken');
      localStorage.removeItem('adminRefreshToken');
      queryClient.clear();
    },
  });
}

export function useAdminProfile() {
  return useQuery({
    queryKey: ['adminProfile'],
    queryFn: async () => {
      const response = await api.get<AdminUser>('/admin/auth/profile');
      return response.data;
    },
  });
}

// Dashboard hooks
export function useAdminStats() {
  return useQuery({
    queryKey: ['adminStats'],
    queryFn: async () => {
      const response = await api.get<AdminStats>('/admin/stats');
      return response.data;
    },
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });
}

export function useAdminDashboard() {
  return useQuery({
    queryKey: ['adminDashboard'],
    queryFn: async () => {
      const response = await api.get<AdminDashboardData>('/admin/dashboard');
      return response.data;
    },
    refetchInterval: 2 * 60 * 1000, // Refresh every 2 minutes
  });
}

// User management hooks
export function useAdminUsers(filters?: AdminUserFilters) {
  return useQuery({
    queryKey: ['adminUsers', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      
      if (filters?.search) params.append('search', filters.search);
      if (filters?.role) params.append('role', filters.role);
      if (filters?.isActive !== undefined) params.append('isActive', filters.isActive.toString());
      if (filters?.sortBy) params.append('sortBy', filters.sortBy);
      if (filters?.sortOrder) params.append('sortOrder', filters.sortOrder);
      if (filters?.page) params.append('page', filters.page.toString());
      if (filters?.limit) params.append('limit', filters.limit.toString());

      const response = await api.get(`/admin/users?${params.toString()}`);
      return response.data;
    },
  });
}

export function useAdminUser(userId: string) {
  return useQuery({
    queryKey: ['adminUser', userId],
    queryFn: async () => {
      const response = await api.get<AdminUser>(`/admin/users/${userId}`);
      return response.data;
    },
    enabled: !!userId,
  });
}

export function useCreateAdminUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: CreateAdminUserRequest) => {
      const response = await api.post<AdminUser>('/admin/users', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
    },
  });
}

export function useUpdateAdminUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ userId, data }: { userId: string; data: UpdateAdminUserRequest }) => {
      const response = await api.patch<AdminUser>(`/admin/users/${userId}`, data);
      return response.data;
    },
    onSuccess: (updatedUser) => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      queryClient.setQueryData(['adminUser', updatedUser.id], updatedUser);
    },
  });
}

export function useDeleteAdminUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (userId: string) => {
      await api.delete(`/admin/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
    },
  });
}

// Role management hooks
export function useAdminRoles() {
  return useQuery({
    queryKey: ['adminRoles'],
    queryFn: async () => {
      const response = await api.get<AdminRole[]>('/admin/roles');
      return response.data;
    },
  });
}

export function useAdminRole(roleId: string) {
  return useQuery({
    queryKey: ['adminRole', roleId],
    queryFn: async () => {
      const response = await api.get<AdminRole>(`/admin/roles/${roleId}`);
      return response.data;
    },
    enabled: !!roleId,
  });
}

export function useCreateAdminRole() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: CreateRoleRequest) => {
      const response = await api.post<AdminRole>('/admin/roles', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminRoles'] });
    },
  });
}

export function useUpdateAdminRole() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ roleId, data }: { roleId: string; data: UpdateRoleRequest }) => {
      const response = await api.patch<AdminRole>(`/admin/roles/${roleId}`, data);
      return response.data;
    },
    onSuccess: (updatedRole) => {
      queryClient.invalidateQueries({ queryKey: ['adminRoles'] });
      queryClient.setQueryData(['adminRole', updatedRole.id], updatedRole);
    },
  });
}

export function useDeleteAdminRole() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (roleId: string) => {
      await api.delete(`/admin/roles/${roleId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminRoles'] });
    },
  });
}

// Notifications hooks
export function useAdminNotifications() {
  return useQuery({
    queryKey: ['adminNotifications'],
    queryFn: async () => {
      const response = await api.get<AdminNotification[]>('/admin/notifications');
      return response.data;
    },
    refetchInterval: 30 * 1000, // Refresh every 30 seconds
  });
}

export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (notificationId: string) => {
      await api.patch(`/admin/notifications/${notificationId}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminNotifications'] });
    },
  });
}

export function useMarkAllNotificationsAsRead() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      await api.patch('/admin/notifications/read-all');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminNotifications'] });
    },
  });
}

// Activity logs hooks
export function useAdminActivityLogs(page = 1, limit = 50) {
  return useQuery({
    queryKey: ['adminActivityLogs', page, limit],
    queryFn: async () => {
      const response = await api.get<{
        logs: AdminActivityLog[];
        total: number;
        page: number;
        totalPages: number;
      }>(`/admin/activity-logs?page=${page}&limit=${limit}`);
      return response.data;
    },
  });
}

// Permissions hooks
export function useAdminPermissions() {
  return useQuery({
    queryKey: ['adminPermissions'],
    queryFn: async () => {
      const response = await api.get('/admin/permissions');
      return response.data;
    },
  });
}