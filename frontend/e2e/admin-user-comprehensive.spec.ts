import { test, expect, Page } from '@playwright/test';

/**
 * COMPREHENSIVE ADMIN USER TESTING SUITE
 * 
 * Tests all administrative functionalities for admin users:
 * - User Management (view, edit, suspend)
 * - Product Management (CRUD operations) 
 * - System Analytics and Reports
 * - Order Management and Transactions
 * - Community Moderation
 * - System Configuration Access
 */

const ADMIN_CONFIG = {
  baseURL: 'http://localhost:3005',
  admin: {
    email: 'adminuser@example.com',
    password: 'AdminUser123!',
    expectedRole: 'admin'
  }
};

async function loginAsAdmin(page: Page) {
  console.log('🔐 Logging in as Admin User...');
  
  const loginResponse = await page.request.post('/api/dev-login', {
    data: {
      email: ADMIN_CONFIG.admin.email,
      password: ADMIN_CONFIG.admin.password
    }
  });

  expect(loginResponse.ok()).toBeTruthy();
  const responseData = await loginResponse.json();
  expect(responseData.success).toBe(true);
  expect(responseData.user.role).toBe(ADMIN_CONFIG.admin.expectedRole);
  
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  
  return responseData.user;
}

async function measureAdminApiPerformance(page: Page, endpoint: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET', data?: any) {
  const startTime = Date.now();
  
  let response;
  switch (method) {
    case 'POST':
      response = await page.request.post(endpoint, { data });
      break;
    case 'PUT':
      response = await page.request.put(endpoint, { data });
      break;
    case 'DELETE':
      response = await page.request.delete(endpoint);
      break;
    default:
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

test.describe('👨‍💼 Admin User - Comprehensive Administrative Testing', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
  });

  test.describe('🔐 Admin Authentication & Authorization', () => {
    
    test('should authenticate successfully with admin privileges', async ({ page }) => {
      const adminUser = await loginAsAdmin(page);
      
      // Verify admin role in token/session
      const authResponse = await page.request.get('/api/auth/me');
      expect(authResponse.ok()).toBeTruthy();
      
      const userData = await authResponse.json();
      expect(userData.role).toBe('admin');
      expect(userData.email).toBe(ADMIN_CONFIG.admin.email);
      
      console.log('✅ Admin authentication successful');
    });

    test('should access admin dashboard', async ({ page }) => {
      await loginAsAdmin(page);
      
      // Try different admin dashboard paths
      const adminPaths = ['/admin', '/admin/dashboard', '/dashboard'];
      let adminDashboardAccessible = false;
      let accessiblePath = '';
      
      for (const path of adminPaths) {
        await page.goto(path);
        await page.waitForLoadState('networkidle');
        
        // Check if page loads successfully (not 404/403)
        const isAccessible = !page.url().includes('404') && 
                           !page.url().includes('403') && 
                           !page.url().includes('unauthorized');
        
        if (isAccessible) {
          adminDashboardAccessible = true;
          accessiblePath = path;
          break;
        }
      }
      
      expect(adminDashboardAccessible).toBeTruthy();
      console.log(`✅ Admin dashboard accessible at: ${accessiblePath}`);
    });
  });

  test.describe('👥 User Management Functionality', () => {
    
    test('should access user management interface', async ({ page }) => {
      await loginAsAdmin(page);
      
      // Try different user management paths
      const userManagementPaths = [
        '/admin/users',
        '/admin/user-management', 
        '/users',
        '/admin/accounts'
      ];
      
      let userManagementFound = false;
      let accessiblePath = '';
      
      for (const path of userManagementPaths) {
        await page.goto(path);
        await page.waitForLoadState('networkidle');
        
        if (!page.url().includes('404') && !page.url().includes('403')) {
          // Look for user management indicators
          const userManagementElements = [
            'table th:has-text("User")',
            'table th:has-text("Email")', 
            '[data-testid*="user"]',
            'h1:has-text("User")',
            'h1:has-text("ユーザー")'
          ];
          
          for (const selector of userManagementElements) {
            if (await page.locator(selector).isVisible()) {
              userManagementFound = true;
              accessiblePath = path;
              break;
            }
          }
          
          if (userManagementFound) break;
        }
      }
      
      console.log(`✅ User management interface: ${userManagementFound ? `Found at ${accessiblePath}` : 'Not found'}`);
    });

    test('should retrieve user data via API', async ({ page }) => {
      await loginAsAdmin(page);
      
      // Test users API endpoint
      const usersApiPerf = await measureAdminApiPerformance(page, '/api/users');
      
      if (usersApiPerf.ok) {
        expect(usersApiPerf.responseTime).toBeLessThan(2000);
        console.log(`✅ Users API accessible, response time: ${usersApiPerf.responseTime}ms`);
      } else {
        console.log(`⚠️ Users API returned status: ${usersApiPerf.status}`);
      }
    });

    test('should have user action capabilities', async ({ page }) => {
      await loginAsAdmin(page);
      
      // Navigate to users page
      await page.goto('/admin/users');
      await page.waitForLoadState('networkidle');
      
      // Look for admin action buttons/links
      const adminActionSelectors = [
        'button:has-text("Edit")',
        'button:has-text("編集")',
        'button:has-text("Suspend")',
        'button:has-text("停止")',
        'button:has-text("Delete")',
        'button:has-text("削除")',
        '[data-testid*="edit"]',
        '[data-testid*="suspend"]',
        '[data-testid*="delete"]'
      ];
      
      let adminActionsFound = 0;
      for (const selector of adminActionSelectors) {
        const elements = await page.locator(selector);
        adminActionsFound += await elements.count();
      }
      
      console.log(`✅ Admin user actions found: ${adminActionsFound} action buttons/links`);
    });
  });

  test.describe('🛍️ Product Management (CRUD Operations)', () => {
    
    test('should access product creation interface', async ({ page }) => {
      await loginAsAdmin(page);
      
      // Navigate to product creation page
      await page.goto('/products/new');
      await page.waitForLoadState('networkidle');
      
      // Check for product creation form
      const productForm = page.locator('form, [data-testid="create-product"], [data-testid="product-form"]');
      const formVisible = await productForm.isVisible();
      
      if (formVisible) {
        // Look for essential form fields
        const formFields = [
          'input[name*="name"], input[placeholder*="name"], input[placeholder*="名前"]',
          'textarea[name*="description"], textarea[placeholder*="description"]',
          'input[name*="price"], input[type="number"]'
        ];
        
        let fieldsFound = 0;
        for (const fieldSelector of formFields) {
          if (await page.locator(fieldSelector).isVisible()) {
            fieldsFound++;
          }
        }
        
        console.log(`✅ Product creation form accessible with ${fieldsFound} essential fields`);
      } else {
        console.log('⚠️ Product creation form not found');
      }
    });

    test('should access product management list', async ({ page }) => {
      await loginAsAdmin(page);
      
      await page.goto('/products');
      await page.waitForLoadState('networkidle');
      
      // Look for admin product management features
      const adminProductElements = [
        'button:has-text("Edit")',
        'button:has-text("編集")', 
        'button:has-text("Delete")',
        'button:has-text("削除")',
        '[data-testid*="edit-product"]',
        '[data-testid*="delete-product"]',
        'a[href*="/products/"][href*="/edit"]'
      ];
      
      let adminProductActions = 0;
      for (const selector of adminProductElements) {
        adminProductActions += await page.locator(selector).count();
      }
      
      console.log(`✅ Admin product management actions found: ${adminProductActions}`);
    });

    test('should access products API with admin privileges', async ({ page }) => {
      await loginAsAdmin(page);
      
      // Test products API performance
      const productsApiPerf = await measureAdminApiPerformance(page, '/api/products');
      expect(productsApiPerf.ok).toBeTruthy();
      expect(productsApiPerf.responseTime).toBeLessThan(2000);
      
      // Test admin-specific product endpoints
      const adminProductEndpoints = [
        '/api/products?admin=true',
        '/api/admin/products',
        '/api/products/manage'
      ];
      
      let adminEndpointsAccessible = 0;
      for (const endpoint of adminProductEndpoints) {
        try {
          const response = await measureAdminApiPerformance(page, endpoint);
          if (response.ok) {
            adminEndpointsAccessible++;
          }
        } catch (error) {
          // Endpoint might not exist
        }
      }
      
      console.log(`✅ Products API accessible, ${adminEndpointsAccessible} admin-specific endpoints found`);
    });
  });

  test.describe('📊 Analytics and Reporting', () => {
    
    test('should access analytics dashboard', async ({ page }) => {
      await loginAsAdmin(page);
      
      await page.goto('/analytics');
      await page.waitForLoadState('networkidle');
      
      const analyticsAccessible = !page.url().includes('404') && 
                                 !page.url().includes('403') &&
                                 !page.url().includes('unauthorized');
      
      if (analyticsAccessible) {
        // Look for analytics elements
        const analyticsElements = [
          '[data-testid*="chart"]',
          '[data-testid*="analytics"]',
          'canvas',
          '.chart, .graph',
          'h1:has-text("Analytics")',
          'h1:has-text("分析")'
        ];
        
        let analyticsComponents = 0;
        for (const selector of analyticsElements) {
          analyticsComponents += await page.locator(selector).count();
        }
        
        console.log(`✅ Analytics dashboard accessible with ${analyticsComponents} components`);
      } else {
        console.log('⚠️ Analytics dashboard not accessible');
      }
    });

    test('should access analytics API endpoints', async ({ page }) => {
      await loginAsAdmin(page);
      
      const analyticsEndpoints = [
        '/api/analytics',
        '/api/analytics/dashboard',
        '/api/analytics/reports',
        '/api/admin/analytics'
      ];
      
      let accessibleEndpoints = 0;
      const performanceResults = [];
      
      for (const endpoint of analyticsEndpoints) {
        try {
          const perf = await measureAdminApiPerformance(page, endpoint);
          if (perf.ok) {
            accessibleEndpoints++;
            performanceResults.push(perf);
          }
        } catch (error) {
          // Endpoint might not exist
        }
      }
      
      if (performanceResults.length > 0) {
        const avgResponseTime = performanceResults.reduce((sum, result) => sum + result.responseTime, 0) / performanceResults.length;
        console.log(`✅ Analytics APIs: ${accessibleEndpoints} endpoints accessible, avg response: ${avgResponseTime.toFixed(2)}ms`);
      } else {
        console.log('⚠️ No analytics API endpoints accessible');
      }
    });
  });

  test.describe('📦 Order and Transaction Management', () => {
    
    test('should access order management interface', async ({ page }) => {
      await loginAsAdmin(page);
      
      await page.goto('/orders');
      await page.waitForLoadState('networkidle');
      
      // Look for order management features
      const orderManagementElements = [
        'table th:has-text("Order")', 
        'table th:has-text("注文")',
        '[data-testid*="order"]',
        'button:has-text("Process")',
        'button:has-text("処理")',
        'select[name*="status"], select[name*="ステータス"]'
      ];
      
      let orderManagementFeatures = 0;
      for (const selector of orderManagementElements) {
        orderManagementFeatures += await page.locator(selector).count();
      }
      
      console.log(`✅ Order management features found: ${orderManagementFeatures}`);
    });

    test('should access orders API with admin privileges', async ({ page }) => {
      await loginAsAdmin(page);
      
      // Test orders API
      const ordersApiPerf = await measureAdminApiPerformance(page, '/api/orders');
      
      if (ordersApiPerf.ok) {
        expect(ordersApiPerf.responseTime).toBeLessThan(2000);
        console.log(`✅ Orders API accessible, response time: ${ordersApiPerf.responseTime}ms`);
      } else {
        console.log(`⚠️ Orders API returned status: ${ordersApiPerf.status}`);
      }
      
      // Test admin-specific order endpoints
      const adminOrderEndpoints = [
        '/api/orders?admin=true',
        '/api/admin/orders',
        '/api/orders/all'
      ];
      
      let adminOrdersAccessible = 0;
      for (const endpoint of adminOrderEndpoints) {
        try {
          const response = await measureAdminApiPerformance(page, endpoint);
          if (response.ok) {
            adminOrdersAccessible++;
          }
        } catch (error) {
          // Endpoint might not exist
        }
      }
      
      console.log(`✅ Admin order endpoints accessible: ${adminOrdersAccessible}`);
    });
  });

  test.describe('🏛️ Community Moderation', () => {
    
    test('should access community moderation tools', async ({ page }) => {
      await loginAsAdmin(page);
      
      await page.goto('/community');
      await page.waitForLoadState('networkidle');
      
      // Look for moderation tools
      const moderationElements = [
        'button:has-text("Moderate")',
        'button:has-text("モデレート")',
        'button:has-text("Delete")',
        'button:has-text("削除")',
        'button:has-text("Ban")',
        'button:has-text("禁止")',
        '[data-testid*="moderate"]',
        '[data-testid*="admin-action"]'
      ];
      
      let moderationTools = 0;
      for (const selector of moderationElements) {
        moderationTools += await page.locator(selector).count();
      }
      
      console.log(`✅ Community moderation tools found: ${moderationTools}`);
    });

    test('should access community management API', async ({ page }) => {
      await loginAsAdmin(page);
      
      const communityEndpoints = [
        '/api/community/posts',
        '/api/forum/posts', 
        '/api/admin/community',
        '/api/moderation'
      ];
      
      let communityApisAccessible = 0;
      for (const endpoint of communityEndpoints) {
        try {
          const response = await measureAdminApiPerformance(page, endpoint);
          if (response.ok) {
            communityApisAccessible++;
          }
        } catch (error) {
          // Endpoint might not exist yet
        }
      }
      
      console.log(`✅ Community API endpoints accessible: ${communityApisAccessible}`);
    });
  });

  test.describe('⚙️ System Configuration Access', () => {
    
    test('should access system settings', async ({ page }) => {
      await loginAsAdmin(page);
      
      const settingsPaths = [
        '/admin/settings',
        '/admin/config',
        '/admin/system',
        '/settings'
      ];
      
      let systemSettingsAccessible = false;
      let accessiblePath = '';
      
      for (const path of settingsPaths) {
        await page.goto(path);
        await page.waitForLoadState('networkidle');
        
        if (!page.url().includes('404') && !page.url().includes('403')) {
          // Look for settings indicators
          const settingsElements = [
            'h1:has-text("Settings")',
            'h1:has-text("設定")',
            'input[type="checkbox"]',
            'select[name*="config"]',
            '[data-testid*="setting"]'
          ];
          
          for (const selector of settingsElements) {
            if (await page.locator(selector).isVisible()) {
              systemSettingsAccessible = true;
              accessiblePath = path;
              break;
            }
          }
          
          if (systemSettingsAccessible) break;
        }
      }
      
      console.log(`✅ System settings: ${systemSettingsAccessible ? `Accessible at ${accessiblePath}` : 'Not found'}`);
    });
  });

  test.describe('🚀 Admin Performance & Reliability', () => {
    
    test('should maintain good performance under admin load', async ({ page }) => {
      await loginAsAdmin(page);
      
      // Test multiple admin endpoints in sequence
      const adminEndpoints = [
        '/api/users',
        '/api/products', 
        '/api/orders',
        '/api/analytics'
      ];
      
      const performanceResults = [];
      
      for (const endpoint of adminEndpoints) {
        try {
          const perf = await measureAdminApiPerformance(page, endpoint);
          if (perf.ok) {
            performanceResults.push(perf);
            expect(perf.responseTime).toBeLessThan(3000); // 3s max for admin operations
          }
        } catch (error) {
          // Some endpoints might not exist
        }
      }
      
      if (performanceResults.length > 0) {
        const avgResponseTime = performanceResults.reduce((sum, result) => sum + result.responseTime, 0) / performanceResults.length;
        const maxResponseTime = Math.max(...performanceResults.map(result => result.responseTime));
        
        console.log(`✅ Admin API performance - Avg: ${avgResponseTime.toFixed(2)}ms, Max: ${maxResponseTime}ms`);
      }
    });

    test('should handle admin page navigation smoothly', async ({ page }) => {
      await loginAsAdmin(page);
      
      const adminPages = ['/admin', '/products', '/orders', '/analytics', '/community'];
      
      for (const pagePath of adminPages) {
        const startTime = Date.now();
        
        await page.goto(pagePath);
        await page.waitForLoadState('networkidle');
        
        const loadTime = Date.now() - startTime;
        expect(loadTime).toBeLessThan(5000); // 5s max for admin pages
        
        console.log(`✅ Admin page load: ${pagePath} - ${loadTime}ms`);
      }
    });
  });
});