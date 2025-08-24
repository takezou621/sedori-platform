'use client';

import Link from 'next/link';
import { Button } from '@/components/ui';
import { DevLoginButtons } from '@/components/dev/DevLoginButtons';

export default function Home() {
  return (
    <div className="bg-gradient-to-b from-white to-secondary-50">
      {/* Hero Section */}
      <div className="mx-auto max-w-7xl px-4 py-16 sm:py-24 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-secondary-900 sm:text-5xl md:text-6xl">
            <span className="block">Welcome to</span>
            <span className="block text-primary-600">Sedori Platform</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-secondary-600">
            せどり・転売ビジネスを成功に導く統合プラットフォーム。商品分析、利益計算、在庫管理から競合価格調査まで、
            あなたのビジネス成長を支援する全ての機能を提供します。
          </p>
          <div className="mx-auto mt-8 max-w-md sm:flex sm:max-w-lg sm:justify-center">
            <div className="rounded-md shadow sm:ml-3">
              <Link href="/register">
                <Button size="lg" className="w-full sm:w-auto">
                  Get started for free
                </Button>
              </Link>
            </div>
            <div className="mt-3 rounded-md shadow sm:ml-3 sm:mt-0">
              <Link href="/login">
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  Sign in
                </Button>
              </Link>
            </div>
          </div>

          {/* Development Mode E2E Test Login Buttons */}
          <DevLoginButtons />
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-white py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-secondary-900 sm:text-4xl">
              Everything you need to succeed
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-secondary-600">
              Powerful features to help you manage your business efficiently
            </p>
          </div>

          <div className="mt-16">
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {/* Feature 1 */}
              <div className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-primary-100">
                  <svg
                    className="h-6 w-6 text-primary-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                    />
                  </svg>
                </div>
                <h3 className="mt-4 text-lg font-medium text-secondary-900">
                  商品管理・在庫分析
                </h3>
                <p className="mt-2 text-base text-secondary-600">
                  在庫管理、商品パフォーマンス追跡、利益率分析で最適な仕入れ戦略を実現
                </p>
              </div>

              {/* Feature 2 */}
              <div className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-primary-100">
                  <svg
                    className="h-6 w-6 text-primary-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                </div>
                <h3 className="mt-4 text-lg font-medium text-secondary-900">
                  売上・利益分析
                </h3>
                <p className="mt-2 text-base text-secondary-600">
                  詳細な売上分析とROI計算で収益性を最大化。競合価格とのギャップ分析も対応
                </p>
              </div>

              {/* Feature 3 */}
              <div className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-primary-100">
                  <svg
                    className="h-6 w-6 text-primary-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                </div>
                <h3 className="mt-4 text-lg font-medium text-secondary-900">
                  AIマーケット分析
                </h3>
                <p className="mt-2 text-base text-secondary-600">
                  Amazon・楽天・メルカリの価格動向を自動分析。最適な仕入れタイミングをAIが提案
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
