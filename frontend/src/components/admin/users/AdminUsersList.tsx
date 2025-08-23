'use client';

import { useState } from 'react';
import { AdminUser, AdminUserFilters } from '@/types/admin';
import { Button } from '@/components/ui/Button';
import { AdminTable } from '../common/AdminTable';

interface AdminUsersListProps {
  users: AdminUser[];
  totalUsers: number;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onFiltersChange: (filters: AdminUserFilters) => void;
  onEditUser: (user: AdminUser) => void;
  onDeleteUser: (userId: string) => void;
}

export function AdminUsersList({
  users,
  totalUsers,
  currentPage,
  totalPages,
  onPageChange,
  onFiltersChange,
  onEditUser,
  onDeleteUser,
}: AdminUsersListProps) {
  const [filters, setFilters] = useState<AdminUserFilters>({});

  const handleFiltersChange = (newFilters: Partial<AdminUserFilters>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    onFiltersChange(updatedFilters);
  };

  const columns = [
    { key: 'name', title: 'Name' },
    { key: 'email', title: 'Email' },
    { key: 'role', title: 'Role' },
    { key: 'isActive', title: 'Status' },
    { key: 'lastLogin', title: 'Last Login' },
    { key: 'actions', title: 'Actions' },
  ];

  const formatUserData = (users: AdminUser[]) => {
    return users.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role.name,
      isActive: user.isActive ? 'Active' : 'Inactive',
      lastLogin: user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never',
      actions: (
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEditUser(user)}
          >
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDeleteUser(user.id)}
          >
            Delete
          </Button>
        </div>
      ),
    }));
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Users ({totalUsers})</h2>
        <Button variant="primary">Add User</Button>
      </div>
      
      <div className="flex space-x-4 mb-4">
        <input
          type="text"
          placeholder="Search users..."
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          onChange={(e) => handleFiltersChange({ search: e.target.value })}
        />
        <select
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          onChange={(e) => handleFiltersChange({ isActive: e.target.value === 'true' })}
        >
          <option value="">All Status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </div>

      <AdminTable
        columns={columns}
        data={formatUserData(users) as any}
      />
    </div>
  );
}