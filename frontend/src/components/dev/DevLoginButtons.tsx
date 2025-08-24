'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui';

const DEV_TEST_ACCOUNTS = [
  {
    id: 'test-user-1',
    name: 'テストユーザー1',
    email: 'devtest1@example.com',
    password: 'DevTest123!',
    description: 'E2Eテスト用基本アカウント'
  },
  {
    id: 'test-admin',
    name: '管理者テスト',
    email: 'devadmin@example.com',
    password: 'DevAdmin123!',
    description: '管理者権限テストアカウント'
  },
  {
    id: 'test-seller',
    name: 'せどり業者テスト',
    email: 'devseller@example.com',
    password: 'DevSeller123!',
    description: 'せどり業者向けテストアカウント'
  }
];

export function DevLoginButtons() {
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [showDevPanel, setShowDevPanel] = useState(false);
  const router = useRouter();

  // 開発モードでのみ表示
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  const handleDevLogin = async (account: typeof DEV_TEST_ACCOUNTS[0]) => {
    setIsLoading(account.id);
    
    try {
      console.log('Attempting login for:', account.email);
      const requestBody = {
        email: account.email,
        password: account.password,
      };
      console.log('Request payload:', requestBody);
      
      // Next.js API Route (プロキシ)を使用してCORS問題を回避
      const response = await fetch('/api/dev-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      
      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      if (response.ok) {
        const data = await response.json();
        console.log('Login response data:', data);
        
        // ログイン成功時にトークンを保存（必要に応じて）
        if (data.accessToken) {
          localStorage.setItem('auth-token', data.accessToken);
          console.log('Token saved to localStorage');
          console.log('Cookie should be set automatically by server');
        } else {
          console.error('No accessToken in response:', data);
        }
        
        console.log('Dev login successful for:', account.name);
        
        // ダッシュボードへリダイレクト
        window.location.href = '/dashboard';
      } else {
        const errorText = await response.text();
        console.error('Dev login failed with status:', response.status);
        console.error('Error response:', errorText);
        
        // アカウントが存在しない場合は自動登録
        const registerResponse = await fetch('/api/dev-register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: account.name,
            email: account.email,
            password: account.password,
          }),
        });

        if (registerResponse.ok) {
          const registerData = await registerResponse.json();
          
          // 登録成功時にトークンを保存
          if (registerData.accessToken) {
            localStorage.setItem('auth-token', registerData.accessToken);
            console.log('Registration token saved to localStorage');
            console.log('Cookie should be set automatically by server');
          }
          
          console.log('Dev account created and logged in:', account.name);
          window.location.href = '/dashboard';
        } else {
          console.error('Dev account creation failed:', await registerResponse.text());
          alert(`アカウントの作成に失敗しました: ${account.email}`);
        }
      }
    } catch (error) {
      console.error('Dev login error:', error);
      alert(`ログインエラーが発生しました: ${error}`);
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <div className="mt-8" data-testid="dev-login-panel">
      {/* 開発モード表示ボタン */}
      {!showDevPanel && (
        <div className="text-center">
          <button
            onClick={() => setShowDevPanel(true)}
            className="text-xs text-secondary-500 hover:text-secondary-700 transition-colors px-2 py-1 rounded border border-dashed border-secondary-300 hover:border-secondary-400"
            data-testid="show-dev-panel"
          >
            🔧 E2Eテスト用ログイン (開発モード)
          </button>
        </div>
      )}

      {/* 開発モード用ログインパネル */}
      {showDevPanel && (
        <div className="mt-4 p-4 bg-yellow-50 border-2 border-dashed border-yellow-300 rounded-lg">
          <div className="text-center mb-4">
            <h3 className="text-lg font-semibold text-yellow-800 mb-1">
              🧪 E2Eテスト用ワンクリックログイン
            </h3>
            <p className="text-sm text-yellow-700">
              開発環境でのみ表示されます。テスト用アカウントで即座にログインできます。
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            {DEV_TEST_ACCOUNTS.map((account) => (
              <div 
                key={account.id}
                className="p-3 bg-white rounded-md border border-yellow-200"
              >
                <div className="mb-2">
                  <h4 className="text-sm font-medium text-secondary-900">
                    {account.name}
                  </h4>
                  <p className="text-xs text-secondary-600">
                    {account.description}
                  </p>
                  <p className="text-xs text-secondary-500 mt-1">
                    {account.email}
                  </p>
                </div>
                <Button
                  size="sm"
                  className="w-full"
                  disabled={isLoading !== null}
                  onClick={() => handleDevLogin(account)}
                  data-testid={`dev-login-${account.id}`}
                >
                  {isLoading === account.id ? (
                    <>
                      <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      ログイン中...
                    </>
                  ) : (
                    <>
                      🚀 ログイン
                    </>
                  )}
                </Button>
              </div>
            ))}
          </div>

          <div className="text-center">
            <button
              onClick={() => setShowDevPanel(false)}
              className="text-xs text-yellow-700 hover:text-yellow-900 transition-colors"
              data-testid="hide-dev-panel"
            >
              ✕ パネルを閉じる
            </button>
          </div>

          {/* E2Eテスト用の追加情報 */}
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <h4 className="text-sm font-medium text-blue-800 mb-2">
              📝 E2Eテスト実行時の注意事項
            </h4>
            <ul className="text-xs text-blue-700 space-y-1">
              <li>• これらのアカウントはテスト用のため、実際のデータは含まれていません</li>
              <li>• ログイン後は自動的にダッシュボードにリダイレクトされます</li>
              <li>• 本番環境ではこのパネルは表示されません</li>
              <li>• アカウントが存在しない場合は自動的に作成されます</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}