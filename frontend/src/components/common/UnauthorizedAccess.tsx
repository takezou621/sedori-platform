'use client';

import Link from 'next/link';
import { Button } from '@/components/ui';

interface UnauthorizedAccessProps {
  title?: string;
  message?: string;
  showLoginButton?: boolean;
  redirectPath?: string;
}

export function UnauthorizedAccess({
  title = 'アクセス権限がありません',
  message = 'このページにアクセスする権限がありません。管理者にお問い合わせください。',
  showLoginButton = false,
  redirectPath = '/dashboard'
}: UnauthorizedAccessProps) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="text-center">
        <div className="mx-auto w-24 h-24 flex items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
          <svg
            className="w-12 h-12 text-red-600 dark:text-red-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636 5.636 18.364"
            />
          </svg>
        </div>
        
        <h1 className="mt-6 text-2xl font-bold text-gray-900 dark:text-gray-100">
          {title}
        </h1>
        
        <p className="mt-4 text-gray-600 dark:text-gray-400 max-w-md mx-auto">
          {message}
        </p>
        
        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <Link href={redirectPath}>
            <Button variant="outline">
              ダッシュボードに戻る
            </Button>
          </Link>
          
          {showLoginButton && (
            <Link href="/auth/login">
              <Button>
                ログイン
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

// Pre-configured components for specific scenarios
export function AdminOnlyAccess() {
  return (
    <UnauthorizedAccess
      title="管理者専用ページ"
      message="このページは管理者のみがアクセスできます。"
    />
  );
}

export function SellerOnlyAccess() {
  return (
    <UnauthorizedAccess
      title="販売者専用ページ"
      message="このページは販売者のみがアクセスできます。"
    />
  );
}

export function LoginRequired() {
  return (
    <UnauthorizedAccess
      title="ログインが必要です"
      message="このページを表示するにはログインが必要です。"
      showLoginButton={true}
    />
  );
}