'use client';

import { useState } from 'react';
import { AdminRole, CreateRoleRequest, UpdateRoleRequest } from '@/types/admin';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';

interface AdminRoleFormProps {
  role?: AdminRole;
  onSubmit: (data: CreateRoleRequest | UpdateRoleRequest) => void;
  onCancel: () => void;
}

const availablePermissions = [
  { id: 'users.read', name: 'Read Users' },
  { id: 'users.create', name: 'Create Users' },
  { id: 'users.update', name: 'Update Users' },
  { id: 'users.delete', name: 'Delete Users' },
  { id: 'products.read', name: 'Read Products' },
  { id: 'products.create', name: 'Create Products' },
  { id: 'products.update', name: 'Update Products' },
  { id: 'products.delete', name: 'Delete Products' },
  { id: 'orders.read', name: 'Read Orders' },
  { id: 'orders.update', name: 'Update Orders' },
  { id: 'admin.dashboard', name: 'View Dashboard' },
];

export function AdminRoleForm({ role, onSubmit, onCancel }: AdminRoleFormProps) {
  const [formData, setFormData] = useState({
    name: role?.name || '',
    description: role?.description || '',
    permissions: role?.permissions.map(p => p.id) || [],
    isActive: role?.isActive ?? true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name: formData.name,
      description: formData.description,
      permissions: formData.permissions,
      isActive: formData.isActive,
    });
  };

  const handlePermissionChange = (permissionId: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      permissions: checked
        ? [...prev.permissions, permissionId]
        : prev.permissions.filter(p => p !== permissionId)
    }));
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        {role ? 'Edit Role' : 'Create Role'}
      </h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Name
          </label>
          <input
            type="text"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            required
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Permissions
          </label>
          <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-md p-3">
            {availablePermissions.map((permission) => (
              <div key={permission.id} className="flex items-center">
                <Checkbox
                  id={permission.id}
                  checked={formData.permissions.includes(permission.id)}
                  onChange={(checked) => handlePermissionChange(permission.id, checked)}
                />
                <label htmlFor={permission.id} className="ml-2 text-sm text-gray-700">
                  {permission.name}
                </label>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="isActive"
            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
            checked={formData.isActive}
            onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
          />
          <label htmlFor="isActive" className="ml-2 text-sm font-medium text-gray-700">
            Active
          </label>
        </div>

        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="primary" type="submit">
            {role ? 'Update' : 'Create'} Role
          </Button>
        </div>
      </form>
    </div>
  );
}