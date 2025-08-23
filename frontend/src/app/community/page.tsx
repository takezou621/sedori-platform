'use client';

import { useState } from 'react';
import { Button } from '@/components/ui';
import Link from 'next/link';

export default function CommunityPage() {
  const [activeTab, setActiveTab] = useState('forum');

  const tabs = [
    { id: 'forum', name: 'フォーラム', count: 234 },
    { id: 'qa', name: 'Q&A', count: 89 },
    { id: 'reviews', name: 'レビュー', count: 156 },
    { id: 'messages', name: 'メッセージ', count: 12 },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="md:flex md:items-center md:justify-between">
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
                  コミュニティ
                </h1>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  せどりコミュニティで情報を共有し、質問に答え合い、つながりを築きましょう
                </p>
              </div>
              <div className="mt-4 flex md:mt-0 md:ml-4">
                <Button className="ml-3">
                  新しい投稿
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <div className="lg:w-64 flex-shrink-0">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                カテゴリー
              </h3>
              <nav className="space-y-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-md transition-colors ${
                      activeTab === tab.id
                        ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                        : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <span>{tab.name}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {tab.count}
                    </span>
                  </button>
                ))}
              </nav>

              <div className="mt-8">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  人気のタグ
                </h3>
                <div className="flex flex-wrap gap-2">
                  {['Amazon', '楽天', 'Yahoo', 'メルカリ', '仕入れ', 'FBA', '価格改定', '在庫管理'].map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {activeTab === 'forum' && <ForumContent />}
            {activeTab === 'qa' && <QAContent />}
            {activeTab === 'reviews' && <ReviewsContent />}
            {activeTab === 'messages' && <MessagesContent />}
          </div>
        </div>
      </div>
    </div>
  );
}

function ForumContent() {
  const posts = [
    {
      id: 1,
      title: 'Amazonの価格改定戦略について',
      author: '田中太郎',
      category: 'discussion',
      replies: 12,
      likes: 23,
      lastActivity: '2時間前',
      isPinned: true,
    },
    {
      id: 2,
      title: '楽天スーパーセールでの仕入れのコツ',
      author: '佐藤花子',
      category: 'tip',
      replies: 8,
      likes: 15,
      lastActivity: '4時間前',
      isPinned: false,
    },
    {
      id: 3,
      title: 'FBA手数料の計算方法を教えてください',
      author: '山田次郎',
      category: 'question',
      replies: 5,
      likes: 7,
      lastActivity: '6時間前',
      isPinned: false,
    },
  ];

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <div
          key={post.id}
          className="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow p-6"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                {post.isPinned && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300">
                    📌 ピン留め
                  </span>
                )}
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300">
                  {post.category === 'discussion' && 'ディスカッション'}
                  {post.category === 'tip' && 'ヒント・コツ'}
                  {post.category === 'question' && '質問'}
                </span>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer">
                {post.title}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                投稿者: {post.author} • {post.lastActivity}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
              <span className="flex items-center">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                {post.replies} 件の返信
              </span>
              <span className="flex items-center">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                {post.likes} いいね
              </span>
            </div>
            <Button variant="outline" size="sm">
              返信
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function QAContent() {
  return (
    <div className="text-center py-12">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
        Q&A機能は準備中です
      </h3>
      <p className="text-gray-500 dark:text-gray-400">
        質問と回答機能は近日実装予定です。
      </p>
    </div>
  );
}

function ReviewsContent() {
  return (
    <div className="text-center py-12">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
        レビュー機能は準備中です
      </h3>
      <p className="text-gray-500 dark:text-gray-400">
        商品レビュー機能は近日実装予定です。
      </p>
    </div>
  );
}

function MessagesContent() {
  return (
    <div className="text-center py-12">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
        メッセージ機能は準備中です
      </h3>
      <p className="text-gray-500 dark:text-gray-400">
        プライベートメッセージ機能は近日実装予定です。
      </p>
    </div>
  );
}