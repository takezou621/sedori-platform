'use client';

import { AdminActivityLog as ActivityLogType } from '@/types/admin';
import { formatDateTime } from '@/lib/utils';

interface AdminActivityLogProps {
  activities?: ActivityLogType[];
}

export function AdminActivityLog({ activities = [] }: AdminActivityLogProps) {
  const mockActivities: ActivityLogType[] = activities.length > 0 ? activities : [
    {
      id: '1',
      userId: 'user1',
      userName: 'Admin User',
      action: 'Created',
      resource: 'Product',
      resourceId: 'prod1',
      details: { name: 'New Product' },
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
      createdAt: new Date().toISOString(),
    },
    {
      id: '2',
      userId: 'user2',
      userName: 'Admin User',
      action: 'Updated',
      resource: 'Order',
      resourceId: 'order1',
      details: { status: 'shipped' },
      ipAddress: '192.168.1.2',
      userAgent: 'Mozilla/5.0',
      createdAt: new Date(Date.now() - 3600000).toISOString(),
    },
  ];

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
      <div className="space-y-4">
        {mockActivities.map((activity) => (
          <div key={activity.id} className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 text-sm font-semibold">
                  {activity.userName.charAt(0)}
                </span>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-900">
                <span className="font-medium">{activity.userName}</span>{' '}
                {activity.action.toLowerCase()} a {activity.resource.toLowerCase()}
                {activity.details && activity.details.name && (
                  <span className="font-medium"> "{activity.details.name}"</span>
                )}
              </p>
              <p className="text-xs text-gray-500">{formatDateTime(activity.createdAt)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}