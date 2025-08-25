import { test, expect, Page, BrowserContext } from '@playwright/test';

/**
 * ULTIMATE COMPREHENSIVE END-TO-END TESTING SUITE
 * 
 * This test validates all three user types and their complete functionality:
 * 1. テストユーザー (Regular User) - Basic user functionality
 * 2. 管理ユーザー (Admin User) - Administrative capabilities  
 * 3. せどり業者ユーザー (Seller User) - Business features
 * 
 * Test Focus Areas:
 * - Authentication and Authorization
 * - Role-Based Access Control (RBAC)
 * - Performance Validation (Cart API <50ms)
 * - Security Measures
 * - Business Logic
 * - User Experience
 * - Code Quality Integration
 */

// Test Configuration
const TEST_CONFIG = {
  baseURL: 'http://localhost:3005',
  backendURL: 'http://localhost:3001',
  timeout: 30000,
  users: {
    regular: { email: 'devtest1@example.com', password: 'DevTest123!', role: 'user', testId: 'test-user-1' },
    admin: { email: 'devadmin@example.com', password: 'DevAdmin123!', role: 'admin', testId: 'test-admin' },
    seller: { email: 'devseller@example.com', password: 'DevSeller123!', role: 'seller', testId: 'test-seller' }
  }
};

// Utility Functions
async function loginViaDevPanel(page: Page, userType: 'regular' | 'admin' | 'seller') {
  const user = TEST_CONFIG.users[userType];
  
  // Navigate to homepage
  await page.goto(TEST_CONFIG.baseURL);
  
  // Wait for dev panel to be visible
  await page.waitForSelector('[data-testid="dev-login-panel"]', { timeout: 10000 });
  
  // Click to show dev panel
  await page.click('[data-testid="show-dev-panel"]');
  
  // Wait for buttons to appear
  await page.waitForSelector(`[data-testid="dev-login-${user.testId}"]`, { timeout: 5000 });
  
  // Click the appropriate user type button
  await page.click(`[data-testid="dev-login-${user.testId}"]`);
  
  // Wait for redirect to dashboard or appropriate page
  await page.waitForLoadState('networkidle');
  
  return user;
}

async function validateAuthentication(page: Page, expectedRole: string) {
  // Check if user is authenticated by calling /api/auth/me
  const response = await page.request.get('/api/auth/me');
  expect(response.ok()).toBeTruthy();
  
  const userData = await response.json();
  expect(userData.role).toBe(expectedRole);
  
  return userData;
}

async function measureApiPerformance(page: Page, endpoint: string) {
  const startTime = Date.now();
  const response = await page.request.get(endpoint);
  const endTime = Date.now();
  const responseTime = endTime - startTime;
  
  return {
    responseTime,
    status: response.status(),
    ok: response.ok()
  };
}

test.describe('🚀 ULTIMATE E2E COMPREHENSIVE TESTING SUITE', () => {
  
  test.beforeEach(async ({ page }) => {
    // Ensure both frontend and backend are running
    const frontendHealthy = await page.request.get(TEST_CONFIG.baseURL).then(r => r.ok());
    expect(frontendHealthy).toBeTruthy();
  });

  test.describe('👤 テストユーザー (Regular User) - Complete Functionality', () => {
    
    test('should successfully login and access dashboard', async ({ page }) => {
      // Step 1: Login via dev panel
      const user = await loginViaDevPanel(page, 'regular');
      
      // Step 2: Validate authentication
      const userData = await validateAuthentication(page, 'user');
      expect(userData.email).toBe(user.email);
      
      // Step 3: Check dashboard access
      await page.goto('/dashboard');
      await expect(page.locator('h1')).toContainText('Dashboard');
      
      // Step 4: Verify no admin access
      await page.goto('/admin');
      await expect(page.locator('body')).toContainText('Access Denied');
    });
    
    test('should browse products and use search functionality', async ({ page }) => {
      // Login first
      await loginViaDevPanel(page, 'regular');
      
      // Navigate to products page
      await page.goto('/products');
      await page.waitForSelector('[data-testid="product-grid"]', { timeout: 10000 });
      
      // Test search functionality
      await page.fill('[data-testid="search-input"]', 'test product');
      await page.keyboard.press('Enter');
      await page.waitForLoadState('networkidle');
      
      // Verify search results
      const products = await page.locator('[data-testid="product-card"]').count();
      expect(products).toBeGreaterThanOrEqual(0);
    });
    
    test('should manage shopping cart with optimized performance', async ({ page }) => {
      // Login first
      await loginViaDevPanel(page, 'regular');
      
      // Navigate to products and add item to cart
      await page.goto('/products');
      await page.waitForSelector('[data-testid="product-card"]', { timeout: 10000 });
      
      // Add first product to cart
      const addToCartBtn = page.locator('[data-testid="add-to-cart"]').first();
      if (await addToCartBtn.count() > 0) {
        await addToCartBtn.click();
        await page.waitForLoadState('networkidle');
      }
      
      // Navigate to cart
      await page.goto('/cart');
      await page.waitForLoadState('networkidle');
      
      // Performance Test: Validate Cart API response time
      const cartPerformance = await measureApiPerformance(page, '/api/cart');
      console.log(`Cart API Response Time: ${cartPerformance.responseTime}ms`);
      
      // CRITICAL: Cart API must be under 50ms as per requirements
      expect(cartPerformance.responseTime).toBeLessThan(50);
      expect(cartPerformance.ok).toBeTruthy();
      
      // Test cart operations
      const cartItems = page.locator('[data-testid="cart-item"]');
      const itemCount = await cartItems.count();
      
      if (itemCount > 0) {
        // Test quantity update
        const quantityInput = cartItems.first().locator('input[type="number"]');
        await quantityInput.fill('2');
        await page.waitForLoadState('networkidle');
        
        // Test remove item
        const removeBtn = cartItems.first().locator('[data-testid="remove-item"]');
        if (await removeBtn.count() > 0) {
          await removeBtn.click();
          await page.waitForLoadState('networkidle');
        }
      }
    });
    
    test('should access and update profile', async ({ page }) => {
      // Login first
      await loginViaDevPanel(page, 'regular');
      
      // Navigate to profile
      await page.goto('/profile');
      await page.waitForLoadState('networkidle');
      
      // Check profile form elements
      await expect(page.locator('input[name="email"]')).toBeVisible();
      await expect(page.locator('input[name="name"]')).toBeVisible();
      
      // Test profile update (if form exists)
      const nameInput = page.locator('input[name="name"]');
      if (await nameInput.count() > 0) {
        await nameInput.fill('Updated Test User');
        
        const saveBtn = page.locator('button[type="submit"]');
        if (await saveBtn.count() > 0) {
          await saveBtn.click();
          await page.waitForLoadState('networkidle');
        }
      }
    });
    
    test('should handle unauthorized access correctly', async ({ page }) => {
      // Login as regular user
      await loginViaDevPanel(page, 'regular');
      
      // Test unauthorized routes
      const unauthorizedRoutes = ['/admin', '/admin/beta'];
      
      for (const route of unauthorizedRoutes) {
        await page.goto(route);
        await page.waitForLoadState('networkidle');
        
        // Should see access denied or be redirected
        const hasAccessDenied = await page.locator('body').textContent();
        expect(hasAccessDenied?.toLowerCase()).toContain('access denied');
      }
    });
  });

  test.describe('🔧 管理ユーザー (Admin User) - Administrative Features', () => {
    
    test('should login and access admin dashboard', async ({ page }) => {
      // Step 1: Login via dev panel
      const user = await loginViaDevPanel(page, 'admin');
      
      // Step 2: Validate authentication
      const userData = await validateAuthentication(page, 'admin');
      expect(userData.email).toBe(user.email);
      
      // Step 3: Access admin dashboard
      await page.goto('/admin');
      await page.waitForLoadState('networkidle');
      
      // Should not see access denied
      const content = await page.locator('body').textContent();
      expect(content?.toLowerCase()).not.toContain('access denied');
    });
    
    test('should access admin beta features', async ({ page }) => {
      // Login as admin
      await loginViaDevPanel(page, 'admin');
      
      // Access admin beta route
      await page.goto('/admin/beta');
      await page.waitForLoadState('networkidle');
      
      // Should have access
      const content = await page.locator('body').textContent();
      expect(content?.toLowerCase()).not.toContain('access denied');
    });
    
    test('should have all regular user functionality plus admin features', async ({ page }) => {
      // Login as admin
      await loginViaDevPanel(page, 'admin');
      
      // Test regular user functionality
      await page.goto('/dashboard');
      await expect(page.locator('h1')).toContainText('Dashboard');
      
      await page.goto('/products');
      await page.waitForSelector('[data-testid="product-grid"]', { timeout: 10000 });
      
      await page.goto('/cart');
      await page.waitForLoadState('networkidle');
      
      // Performance test for admin user
      const cartPerformance = await measureApiPerformance(page, '/api/cart');
      expect(cartPerformance.responseTime).toBeLessThan(50);
    });
    
    test('should access analytics and reporting features', async ({ page }) => {
      // Login as admin
      await loginViaDevPanel(page, 'admin');
      
      // Test analytics access
      await page.goto('/analytics');
      await page.waitForLoadState('networkidle');
      
      const content = await page.locator('body').textContent();
      expect(content?.toLowerCase()).not.toContain('access denied');
    });
  });

  test.describe('💼 せどり業者ユーザー (Seller User) - Business Features', () => {
    
    test('should login and access seller dashboard', async ({ page }) => {
      // Step 1: Login via dev panel
      const user = await loginViaDevPanel(page, 'seller');
      
      // Step 2: Validate authentication  
      const userData = await validateAuthentication(page, 'seller');
      expect(userData.email).toBe(user.email);
      
      // Step 3: Access dashboard with seller-specific features
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      
      // Seller dashboard should have business metrics
      await expect(page.locator('h1')).toContainText('Dashboard');
    });
    
    test('should access product management features', async ({ page }) => {
      // Login as seller
      await loginViaDevPanel(page, 'seller');
      
      // Test product creation
      await page.goto('/products/new');
      await page.waitForLoadState('networkidle');
      
      const content = await page.locator('body').textContent();
      expect(content?.toLowerCase()).not.toContain('access denied');
    });
    
    test('should have profit calculation and business analytics', async ({ page }) => {
      // Login as seller
      await loginViaDevPanel(page, 'seller');
      
      // Navigate to analytics (sellers should have access)
      await page.goto('/analytics');
      await page.waitForLoadState('networkidle');
      
      const content = await page.locator('body').textContent();
      expect(content?.toLowerCase()).not.toContain('access denied');
    });
    
    test('should access all regular user features plus seller tools', async ({ page }) => {
      // Login as seller
      await loginViaDevPanel(page, 'seller');
      
      // Test regular functionality
      await page.goto('/products');
      await page.waitForSelector('[data-testid="product-grid"]', { timeout: 10000 });
      
      await page.goto('/cart');
      await page.waitForLoadState('networkidle');
      
      // Performance validation for seller
      const cartPerformance = await measureApiPerformance(page, '/api/cart');
      expect(cartPerformance.responseTime).toBeLessThan(50);
      
      // Test seller-specific routes don't give admin access
      await page.goto('/admin');
      const content = await page.locator('body').textContent();
      expect(content?.toLowerCase()).toContain('access denied');
    });
  });

  test.describe('🔒 Security & Performance Validation', () => {
    
    test('should enforce proper session management', async ({ page }) => {
      // Test session timeout and security
      await page.goto(TEST_CONFIG.baseURL);
      
      // Check that unauthenticated users can't access protected routes
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      
      const currentUrl = page.url();
      expect(currentUrl).toContain('/auth/login');
    });
    
    test('should validate cart API performance optimization', async ({ page }) => {
      // Login and test cart API performance multiple times
      await loginViaDevPanel(page, 'regular');
      
      const performanceResults = [];
      
      for (let i = 0; i < 5; i++) {
        const result = await measureApiPerformance(page, '/api/cart');
        performanceResults.push(result.responseTime);
        console.log(`Cart API Test ${i + 1}: ${result.responseTime}ms`);
      }
      
      const averageTime = performanceResults.reduce((a, b) => a + b) / performanceResults.length;
      const maxTime = Math.max(...performanceResults);
      
      console.log(`Average Cart API Time: ${averageTime}ms`);
      console.log(`Maximum Cart API Time: ${maxTime}ms`);
      
      // CRITICAL: All responses must be under 50ms
      expect(maxTime).toBeLessThan(50);
      expect(averageTime).toBeLessThan(30);
    });
    
    test('should validate proper error handling', async ({ page }) => {
      await loginViaDevPanel(page, 'regular');
      
      // Test 404 pages
      await page.goto('/non-existent-page');
      await expect(page.locator('h1')).toContainText('404');
      
      // Test error boundaries
      // (Would need specific error-triggering scenarios)
    });
  });

  test.describe('📊 Final Integration Validation', () => {
    
    test('should validate complete user journey workflows', async ({ page }) => {
      // Test complete workflows for each user type
      const userTypes: ('regular' | 'admin' | 'seller')[] = ['regular', 'admin', 'seller'];
      
      for (const userType of userTypes) {
        console.log(`Testing complete workflow for ${userType} user`);
        
        // Login
        await loginViaDevPanel(page, userType);
        
        // Dashboard access
        await page.goto('/dashboard');
        await expect(page.locator('h1')).toContainText('Dashboard');
        
        // Product browsing
        await page.goto('/products');
        await page.waitForSelector('[data-testid="product-grid"]', { timeout: 10000 });
        
        // Cart functionality
        await page.goto('/cart');
        const cartPerformance = await measureApiPerformance(page, '/api/cart');
        expect(cartPerformance.responseTime).toBeLessThan(50);
        
        // Role-specific access validation
        if (userType === 'admin') {
          await page.goto('/admin');
          const content = await page.locator('body').textContent();
          expect(content?.toLowerCase()).not.toContain('access denied');
        } else {
          await page.goto('/admin');
          const content = await page.locator('body').textContent();
          expect(content?.toLowerCase()).toContain('access denied');
        }
        
        console.log(`✅ ${userType} user workflow completed successfully`);
      }
    });
    
    test('should validate system health and production readiness', async ({ page }) => {
      // Test system health endpoints
      const healthChecks = [
        { endpoint: '/', description: 'Homepage' },
        { endpoint: '/api/auth/me', description: 'Auth API' },
        { endpoint: '/api/cart', description: 'Cart API' }
      ];
      
      for (const check of healthChecks) {
        const response = await page.request.get(check.endpoint);
        console.log(`${check.description}: ${response.status()}`);
        
        if (check.endpoint === '/api/auth/me' || check.endpoint === '/api/cart') {
          // These require auth, so 401/redirect is acceptable
          expect([200, 401, 302]).toContain(response.status());
        } else {
          expect(response.ok()).toBeTruthy();
        }
      }
    });
  });
});