'use client';

import { useState, useEffect } from 'react';
import { Card, Button, Badge, Input } from '@/components/ui';

interface BetaInvite {
  id: string;
  email: string;
  name?: string;
  company?: string;
  businessType?: string;
  status: 'pending' | 'invited' | 'accepted' | 'declined' | 'expired';
  createdAt: string;
  invitedAt?: string;
  acceptedAt?: string;
}

export default function AdminBetaPage() {
  const [invites, setInvites] = useState<BetaInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchBetaInvites();
  }, []);

  const fetchBetaInvites = async () => {
    try {
      // Mock API call - replace with actual API endpoint
      const mockData: BetaInvite[] = [
        {
          id: '1',
          email: 'test1@example.com',
          name: '山田太郎',
          company: '株式会社テスト',
          businessType: 'せどり・転売',
          status: 'pending',
          createdAt: '2025-08-20T10:00:00Z',
        },
        {
          id: '2', 
          email: 'test2@example.com',
          name: '佐藤花子',
          company: 'EC事業部',
          businessType: 'EC事業',
          status: 'invited',
          createdAt: '2025-08-19T15:30:00Z',
          invitedAt: '2025-08-20T09:00:00Z',
        },
      ];
      setInvites(mockData);
    } catch (error) {
      console.error('Failed to fetch beta invites:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: BetaInvite['status']) => {
    const statusConfig = {
      pending: { variant: 'warning' as const, label: '申込み受付' },
      invited: { variant: 'default' as const, label: '招待送信済' },
      accepted: { variant: 'success' as const, label: '参加決定' },
      declined: { variant: 'destructive' as const, label: '辞退' },
      expired: { variant: 'outline' as const, label: '期限切れ' },
    };

    const config = statusConfig[status];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const handleStatusUpdate = async (id: string, newStatus: BetaInvite['status']) => {
    try {
      // Mock API call - replace with actual API endpoint
      setInvites(prev => 
        prev.map(invite => 
          invite.id === id ? { ...invite, status: newStatus } : invite
        )
      );
      alert(`ステータスを「${newStatus}」に更新しました`);
    } catch (error) {
      alert('ステータス更新に失敗しました');
    }
  };

  const filteredInvites = invites.filter(invite => {
    if (filterStatus !== 'all' && invite.status !== filterStatus) return false;
    if (searchQuery && !invite.email.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !invite.name?.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !invite.company?.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  const stats = {
    total: invites.length,
    pending: invites.filter(i => i.status === 'pending').length,
    invited: invites.filter(i => i.status === 'invited').length,
    accepted: invites.filter(i => i.status === 'accepted').length,
  };

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">ベータユーザー管理</h1>
        <p className="text-gray-600">ベータテスト参加希望者の管理</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">総申込数</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">申込み受付</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
            </div>
            <div className="h-12 w-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <svg className="h-6 w-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">招待送信済</p>
              <p className="text-2xl font-bold text-blue-600">{stats.invited}</p>
            </div>
            <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">参加決定</p>
              <p className="text-2xl font-bold text-green-600">{stats.accepted}</p>
            </div>
            <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <Input
            type="search"
            placeholder="名前、メールアドレス、会社名で検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {['all', 'pending', 'invited', 'accepted', 'declined'].map((status) => (
            <Button
              key={status}
              variant={filterStatus === status ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus(status)}
            >
              {status === 'all' ? 'すべて' : 
               status === 'pending' ? '申込み受付' :
               status === 'invited' ? '招待済み' :
               status === 'accepted' ? '参加決定' : '辞退'}
            </Button>
          ))}
        </div>
      </div>

      {/* Beta Invites List */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  申込者情報
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  事業内容
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ステータス
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  申込日
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredInvites.map((invite) => (
                <tr key={invite.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {invite.name || '未入力'}
                      </div>
                      <div className="text-sm text-gray-500">{invite.email}</div>
                      {invite.company && (
                        <div className="text-xs text-gray-400">{invite.company}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {invite.businessType || '未入力'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(invite.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(invite.createdAt).toLocaleDateString('ja-JP')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    {invite.status === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleStatusUpdate(invite.id, 'invited')}
                        >
                          招待送信
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStatusUpdate(invite.id, 'declined')}
                        >
                          辞退
                        </Button>
                      </>
                    )}
                    {invite.status === 'invited' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStatusUpdate(invite.id, 'accepted')}
                      >
                        参加決定
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredInvites.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">該当する申込みはありません</p>
          </div>
        )}
      </Card>
    </div>
  );
}