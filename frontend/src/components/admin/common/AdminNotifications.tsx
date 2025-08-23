'use client';

import { useEffect, useRef } from 'react';
import { format } from 'date-fns';
import {
  CheckIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { Card, Button, LoadingSpinner } from '@/components/ui';
import { 
  useAdminNotifications, 
  useMarkNotificationAsRead,
  useMarkAllNotificationsAsRead 
} from '@/hooks/useAdmin';
import { AdminNotification } from '@/types/admin';

interface AdminNotificationsProps {
  onClose: () => void;
}

export function AdminNotifications({ onClose }: AdminNotificationsProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { data: notifications, isLoading } = useAdminNotifications();
  const markAsReadMutation = useMarkNotificationAsRead();
  const markAllAsReadMutation = useMarkAllNotificationsAsRead();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  const getNotificationIcon = (type: AdminNotification['type']) => {
    switch (type) {
      case 'success':
        return <CheckIcon className="h-5 w-5 text-green-600" />;
      case 'warning':
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600" />;
      case 'error':
        return <XCircleIcon className="h-5 w-5 text-red-600" />;
      default:
        return <InformationCircleIcon className="h-5 w-5 text-blue-600" />;
    }
  };

  const getNotificationBgColor = (type: AdminNotification['type'], isRead: boolean) => {
    const baseClasses = isRead ? 'bg-white' : 'bg-blue-50';
    
    switch (type) {
      case 'success':
        return isRead ? 'bg-white' : 'bg-green-50';
      case 'warning':
        return isRead ? 'bg-white' : 'bg-yellow-50';
      case 'error':
        return isRead ? 'bg-white' : 'bg-red-50';
      default:
        return baseClasses;
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markAsReadMutation.mutateAsync(notificationId);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsReadMutation.mutateAsync();
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  const unreadNotifications = notifications?.filter(n => !n.isRead) || [];
  const recentNotifications = notifications?.slice(0, 10) || [];

  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 mt-2 w-80 max-w-sm bg-white rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-secondary-200">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-secondary-900">
            Notifications
            {unreadNotifications.length > 0 && (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                {unreadNotifications.length} unread
              </span>
            )}
          </h3>
          
          {unreadNotifications.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              disabled={markAllAsReadMutation.isPending}
              className="text-xs"
            >
              Mark all read
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-h-96 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner size="sm" />
          </div>
        ) : notifications && notifications.length > 0 ? (
          <div className="divide-y divide-secondary-100">
            {recentNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`px-4 py-3 hover:bg-secondary-50 cursor-pointer ${
                  getNotificationBgColor(notification.type, notification.isRead)
                }`}
                onClick={() => !notification.isRead && handleMarkAsRead(notification.id)}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {getNotificationIcon(notification.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className={`text-sm font-medium ${
                        notification.isRead ? 'text-secondary-900' : 'text-secondary-900'
                      }`}>
                        {notification.title}
                      </p>
                      {!notification.isRead && (
                        <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0"></div>
                      )}
                    </div>
                    
                    <p className={`text-sm mt-1 ${
                      notification.isRead ? 'text-secondary-600' : 'text-secondary-700'
                    }`}>
                      {notification.message}
                    </p>
                    
                    <p className="text-xs text-secondary-500 mt-2">
                      {format(new Date(notification.createdAt), 'MMM dd, HH:mm')}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-4 py-8 text-center">
            <InformationCircleIcon className="h-8 w-8 text-secondary-400 mx-auto mb-2" />
            <p className="text-sm text-secondary-500">No notifications yet</p>
          </div>
        )}
      </div>

      {/* Footer */}
      {notifications && notifications.length > 10 && (
        <div className="px-4 py-3 border-t border-secondary-200">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-center"
            onClick={() => {
              // Navigate to full notifications page
              onClose();
            }}
          >
            View all notifications
          </Button>
        </div>
      )}
    </div>
  );
}