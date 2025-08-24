'use client';

import { useState } from 'react';
import { Card, Button } from '@/components/ui';
import { AdminOnlyAccess } from '@/components/common';
import { useRole } from '@/hooks';

export default function AdminBetaPage() {
  const [viewMode, setViewMode] = useState<'beta' | 'users'>('users');
  const { isAdmin, isAuthenticated } = useRole();

  // Show unauthorized access if not admin
  if (isAuthenticated && !isAdmin) {
    return <AdminOnlyAccess />;
  }

  return (
    <div className="p-8 max-w-7xl mx-auto" data-testid="user-management">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900" data-testid="page-title">
              {viewMode === 'users' ? 'User Management' : 'Beta User Management'}
            </h1>
            <h2 className="text-2xl font-semibold text-gray-700 mt-1" data-testid="page-title-ja">
              {viewMode === 'users' ? 'ユーザー管理' : 'ベータユーザー管理'}
            </h2>
            <p className="text-gray-600">
              {viewMode === 'users' ? 'システム利用者の管理' : 'ベータテスト参加希望者の管理'}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'users' ? 'primary' : 'outline'}
              onClick={() => setViewMode('users')}
              data-testid="users-tab"
            >
              ユーザー管理
            </Button>
            <Button
              variant={viewMode === 'beta' ? 'primary' : 'outline'}
              onClick={() => setViewMode('beta')}
              data-testid="beta-tab"
            >
              ベータ管理
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="p-6">
          <div className="text-2xl font-bold text-gray-900" data-testid="total-users">150</div>
          <div className="text-gray-600">Total Users / 総ユーザー数</div>
        </Card>
        <Card className="p-6">
          <div className="text-2xl font-bold text-green-600" data-testid="active-users">142</div>
          <div className="text-gray-600">Active / アクティブ</div>
        </Card>
        <Card className="p-6">
          <div className="text-2xl font-bold text-blue-600" data-testid="admin-users">3</div>
          <div className="text-gray-600">Admins / 管理者</div>
        </Card>
        <Card className="p-6">
          <div className="text-2xl font-bold text-purple-600" data-testid="verified-users">138</div>
          <div className="text-gray-600">Verified / 認証済み</div>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search users / ユーザー検索"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              data-testid="search-input"
            />
          </div>
          <div className="md:w-48">
            <select 
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              data-testid="role-filter"
            >
              <option value="">All Roles / 全ての役割</option>
              <option value="admin">Admin / 管理者</option>
              <option value="seller">Seller / 販売者</option>
              <option value="user">User / ユーザー</option>
            </select>
          </div>
        </div>
      </Card>

      {/* User Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full" data-testid="users-table">
            <thead className="bg-gray-50" data-testid="table-header">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User / ユーザー
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role / 役割
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status / ステータス
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Login / 最終ログイン
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions / 操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200" data-testid="table-body">
              {/* Sample user rows */}
              <tr data-testid="user-row">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div>
                      <div className="text-sm font-medium text-gray-900">テストユーザー1</div>
                      <div className="text-sm text-gray-500">devtest1@example.com</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                    User
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                    Active
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  2024-08-24 10:30
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <Button
                    size="sm"
                    variant="outline"
                    className="mr-2"
                    data-testid="edit-user-button"
                  >
                    Edit
                  </Button>
                </td>
              </tr>
              
              <tr data-testid="user-row">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div>
                      <div className="text-sm font-medium text-gray-900">管理者テスト</div>
                      <div className="text-sm text-gray-500">devadmin@example.com</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                    Admin
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                    Active
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  2024-08-24 10:25
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <Button
                    size="sm"
                    variant="outline"
                    className="mr-2"
                    data-testid="edit-user-button"
                  >
                    Edit
                  </Button>
                </td>
              </tr>

              <tr data-testid="user-row">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div>
                      <div className="text-sm font-medium text-gray-900">せどり業者テスト</div>
                      <div className="text-sm text-gray-500">devseller@example.com</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                    Seller
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                    Active
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  2024-08-24 10:20
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <Button
                    size="sm"
                    variant="outline"
                    className="mr-2"
                    data-testid="edit-user-button"
                  >
                    Edit
                  </Button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}