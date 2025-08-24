#!/usr/bin/env node

const accounts = [
  {
    name: 'テストユーザー1',
    email: 'devtest1@example.com',
    password: 'DevTest123!'
  },
  {
    name: '管理者テスト',
    email: 'devadmin@example.com',
    password: 'DevAdmin123!'
  },
  {
    name: 'せどり業者テスト',
    email: 'devseller@example.com',
    password: 'DevSeller123!'
  }
];

async function testLogin(account) {
  try {
    console.log(`Testing login for ${account.name}...`);
    const response = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: account.email,
        password: account.password
      }),
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log(`✅ Successfully logged in: ${account.email}`, {
        hasToken: !!data.accessToken,
        hasUser: !!data.user,
        userId: data.user?.id
      });
    } else {
      console.log(`❌ Failed to login ${account.email}:`, data.message || data.error);
    }
  } catch (error) {
    console.log(`❌ Error logging in ${account.email}:`, error.message);
  }
}

async function main() {
  console.log('Testing E2E account logins...');
  
  for (const account of accounts) {
    await testLogin(account);
  }
  
  console.log('Login test complete!');
}

main().catch(console.error);