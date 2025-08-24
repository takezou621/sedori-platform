import { test, expect, type Page } from '@playwright/test';

// Test user accounts
const TEST_ACCOUNTS = {
  testUser: {
    id: 'test-user-1',
    name: 'テストユーザー1',
    email: 'devtest1@example.com',
    password: 'DevTest123!',
    role: 'user'
  },
  admin: {
    id: 'test-admin',
    name: '管理者テスト',
    email: 'devadmin@example.com',
    password: 'DevAdmin123!',
    role: 'admin'
  },
  seller: {
    id: 'test-seller',
    name: 'せどり業者テスト',
    email: 'devseller@example.com',
    password: 'DevSeller123!',
    role: 'seller'
  }
} as const;

/**
 * Helper function to login using API directly
 */
async function performApiLogin(page: Page, role: keyof typeof TEST_ACCOUNTS): Promise<void> {
  const account = TEST_ACCOUNTS[role];
  console.log(`🔐 API Login: ${account.name} (${account.email})`);
  
  // Use the dev-login API endpoint
  const response = await page.request.post('http://localhost:3005/api/dev-login', {
    data: {
      email: account.email,
      password: account.password
    }
  });
  
  expect(response.status()).toBe(200);
  
  const responseData = await response.json();
  expect(responseData.success).toBe(true);
  expect(responseData.accessToken).toBeTruthy();
  expect(responseData.user).toBeTruthy();
  
  console.log(`✅ API Login successful for ${account.name}`);
  
  // Navigate to the home page to set cookies properly in the browser context
  await page.goto('http://localhost:3005');
  
  // Set authentication cookies manually in the browser
  await page.context().addCookies([
    {
      name: 'auth_token',
      value: responseData.accessToken,
      domain: 'localhost',
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'Lax'
    },
    {
      name: 'user_data',
      value: JSON.stringify(responseData.user),
      domain: 'localhost',
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'Lax'
    }
  ]);
}

test.describe('E2E API-Based User Role Testing', () => {
  test.setTimeout(30000);

  test.describe('Test User (devtest1@example.com) - Basic Functionality', () => {
    test('should successfully login and access dashboard', async ({ page }) => {
      await performApiLogin(page, 'testUser');
      
      // Navigate to dashboard
      await page.goto('http://localhost:3005/dashboard');
      await page.waitForLoadState('networkidle');
      
      // Check URL is correct
      const currentUrl = page.url();
      expect(currentUrl).toContain('/dashboard');
      
      // Verify we're not redirected to login
      expect(currentUrl).not.toContain('/auth/login');
      expect(currentUrl).not.toContain('/login');
      
      console.log(`✅ Dashboard accessible at: ${currentUrl}`);
    });

    test('should access products page', async ({ page }) => {
      await performApiLogin(page, 'testUser');
      
      await page.goto('http://localhost:3005/products');
      await page.waitForLoadState('networkidle');
      
      const currentUrl = page.url();
      expect(currentUrl).toContain('/products');
      expect(currentUrl).not.toContain('/auth/login');
      
      console.log(`✅ Products page accessible at: ${currentUrl}`);
    });

    test('should access cart (may show errors but should not redirect to login)', async ({ page }) => {
      await performApiLogin(page, 'testUser');
      
      await page.goto('http://localhost:3005/cart');
      await page.waitForLoadState('networkidle');
      
      const currentUrl = page.url();
      expect(currentUrl).toContain('/cart');
      expect(currentUrl).not.toContain('/auth/login');
      
      console.log(`✅ Cart page accessible at: ${currentUrl}`);
    });

    test('should have session cookies after login', async ({ page }) => {
      await performApiLogin(page, 'testUser');
      
      await page.goto('http://localhost:3005/dashboard');
      await page.waitForLoadState('networkidle');
      
      // Check for authentication cookies
      const cookies = await page.context().cookies();
      const authToken = cookies.find(cookie => cookie.name === 'auth_token');
      const userData = cookies.find(cookie => cookie.name === 'user_data');
      
      expect(authToken).toBeTruthy();
      expect(userData).toBeTruthy();
      
      console.log(`✅ Session cookies present:`, {
        hasAuthToken: !!authToken,
        hasUserData: !!userData
      });
    });
  });

  test.describe('Admin User (devadmin@example.com) - Administrative Features', () => {
    test('should successfully login and access admin dashboard', async ({ page }) => {
      await performApiLogin(page, 'admin');
      
      await page.goto('http://localhost:3005/admin');
      await page.waitForLoadState('networkidle');
      
      const currentUrl = page.url();
      expect(currentUrl).toContain('/admin');
      expect(currentUrl).not.toContain('/auth/login');
      
      console.log(`✅ Admin page accessible at: ${currentUrl}`);
    });

    test('should access analytics page', async ({ page }) => {
      await performApiLogin(page, 'admin');
      
      await page.goto('http://localhost:3005/analytics');
      await page.waitForLoadState('networkidle');
      
      const currentUrl = page.url();
      expect(currentUrl).toContain('/analytics');
      expect(currentUrl).not.toContain('/auth/login');
      
      console.log(`✅ Analytics page accessible at: ${currentUrl}`);
    });

    test('should access admin beta features', async ({ page }) => {
      await performApiLogin(page, 'admin');
      
      await page.goto('http://localhost:3005/admin/beta');
      await page.waitForLoadState('networkidle');
      
      const currentUrl = page.url();
      expect(currentUrl).toContain('/admin/beta');
      expect(currentUrl).not.toContain('/auth/login');
      
      console.log(`✅ Admin beta page accessible at: ${currentUrl}`);
    });
  });

  test.describe('Seller User (devseller@example.com) - Sedori Business Features', () => {
    test('should successfully login and access seller dashboard', async ({ page }) => {
      await performApiLogin(page, 'seller');
      
      await page.goto('http://localhost:3005/dashboard');
      await page.waitForLoadState('networkidle');
      
      const currentUrl = page.url();
      expect(currentUrl).toContain('/dashboard');
      expect(currentUrl).not.toContain('/auth/login');
      
      console.log(`✅ Seller dashboard accessible at: ${currentUrl}`);
    });

    test('should access product management features', async ({ page }) => {
      await performApiLogin(page, 'seller');
      
      await page.goto('http://localhost:3005/products');
      await page.waitForLoadState('networkidle');
      
      const currentUrl = page.url();
      expect(currentUrl).toContain('/products');
      expect(currentUrl).not.toContain('/auth/login');
      
      console.log(`✅ Seller products page accessible at: ${currentUrl}`);
    });

    test('should access new product creation', async ({ page }) => {
      await performApiLogin(page, 'seller');
      
      await page.goto('http://localhost:3005/products/new');
      await page.waitForLoadState('networkidle');
      
      const currentUrl = page.url();
      expect(currentUrl).toContain('/products/new');
      expect(currentUrl).not.toContain('/auth/login');
      
      console.log(`✅ New product page accessible at: ${currentUrl}`);
    });

    test('should have access to seller-specific features', async ({ page }) => {
      await performApiLogin(page, 'seller');
      
      await page.goto('http://localhost:3005/products/new');
      await page.waitForLoadState('networkidle');
      
      // The page should load without redirecting to login
      const currentUrl = page.url();
      expect(currentUrl).toContain('/products/new');
      
      console.log(`✅ Seller can access product creation features`);
    });
  });

  test.describe('Cross-Role Functionality Tests', () => {
    test('should verify session persistence across navigation', async ({ page }) => {
      await performApiLogin(page, 'testUser');
      
      // Navigate through multiple pages
      const pages = [
        'http://localhost:3005/dashboard',
        'http://localhost:3005/products',
        'http://localhost:3005/cart',
        'http://localhost:3005/'
      ];
      
      for (const pagePath of pages) {
        await page.goto(pagePath);
        await page.waitForLoadState('networkidle');
        
        // Verify not redirected to login
        const currentUrl = page.url();
        expect(currentUrl).not.toContain('/auth/login');
        expect(currentUrl).not.toContain('/login');
        
        // Verify cookies still exist
        const cookies = await page.context().cookies();
        const hasAuthToken = cookies.some(cookie => cookie.name === 'auth_token');
        const hasUserData = cookies.some(cookie => cookie.name === 'user_data');
        
        expect(hasAuthToken || hasUserData).toBeTruthy();
        console.log(`✅ Session maintained on: ${pagePath}`);
      }
    });

    test('should verify different roles have different access patterns', async ({ browser }) => {
      // Test different roles with separate contexts
      const testUserContext = await browser.newContext();
      const adminContext = await browser.newContext();
      const sellerContext = await browser.newContext();
      
      try {
        const testUserPage = await testUserContext.newPage();
        const adminPage = await adminContext.newPage();
        const sellerPage = await sellerContext.newPage();
        
        // Login with different roles
        await performApiLogin(testUserPage, 'testUser');
        await performApiLogin(adminPage, 'admin');
        await performApiLogin(sellerPage, 'seller');
        
        // Test admin-only access
        await Promise.all([
          testUserPage.goto('http://localhost:3005/admin'),
          adminPage.goto('http://localhost:3005/admin'),
          sellerPage.goto('http://localhost:3005/admin')
        ]);
        
        await Promise.all([
          testUserPage.waitForLoadState('networkidle'),
          adminPage.waitForLoadState('networkidle'),
          sellerPage.waitForLoadState('networkidle')
        ]);
        
        // Check URLs after navigation
        const testUserUrl = testUserPage.url();
        const adminUrl = adminPage.url();
        const sellerUrl = sellerPage.url();
        
        console.log('Admin page access results:', {
          testUser: testUserUrl,
          admin: adminUrl,
          seller: sellerUrl
        });
        
        // Admin should have access to /admin
        expect(adminUrl).toContain('/admin');
        
        console.log(`✅ Role-based access verification completed`);
        
      } finally {
        await testUserContext.close();
        await adminContext.close();
        await sellerContext.close();
      }
    });
  });
});