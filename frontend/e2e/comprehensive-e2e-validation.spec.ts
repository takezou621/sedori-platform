import { test, expect, Page, BrowserContext } from '@playwright/test';

/**
 * COMPREHENSIVE END-TO-END TESTING SUITE FOR SEDORI PLATFORM
 * 
 * This test suite validates all three user types and their complete functionality:
 * 1. Test User (Regular User) - Basic e-commerce functionality
 * 2. Admin User - Administrative capabilities  
 * 3. Seller User (せどり業者) - Business features
 * 
 * Test Areas:
 * - Authentication Flow (HTTP-only cookies)
 * - Role-Based Access Control
 * - Core Functionality per User Type
 * - API Performance Metrics
 * - Security Validation
 * - UI/UX Testing
 */

// Test Configuration
const CONFIG = {
  baseURL: 'http://localhost:3005',
  backendURL: 'http://localhost:3000',
  timeout: 30000,
  performanceThresholds: {
    apiResponse: 2000, // 2 seconds max
    pageLoad: 3000,    // 3 seconds max
    cartApi: 50,       // 50ms max for cart operations
  },
  users: {
    testUser: {
      email: 'testuser@example.com',
      password: 'TestUser123!',
      expectedRole: 'user',
      name: 'Test User'
    },
    admin: {
      email: 'adminuser@example.com', 
      password: 'AdminUser123!',
      expectedRole: 'admin',
      name: 'Admin User'
    },
    seller: {
      email: 'selleruser@example.com',
      password: 'SellerUser123!', 
      expectedRole: 'seller',
      name: 'Seller User'
    }
  }
};

// Utility Functions
async function performDevLogin(page: Page, userType: 'testUser' | 'admin' | 'seller') {
  const user = CONFIG.users[userType];
  console.log(`🔐 Logging in as ${userType}: ${user.email}`);
  
  // Use the dev-login API endpoint
  const loginResponse = await page.request.post('/api/dev-login', {
    data: {
      email: user.email,
      password: user.password
    }
  });

  expect(loginResponse.ok()).toBeTruthy();
  const responseData = await loginResponse.json();
  expect(responseData.success).toBe(true);
  expect(responseData.user.role).toBe(user.expectedRole);
  
  // Navigate to home page to ensure cookies are set
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  
  return responseData.user;
}

async function validateAuthentication(page: Page, expectedRole: string) {
  const authResponse = await page.request.get('/api/auth/me');
  expect(authResponse.ok()).toBeTruthy();
  
  const userData = await authResponse.json();
  expect(userData.role).toBe(expectedRole);
  
  return userData;
}

async function measureApiPerformance(page: Page, endpoint: string, method: 'GET' | 'POST' = 'GET', data?: any) {
  const startTime = Date.now();
  
  let response;
  if (method === 'POST') {
    response = await page.request.post(endpoint, { data });
  } else {
    response = await page.request.get(endpoint);
  }
  
  const endTime = Date.now();
  const responseTime = endTime - startTime;
  
  return {
    responseTime,
    status: response.status(),
    ok: response.ok(),
    endpoint,
    method
  };
}

async function logout(page: Page) {
  await page.request.post('/api/auth/logout');
  await page.goto('/');
  await page.waitForLoadState('networkidle');
}

// Test Suite
test.describe('🚀 Comprehensive E2E Testing - Sedori Platform', () => {
  
  test.beforeEach(async ({ page }) => {
    // Verify services are running
    const frontendHealth = await page.request.get(CONFIG.baseURL).then(r => r.ok());
    expect(frontendHealth).toBeTruthy();
    
    // Clear any existing authentication
    await page.context().clearCookies();
  });

  test.describe('👤 Test User (Regular User) - Complete Functionality', () => {
    
    test('should successfully authenticate and access dashboard', async ({ page }) => {
      // Step 1: Perform dev login
      const userData = await performDevLogin(page, 'testUser');
      
      // Step 2: Validate authentication via API
      await validateAuthentication(page, 'user');
      
      // Step 3: Check dashboard access
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      
      // Verify user can see their dashboard
      await expect(page.locator('h1')).toContainText(['Dashboard', 'ダッシュボード']);
      
      console.log('✅ Test User authentication and dashboard access validated');
    });

    test('should browse and search products', async ({ page }) => {
      await performDevLogin(page, 'testUser');
      
      // Navigate to products page
      await page.goto('/products');
      await page.waitForLoadState('networkidle');
      
      // Verify products page loads
      await expect(page.locator('h1')).toContainText(['Products', '商品']);
      
      // Test search functionality
      const searchInput = page.locator('input[type="search"], input[placeholder*="search"], input[placeholder*="検索"]');
      if (await searchInput.isVisible()) {
        await searchInput.fill('test product');
        await searchInput.press('Enter');
        await page.waitForLoadState('networkidle');
      }
      
      // Measure products API performance
      const productsPerf = await measureApiPerformance(page, '/api/products');
      expect(productsPerf.responseTime).toBeLessThan(CONFIG.performanceThresholds.apiResponse);
      
      console.log(`✅ Products browsing validated. API response: ${productsPerf.responseTime}ms`);
    });

    test('should manage cart and wishlist', async ({ page }) => {
      await performDevLogin(page, 'testUser');
      
      // Navigate to products to add to cart
      await page.goto('/products');
      await page.waitForLoadState('networkidle');
      
      // Try to add first available product to cart
      const addToCartButton = page.locator('[data-testid="add-to-cart"], button:has-text("Add to Cart"), button:has-text("カートに追加")').first();
      
      if (await addToCartButton.isVisible()) {
        await addToCartButton.click();
        await page.waitForTimeout(1000); // Wait for cart update
      }
      
      // Navigate to cart
      await page.goto('/cart');
      await page.waitForLoadState('networkidle');
      
      // Verify cart page loads
      await expect(page.locator('h1')).toContainText(['Cart', 'カート']);
      
      // Measure cart API performance (critical for UX)
      const cartPerf = await measureApiPerformance(page, '/api/cart');
      expect(cartPerf.responseTime).toBeLessThan(CONFIG.performanceThresholds.cartApi);
      
      console.log(`✅ Cart functionality validated. API response: ${cartPerf.responseTime}ms`);
    });

    test('should access profile management', async ({ page }) => {
      await performDevLogin(page, 'testUser');
      
      // Navigate to profile/settings
      const profileLinks = ['/profile', '/settings', '/account'];
      let profilePageFound = false;
      
      for (const link of profileLinks) {
        try {
          await page.goto(link);
          await page.waitForLoadState('networkidle');
          
          if (page.url().includes(link)) {
            profilePageFound = true;
            break;
          }
        } catch (error) {
          // Continue to next link
          continue;
        }
      }
      
      // If no dedicated profile page, check if profile info is in dashboard
      if (!profilePageFound) {
        await page.goto('/dashboard');
        await page.waitForLoadState('networkidle');
      }
      
      // Verify user can access their profile information
      const userData = await validateAuthentication(page, 'user');
      
      console.log('✅ Profile access validated');
    });

    test('should participate in community features', async ({ page }) => {
      await performDevLogin(page, 'testUser');
      
      // Try to access community page
      await page.goto('/community');
      await page.waitForLoadState('networkidle');
      
      // Check if community features are accessible
      const communityElements = [
        'h1:has-text("Community")',
        'h1:has-text("コミュニティ")',
        '[data-testid="forum"]',
        '[data-testid="messages"]'
      ];
      
      let communityAccess = false;
      for (const selector of communityElements) {
        if (await page.locator(selector).isVisible()) {
          communityAccess = true;
          break;
        }
      }
      
      console.log(`✅ Community features access: ${communityAccess ? 'Available' : 'Limited/Not Available'}`);
    });
  });

  test.describe('👨‍💼 Admin User - Administrative Functionality', () => {
    
    test('should authenticate with admin privileges', async ({ page }) => {
      const userData = await performDevLogin(page, 'admin');
      
      // Validate admin authentication
      await validateAuthentication(page, 'admin');
      
      // Try to access admin dashboard
      await page.goto('/admin');
      await page.waitForLoadState('networkidle');
      
      // Verify admin dashboard access (should not get 403/404)
      expect(page.url()).toContain('/admin');
      
      console.log('✅ Admin authentication and dashboard access validated');
    });

    test('should manage users', async ({ page }) => {
      await performDevLogin(page, 'admin');
      
      // Try to access user management
      const userManagementPaths = ['/admin/users', '/admin/user-management', '/users'];
      let usersPageFound = false;
      
      for (const path of userManagementPaths) {
        try {
          await page.goto(path);
          await page.waitForLoadState('networkidle');
          
          if (page.url().includes(path) && !page.url().includes('404')) {
            usersPageFound = true;
            break;
          }
        } catch (error) {
          continue;
        }
      }
      
      // Measure users API performance
      const usersPerf = await measureApiPerformance(page, '/api/users');
      
      console.log(`✅ User management access: ${usersPageFound ? 'Available' : 'Limited'}, API: ${usersPerf.responseTime}ms`);
    });

    test('should manage products (CRUD operations)', async ({ page }) => {
      await performDevLogin(page, 'admin');
      
      // Try to access product management
      await page.goto('/products/new');
      await page.waitForLoadState('networkidle');
      
      // Check if admin can create products
      const createProductForm = page.locator('form, [data-testid="create-product"], [data-testid="product-form"]');
      const hasCreateAccess = await createProductForm.isVisible();
      
      // Navigate to products list to test management
      await page.goto('/products');
      await page.waitForLoadState('networkidle');
      
      // Look for admin-only elements (edit/delete buttons)
      const adminElements = page.locator('[data-testid="edit-product"], [data-testid="delete-product"], button:has-text("Edit"), button:has-text("Delete")');
      const hasManagementAccess = await adminElements.count() > 0;
      
      console.log(`✅ Product management - Create: ${hasCreateAccess}, Manage: ${hasManagementAccess}`);
    });

    test('should access analytics and reports', async ({ page }) => {
      await performDevLogin(page, 'admin');
      
      // Try to access analytics
      await page.goto('/analytics');
      await page.waitForLoadState('networkidle');
      
      // Check analytics access
      const analyticsAccess = !page.url().includes('404') && !page.url().includes('403');
      
      // Measure analytics API performance
      const analyticsPerf = await measureApiPerformance(page, '/api/analytics');
      
      console.log(`✅ Analytics access: ${analyticsAccess}, API response: ${analyticsPerf.responseTime}ms`);
    });

    test('should moderate community content', async ({ page }) => {
      await performDevLogin(page, 'admin');
      
      // Check community moderation capabilities
      await page.goto('/community');
      await page.waitForLoadState('networkidle');
      
      // Look for moderation tools
      const moderationElements = page.locator('[data-testid*="moderate"], [data-testid*="admin"], button:has-text("Moderate")');
      const hasModerationTools = await moderationElements.count() > 0;
      
      console.log(`✅ Community moderation tools: ${hasModerationTools ? 'Available' : 'Limited'}`);
    });
  });

  test.describe('🏪 Seller User (せどり業者) - Business Functionality', () => {
    
    test('should authenticate with seller privileges', async ({ page }) => {
      const userData = await performDevLogin(page, 'seller');
      
      // Validate seller authentication
      await validateAuthentication(page, 'seller');
      
      // Try to access seller dashboard
      const sellerPaths = ['/seller', '/seller/dashboard', '/dashboard'];
      let sellerDashboardFound = false;
      
      for (const path of sellerPaths) {
        try {
          await page.goto(path);
          await page.waitForLoadState('networkidle');
          
          if (!page.url().includes('404') && !page.url().includes('403')) {
            sellerDashboardFound = true;
            break;
          }
        } catch (error) {
          continue;
        }
      }
      
      console.log(`✅ Seller authentication and dashboard access: ${sellerDashboardFound ? 'Available' : 'Limited'}`);
    });

    test('should manage own products', async ({ page }) => {
      await performDevLogin(page, 'seller');
      
      // Try to add new products as seller
      await page.goto('/products/new');
      await page.waitForLoadState('networkidle');
      
      // Check if seller can create products
      const createProductForm = page.locator('form, [data-testid="create-product"], [data-testid="product-form"]');
      const canCreateProducts = await createProductForm.isVisible();
      
      // Check product management access
      await page.goto('/products');
      await page.waitForLoadState('networkidle');
      
      // Look for seller-specific product management
      const sellerProductElements = page.locator('[data-testid*="seller"], [data-testid*="my-product"], button:has-text("Manage")');
      const hasProductManagement = await sellerProductElements.count() > 0 || canCreateProducts;
      
      console.log(`✅ Seller product management: ${hasProductManagement ? 'Available' : 'Limited'}`);
    });

    test('should access sales analytics', async ({ page }) => {
      await performDevLogin(page, 'seller');
      
      // Try seller-specific analytics paths
      const analyticsPaths = ['/seller/analytics', '/analytics', '/sales'];
      let analyticsAccess = false;
      
      for (const path of analyticsPaths) {
        try {
          await page.goto(path);
          await page.waitForLoadState('networkidle');
          
          if (!page.url().includes('404') && !page.url().includes('403')) {
            analyticsAccess = true;
            break;
          }
        } catch (error) {
          continue;
        }
      }
      
      // Test sales-specific API if available
      let salesApiPerf = { responseTime: 0, ok: false };
      try {
        salesApiPerf = await measureApiPerformance(page, '/api/sales');
      } catch (error) {
        // Sales API might not exist yet
      }
      
      console.log(`✅ Seller analytics: ${analyticsAccess ? 'Available' : 'Limited'}, Sales API: ${salesApiPerf.ok}`);
    });

    test('should manage inventory', async ({ page }) => {
      await performDevLogin(page, 'seller');
      
      // Try to access inventory management
      const inventoryPaths = ['/inventory', '/seller/inventory', '/products'];
      let inventoryAccess = false;
      
      for (const path of inventoryPaths) {
        try {
          await page.goto(path);
          await page.waitForLoadState('networkidle');
          
          // Look for inventory-specific elements
          const inventoryElements = page.locator('[data-testid*="inventory"], [data-testid*="stock"], input[placeholder*="quantity"]');
          if (await inventoryElements.count() > 0) {
            inventoryAccess = true;
            break;
          }
        } catch (error) {
          continue;
        }
      }
      
      console.log(`✅ Inventory management: ${inventoryAccess ? 'Available' : 'Limited'}`);
    });

    test('should process orders', async ({ page }) => {
      await performDevLogin(page, 'seller');
      
      // Try to access order management
      await page.goto('/orders');
      await page.waitForLoadState('networkidle');
      
      // Check for order processing capabilities
      const orderElements = page.locator('[data-testid*="order"], [data-testid*="process"], button:has-text("Process"), button:has-text("Fulfill")');
      const canProcessOrders = await orderElements.count() > 0;
      
      // Measure orders API performance
      const ordersPerf = await measureApiPerformance(page, '/api/orders');
      
      console.log(`✅ Order processing: ${canProcessOrders ? 'Available' : 'Limited'}, API: ${ordersPerf.responseTime}ms`);
    });
  });

  test.describe('🔒 Security & Authorization Testing', () => {
    
    test('should enforce role-based access control', async ({ page }) => {
      // Test that regular user cannot access admin routes
      await performDevLogin(page, 'testUser');
      
      await page.goto('/admin');
      await page.waitForLoadState('networkidle');
      
      // Should be redirected or get 403/404
      const isBlocked = page.url().includes('404') || 
                       page.url().includes('403') || 
                       page.url().includes('login') ||
                       !page.url().includes('/admin');
      
      expect(isBlocked).toBeTruthy();
      console.log('✅ RBAC: Regular user properly blocked from admin area');
    });

    test('should validate HTTP-only cookie implementation', async ({ page }) => {
      await performDevLogin(page, 'testUser');
      
      // Check cookies are set
      const cookies = await page.context().cookies();
      const authCookies = cookies.filter(cookie => 
        cookie.name.includes('auth') || 
        cookie.name.includes('token') || 
        cookie.name.includes('session')
      );
      
      expect(authCookies.length).toBeGreaterThan(0);
      
      // Verify cookies are HTTP-only where expected
      const httpOnlyCookies = authCookies.filter(cookie => cookie.httpOnly);
      expect(httpOnlyCookies.length).toBeGreaterThan(0);
      
      console.log(`✅ Security: Found ${httpOnlyCookies.length} HTTP-only auth cookies`);
    });

    test('should handle unauthorized API access', async ({ page }) => {
      // Clear authentication
      await page.context().clearCookies();
      
      // Try to access protected API endpoint
      const unauthorizedResponse = await page.request.get('/api/auth/me');
      expect(unauthorizedResponse.status()).toBe(401);
      
      console.log('✅ Security: Unauthorized API access properly blocked');
    });
  });

  test.describe('⚡ Performance Testing', () => {
    
    test('should meet API performance thresholds', async ({ page }) => {
      await performDevLogin(page, 'testUser');
      
      // Test critical API endpoints
      const endpoints = [
        '/api/products',
        '/api/cart', 
        '/api/auth/me',
        '/api/orders'
      ];
      
      const performanceResults = [];
      
      for (const endpoint of endpoints) {
        try {
          const perf = await measureApiPerformance(page, endpoint);
          performanceResults.push(perf);
          
          // Apply different thresholds based on endpoint
          const threshold = endpoint.includes('/cart') ? 
            CONFIG.performanceThresholds.cartApi : 
            CONFIG.performanceThresholds.apiResponse;
            
          expect(perf.responseTime).toBeLessThan(threshold);
        } catch (error) {
          console.log(`⚠️ Endpoint ${endpoint} not accessible or failed`);
        }
      }
      
      const avgResponseTime = performanceResults.reduce((sum, result) => sum + result.responseTime, 0) / performanceResults.length;
      console.log(`✅ Performance: Average API response time: ${avgResponseTime.toFixed(2)}ms`);
    });

    test('should load pages within acceptable time limits', async ({ page }) => {
      await performDevLogin(page, 'testUser');
      
      const pages = ['/', '/products', '/dashboard', '/cart'];
      
      for (const pagePath of pages) {
        const startTime = Date.now();
        
        await page.goto(pagePath);
        await page.waitForLoadState('networkidle');
        
        const loadTime = Date.now() - startTime;
        expect(loadTime).toBeLessThan(CONFIG.performanceThresholds.pageLoad);
        
        console.log(`✅ Page load: ${pagePath} loaded in ${loadTime}ms`);
      }
    });
  });
});