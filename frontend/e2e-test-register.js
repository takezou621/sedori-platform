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

async function registerAccount(account) {
  try {
    console.log(`Registering ${account.name}...`);
    const response = await fetch('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(account),
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log(`✅ Successfully registered: ${account.email}`);
    } else {
      console.log(`❌ Failed to register ${account.email}:`, data.message || data.error);
    }
  } catch (error) {
    console.log(`❌ Error registering ${account.email}:`, error.message);
  }
}

async function main() {
  console.log('Registering E2E test accounts...');
  
  for (const account of accounts) {
    await registerAccount(account);
  }
  
  console.log('Registration complete!');
}

main().catch(console.error);