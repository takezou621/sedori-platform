'use client';

import { AdminUser } from '@/types/admin';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatDateTime } from '@/lib/utils';

interface AdminUserDetailsProps {
  user: AdminUser;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}

export function AdminUserDetails({ user, onEdit, onDelete, onClose }: AdminUserDetailsProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{user.name}</h3>
          <p className="text-gray-600">{user.email}</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={onEdit}>
            Edit
          </Button>
          <Button variant="outline" size="sm" onClick={onDelete}>
            Delete
          </Button>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <Badge variant={user.isActive ? 'default' : 'destructive'}>
            {user.isActive ? 'Active' : 'Inactive'}
          </Badge>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Role
          </label>
          <Badge variant="secondary">{user.role.name}</Badge>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Permissions
          </label>
          <div className="flex flex-wrap gap-1">
            {user.permissions.map((permission) => (
              <Badge key={permission.id} variant="outline">
                {permission.name}
              </Badge>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Last Login
          </label>
          <p className="text-sm text-gray-900">
            {user.lastLogin ? formatDateTime(user.lastLogin) : 'Never'}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Created At
          </label>
          <p className="text-sm text-gray-900">{formatDateTime(user.createdAt)}</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Updated At
          </label>
          <p className="text-sm text-gray-900">{formatDateTime(user.updatedAt)}</p>
        </div>
      </div>
    </div>
  );
}