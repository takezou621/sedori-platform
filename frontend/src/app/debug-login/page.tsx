'use client';

import { useState } from 'react';

const DEV_TEST_ACCOUNTS = [
  {
    id: 'test-user-1',
    name: 'テストユーザー1',
    email: 'devtest1@example.com',
    password: 'DevTest123!',
    description: 'E2Eテスト用基本アカウント'
  },
];

export default function DebugLoginPage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const addLog = (message: string) => {
    const timestamp = new Date().toISOString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const handleTestLogin = async () => {
    setIsLoading(true);
    setLogs([]);
    const account = DEV_TEST_ACCOUNTS[0];

    try {
      const baseUrl = 'http://localhost:3000';
      
      addLog(`Starting login attempt for: ${account.email}`);
      addLog(`Backend URL: ${baseUrl}`);
      
      const requestBody = {
        email: account.email,
        password: account.password,
      };
      
      addLog(`Request payload: ${JSON.stringify(requestBody)}`);
      
      addLog('Sending fetch request...');
      const response = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(requestBody),
      });
      
      addLog(`Response received - Status: ${response.status}`);
      addLog(`Response headers: ${JSON.stringify(Object.fromEntries(response.headers.entries()))}`);

      if (response.ok) {
        const data = await response.json();
        addLog(`✅ Login successful! Response: ${JSON.stringify(data)}`);
        
        if (data.accessToken) {
          localStorage.setItem('auth-token', data.accessToken);
          document.cookie = `auth_token=${data.accessToken}; path=/; max-age=604800; samesite=lax`;
          addLog('✅ Tokens saved to localStorage and cookie');
        } else {
          addLog('❌ No accessToken in response');
        }
      } else {
        const errorText = await response.text();
        addLog(`❌ Login failed - Status: ${response.status}`);
        addLog(`Error response: ${errorText}`);
      }
    } catch (error) {
      addLog(`❌ Network error: ${error instanceof Error ? error.message : String(error)}`);
      addLog(`Error type: ${typeof error}`);
      addLog(`Error stack: ${error instanceof Error ? error.stack : 'No stack trace'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow rounded-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            🔧 Dev Login Debug Page
          </h1>
          
          <div className="mb-6">
            <button
              onClick={handleTestLogin}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-md transition-colors"
            >
              {isLoading ? 'Testing Login...' : 'Test Login'}
            </button>
          </div>

          <div className="border rounded-lg p-4 bg-gray-50">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              Debug Logs:
            </h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {logs.length === 0 ? (
                <p className="text-gray-500 italic">No logs yet. Click "Test Login" to start.</p>
              ) : (
                logs.map((log, index) => (
                  <div key={index} className="text-sm font-mono text-gray-700 bg-white p-2 rounded border">
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-6 text-sm text-gray-600">
            <p><strong>Account being tested:</strong></p>
            <ul className="ml-4 mt-2">
              <li>Email: {DEV_TEST_ACCOUNTS[0].email}</li>
              <li>Password: {DEV_TEST_ACCOUNTS[0].password}</li>
              <li>Backend URL: http://localhost:3000</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}