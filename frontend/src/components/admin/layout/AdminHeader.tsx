'use client';

import { Fragment, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Menu, Transition } from '@headlessui/react';
import {
  Bars3Icon,
  BellIcon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
  CogIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import { Button, Badge } from '@/components/ui';
import { useAdminProfile, useAdminLogout, useAdminNotifications } from '@/hooks/useAdmin';
import { AdminNotifications } from '../common/AdminNotifications';

interface AdminHeaderProps {
  onMenuClick: () => void;
}

export function AdminHeader({ onMenuClick }: AdminHeaderProps) {
  const router = useRouter();
  const { data: adminUser } = useAdminProfile();
  const { data: notifications } = useAdminNotifications();
  const adminLogoutMutation = useAdminLogout();
  
  const [showNotifications, setShowNotifications] = useState(false);

  const unreadCount = notifications?.filter(n => !n.isRead).length || 0;

  const handleLogout = async () => {
    try {
      await adminLogoutMutation.mutateAsync();
      router.push('/admin/login');
    } catch (error) {
      console.error('Logout failed:', error);
      // Force logout even if API call fails
      localStorage.removeItem('adminAccessToken');
      localStorage.removeItem('adminRefreshToken');
      router.push('/admin/login');
    }
  };

  return (
    <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-secondary-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
      {/* Mobile menu button */}
      <button
        type="button"
        className="-m-2.5 p-2.5 text-secondary-700 lg:hidden"
        onClick={onMenuClick}
      >
        <span className="sr-only">Open sidebar</span>
        <Bars3Icon className="h-6 w-6" aria-hidden="true" />
      </button>

      {/* Separator */}
      <div className="h-6 w-px bg-secondary-200 lg:hidden" aria-hidden="true" />

      <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
        {/* Search could go here */}
        <div className="flex flex-1"></div>

        <div className="flex items-center gap-x-4 lg:gap-x-6">
          {/* Notifications */}
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative"
            >
              <span className="sr-only">View notifications</span>
              <BellIcon className="h-6 w-6" aria-hidden="true" />
              {unreadCount > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center bg-red-500 text-white text-xs rounded-full">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Badge>
              )}
            </Button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <AdminNotifications 
                onClose={() => setShowNotifications(false)}
              />
            )}
          </div>

          {/* Separator */}
          <div className="hidden lg:block lg:h-6 lg:w-px lg:bg-secondary-200" aria-hidden="true" />

          {/* Profile dropdown */}
          <Menu as="div" className="relative">
            <Menu.Button className="-m-1.5 flex items-center p-1.5">
              <span className="sr-only">Open user menu</span>
              <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                <span className="text-primary-700 font-medium text-sm">
                  {adminUser?.name?.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="hidden lg:flex lg:items-center">
                <span className="ml-4 text-sm font-semibold leading-6 text-secondary-900" aria-hidden="true">
                  {adminUser?.name}
                </span>
                <span className="ml-1 text-xs text-secondary-500">
                  ({adminUser?.role?.name})
                </span>
              </span>
            </Menu.Button>
            
            <Transition
              as={Fragment}
              enter="transition ease-out duration-100"
              enterFrom="transform opacity-0 scale-95"
              enterTo="transform opacity-100 scale-100"
              leave="transition ease-in duration-75"
              leaveFrom="transform opacity-100 scale-100"
              leaveTo="transform opacity-0 scale-95"
            >
              <Menu.Items className="absolute right-0 z-10 mt-2.5 w-48 origin-top-right rounded-md bg-white py-2 shadow-lg ring-1 ring-secondary-900/5 focus:outline-none">
                <Menu.Item>
                  {({ active }) => (
                    <button
                      className={`${
                        active ? 'bg-secondary-50' : ''
                      } flex w-full items-center px-3 py-2 text-sm text-secondary-700`}
                    >
                      <UserIcon className="h-4 w-4 mr-3" />
                      Profile
                    </button>
                  )}
                </Menu.Item>
                
                <Menu.Item>
                  {({ active }) => (
                    <button
                      className={`${
                        active ? 'bg-secondary-50' : ''
                      } flex w-full items-center px-3 py-2 text-sm text-secondary-700`}
                    >
                      <CogIcon className="h-4 w-4 mr-3" />
                      Settings
                    </button>
                  )}
                </Menu.Item>

                <div className="border-t border-secondary-100 my-1" />

                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={handleLogout}
                      disabled={adminLogoutMutation.isPending}
                      className={`${
                        active ? 'bg-secondary-50' : ''
                      } flex w-full items-center px-3 py-2 text-sm text-secondary-700`}
                    >
                      <ArrowRightOnRectangleIcon className="h-4 w-4 mr-3" />
                      {adminLogoutMutation.isPending ? 'Signing out...' : 'Sign out'}
                    </button>
                  )}
                </Menu.Item>
              </Menu.Items>
            </Transition>
          </Menu>
        </div>
      </div>
    </div>
  );
}