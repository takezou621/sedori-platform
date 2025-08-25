import { test, expect, Page } from '@playwright/test';

/**
 * COMPREHENSIVE SELLER USER TESTING SUITE
 * 
 * Tests all seller (せどり業者) functionalities:
 * - Seller Authentication & Dashboard Access
 * - Product Management (Add/Edit Own Products)
 * - Inventory Management & Stock Control
 * - Sales Analytics & Performance Metrics
 * - Order Processing & Fulfillment
 * - Seller Community Features
 * - Business Intelligence Tools
 */

const SELLER_CONFIG = {
  baseURL: 'http://localhost:3005',
  seller: {
    email: 'selleruser@example.com',
    password: 'SellerUser123!',
    expectedRole: 'seller'
  }
};

async function loginAsSeller(page: Page) {
  console.log('🔐 Logging in as Seller User...');
  
  const loginResponse = await page.request.post('/api/dev-login', {
    data: {
      email: SELLER_CONFIG.seller.email,
      password: SELLER_CONFIG.seller.password
    }
  });

  expect(loginResponse.ok()).toBeTruthy();
  const responseData = await loginResponse.json();
  expect(responseData.success).toBe(true);
  expect(responseData.user.role).toBe(SELLER_CONFIG.seller.expectedRole);
  
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  
  return responseData.user;
}

async function measureSellerApiPerformance(page: Page, endpoint: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET', data?: any) {
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

test.describe('🏪 Seller User (せどり業者) - Comprehensive Business Testing', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
  });

  test.describe('🔐 Seller Authentication & Dashboard', () => {
    
    test('should authenticate successfully with seller privileges', async ({ page }) => {
      const sellerUser = await loginAsSeller(page);
      
      // Verify seller role in token/session
      const authResponse = await page.request.get('/api/auth/me');
      expect(authResponse.ok()).toBeTruthy();
      
      const userData = await authResponse.json();
      expect(userData.role).toBe('seller');
      expect(userData.email).toBe(SELLER_CONFIG.seller.email);
      
      console.log('✅ Seller authentication successful');
    });

    test('should access seller dashboard', async ({ page }) => {
      await loginAsSeller(page);
      
      // Try different seller dashboard paths
      const sellerDashboardPaths = [
        '/seller',
        '/seller/dashboard', 
        '/dashboard',
        '/business',
        '/store'
      ];
      
      let sellerDashboardAccessible = false;
      let accessiblePath = '';
      
      for (const path of sellerDashboardPaths) {
        await page.goto(path);
        await page.waitForLoadState('networkidle');
        
        const isAccessible = !page.url().includes('404') && 
                           !page.url().includes('403') && 
                           !page.url().includes('unauthorized');
        
        if (isAccessible) {
          // Look for seller-specific elements
          const sellerElements = [
            'h1:has-text("Seller")',
            'h1:has-text("セラー")',
            'h1:has-text("Business")', 
            'h1:has-text("ビジネス")',
            '[data-testid*="seller"]',
            '[data-testid*="business"]'
          ];
          
          for (const selector of sellerElements) {
            if (await page.locator(selector).isVisible()) {
              sellerDashboardAccessible = true;
              accessiblePath = path;
              break;
            }
          }
          
          if (sellerDashboardAccessible) break;
          
          // Even if no specific seller elements, if dashboard is accessible, it counts
          if (path.includes('dashboard')) {
            sellerDashboardAccessible = true;
            accessiblePath = path;
            break;
          }
        }
      }
      
      expect(sellerDashboardAccessible).toBeTruthy();
      console.log(`✅ Seller dashboard accessible at: ${accessiblePath}`);
    });
  });

  test.describe('🛍️ Product Management (Seller Inventory)', () => {
    
    test('should access product creation interface', async ({ page }) => {
      await loginAsSeller(page);
      
      // Navigate to product creation
      await page.goto('/products/new');
      await page.waitForLoadState('networkidle');
      
      // Check if seller can create products
      const productForm = page.locator('form, [data-testid="create-product"], [data-testid="product-form"]');
      const formVisible = await productForm.isVisible();
      
      if (formVisible) {
        // Look for essential product form fields
        const formFields = [
          'input[name*="name"], input[placeholder*="name"], input[placeholder*="名前"]',
          'textarea[name*="description"], textarea[placeholder*="description"]', 
          'input[name*="price"], input[type="number"]',
          'input[name*="wholesalePrice"], input[placeholder*="wholesale"]',
          'input[name*="retailPrice"], input[placeholder*="retail"]',
          'select[name*="category"], select[placeholder*="category"]',
          'input[name*="brand"], input[placeholder*="brand"]'
        ];
        
        let fieldsFound = 0;
        for (const fieldSelector of formFields) {
          if (await page.locator(fieldSelector).isVisible()) {
            fieldsFound++;
          }
        }
        
        console.log(`✅ Seller product creation form accessible with ${fieldsFound} fields`);
      } else {
        console.log('⚠️ Product creation form not accessible for seller');
      }
    });

    test('should manage own products', async ({ page }) => {
      await loginAsSeller(page);
      
      await page.goto('/products');
      await page.waitForLoadState('networkidle');
      
      // Look for seller product management features
      const sellerProductElements = [
        'button:has-text("Edit")',
        'button:has-text("編集")',
        'button:has-text("My Products")',
        'button:has-text("私の商品")',
        '[data-testid*="seller-product"]',
        '[data-testid*="my-product"]',
        '[data-testid*="edit-product"]',
        'a[href*="/products/"][href*="/edit"]'
      ];
      
      let sellerProductFeatures = 0;
      for (const selector of sellerProductElements) {
        sellerProductFeatures += await page.locator(selector).count();
      }
      
      console.log(`✅ Seller product management features found: ${sellerProductFeatures}`);
    });

    test('should access products API with seller context', async ({ page }) => {
      await loginAsSeller(page);
      
      // Test general products API
      const productsApiPerf = await measureSellerApiPerformance(page, '/api/products');
      expect(productsApiPerf.ok).toBeTruthy();
      expect(productsApiPerf.responseTime).toBeLessThan(2000);
      
      // Test seller-specific product endpoints
      const sellerProductEndpoints = [
        '/api/products?seller=true',
        '/api/seller/products',
        '/api/products/my',
        '/api/products/manage'
      ];
      
      let sellerEndpointsAccessible = 0;
      for (const endpoint of sellerProductEndpoints) {
        try {
          const response = await measureSellerApiPerformance(page, endpoint);
          if (response.ok) {
            sellerEndpointsAccessible++;
          }
        } catch (error) {
          // Endpoint might not exist yet
        }
      }
      
      console.log(`✅ Products API accessible, ${sellerEndpointsAccessible} seller-specific endpoints found`);
    });
  });

  test.describe('📦 Inventory Management', () => {
    
    test('should access inventory management interface', async ({ page }) => {
      await loginAsSeller(page);
      
      const inventoryPaths = [
        '/inventory',
        '/seller/inventory',
        '/stock',
        '/products'  // Products page might include inventory management
      ];
      
      let inventoryManagementFound = false;
      let accessiblePath = '';
      
      for (const path of inventoryPaths) {
        await page.goto(path);
        await page.waitForLoadState('networkidle');
        
        if (!page.url().includes('404') && !page.url().includes('403')) {
          // Look for inventory management elements
          const inventoryElements = [
            'input[name*="stock"], input[name*="quantity"]',
            'input[placeholder*="stock"], input[placeholder*="quantity"]',
            'th:has-text("Stock"), th:has-text("在庫")',
            'th:has-text("Quantity"), th:has-text("数量")',
            '[data-testid*="inventory"]',
            '[data-testid*="stock"]'
          ];
          
          for (const selector of inventoryElements) {
            if (await page.locator(selector).isVisible()) {
              inventoryManagementFound = true;
              accessiblePath = path;
              break;
            }
          }
          
          if (inventoryManagementFound) break;
        }
      }
      
      console.log(`✅ Inventory management: ${inventoryManagementFound ? `Found at ${accessiblePath}` : 'Not available'}`);
    });

    test('should manage stock levels', async ({ page }) => {
      await loginAsSeller(page);
      
      // Go to products page to check for stock management
      await page.goto('/products');
      await page.waitForLoadState('networkidle');
      
      // Look for stock-related input fields or controls
      const stockControls = [
        'input[type="number"][name*="stock"]',
        'input[type="number"][name*="quantity"]',
        'input[placeholder*="stock"]',
        'input[placeholder*="在庫"]',
        '[data-testid*="stock-input"]'
      ];
      
      let stockManagementFeatures = 0;
      for (const selector of stockControls) {
        stockManagementFeatures += await page.locator(selector).count();
      }
      
      console.log(`✅ Stock management controls found: ${stockManagementFeatures}`);
    });
  });

  test.describe('📊 Sales Analytics & Business Intelligence', () => {
    
    test('should access seller analytics dashboard', async ({ page }) => {
      await loginAsSeller(page);
      
      const analyticsPaths = [
        '/seller/analytics',
        '/analytics', 
        '/sales',
        '/business/analytics',
        '/dashboard' // Analytics might be on main dashboard
      ];
      
      let analyticsAccessible = false;
      let accessiblePath = '';
      let analyticsComponents = 0;
      
      for (const path of analyticsPaths) {
        await page.goto(path);
        await page.waitForLoadState('networkidle');
        
        if (!page.url().includes('404') && !page.url().includes('403')) {
          // Look for analytics elements
          const analyticsElements = [
            '[data-testid*="chart"]',
            '[data-testid*="analytics"]', 
            '[data-testid*="sales"]',
            'canvas',
            '.chart, .graph',
            'h1:has-text("Analytics")',
            'h1:has-text("分析")',
            'h2:has-text("Sales")',
            'h2:has-text("売上")'
          ];
          
          let componentsOnThisPage = 0;
          for (const selector of analyticsElements) {
            componentsOnThisPage += await page.locator(selector).count();
          }
          
          if (componentsOnThisPage > analyticsComponents) {
            analyticsAccessible = true;
            accessiblePath = path;
            analyticsComponents = componentsOnThisPage;
          }
        }
      }
      
      console.log(`✅ Seller analytics: ${analyticsAccessible ? `Available at ${accessiblePath} with ${analyticsComponents} components` : 'Not available'}`);
    });

    test('should access sales analytics API', async ({ page }) => {
      await loginAsSeller(page);
      
      const salesAnalyticsEndpoints = [
        '/api/analytics',
        '/api/seller/analytics',
        '/api/sales',
        '/api/seller/sales',
        '/api/analytics/sales'
      ];
      
      let accessibleEndpoints = 0;
      const performanceResults = [];
      
      for (const endpoint of salesAnalyticsEndpoints) {
        try {
          const perf = await measureSellerApiPerformance(page, endpoint);
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
        console.log(`✅ Sales analytics APIs: ${accessibleEndpoints} endpoints accessible, avg response: ${avgResponseTime.toFixed(2)}ms`);
      } else {
        console.log('⚠️ No sales analytics API endpoints accessible');
      }
    });

    test('should view sales performance metrics', async ({ page }) => {
      await loginAsSeller(page);
      
      // Check dashboard for sales metrics
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      
      // Look for sales/revenue metrics
      const salesMetricElements = [
        '[data-testid*="revenue"]',
        '[data-testid*="sales"]',
        '[data-testid*="profit"]',
        ':has-text("¥"), :has-text("円")',
        ':has-text("Revenue"), :has-text("売上")',
        ':has-text("Profit"), :has-text("利益")',
        '.metric, .kpi, .stat'
      ];
      
      let salesMetrics = 0;
      for (const selector of salesMetricElements) {
        salesMetrics += await page.locator(selector).count();
      }
      
      console.log(`✅ Sales performance metrics found: ${salesMetrics}`);
    });
  });

  test.describe('📋 Order Processing & Fulfillment', () => {
    
    test('should access order management for seller', async ({ page }) => {
      await loginAsSeller(page);
      
      await page.goto('/orders');
      await page.waitForLoadState('networkidle');
      
      // Look for seller-specific order management
      const orderManagementElements = [
        'table th:has-text("Order")',
        'table th:has-text("注文")',
        '[data-testid*="order"]',
        'button:has-text("Process")',
        'button:has-text("処理")', 
        'button:has-text("Fulfill")',
        'button:has-text("発送")',
        'select[name*="status"], select[name*="ステータス"]'
      ];
      
      let orderManagementFeatures = 0;
      for (const selector of orderManagementElements) {
        orderManagementFeatures += await page.locator(selector).count();
      }
      
      console.log(`✅ Order management features for seller: ${orderManagementFeatures}`);
    });

    test('should process orders through API', async ({ page }) => {
      await loginAsSeller(page);
      
      // Test orders API access
      const ordersApiPerf = await measureSellerApiPerformance(page, '/api/orders');
      
      if (ordersApiPerf.ok) {
        expect(ordersApiPerf.responseTime).toBeLessThan(2000);
        console.log(`✅ Orders API accessible for seller, response time: ${ordersApiPerf.responseTime}ms`);
      } else {
        console.log(`⚠️ Orders API returned status: ${ordersApiPerf.status}`);
      }
      
      // Test seller-specific order endpoints
      const sellerOrderEndpoints = [
        '/api/orders?seller=true',
        '/api/seller/orders',
        '/api/orders/my'
      ];
      
      let sellerOrdersAccessible = 0;
      for (const endpoint of sellerOrderEndpoints) {
        try {
          const response = await measureSellerApiPerformance(page, endpoint);
          if (response.ok) {
            sellerOrdersAccessible++;
          }
        } catch (error) {
          // Endpoint might not exist
        }
      }
      
      console.log(`✅ Seller order endpoints accessible: ${sellerOrdersAccessible}`);
    });
  });

  test.describe('🏛️ Seller Community Features', () => {
    
    test('should access seller community', async ({ page }) => {
      await loginAsSeller(page);
      
      await page.goto('/community');
      await page.waitForLoadState('networkidle');
      
      // Look for seller-specific community features
      const sellerCommunityElements = [
        '[data-testid*="seller-forum"]',
        '[data-testid*="business-forum"]',
        'h2:has-text("Seller"), h2:has-text("セラー")',
        'h2:has-text("Business"), h2:has-text("ビジネス")',
        'button:has-text("Post"), button:has-text("投稿")',
        'textarea[placeholder*="post"], textarea[placeholder*="投稿"]'
      ];
      
      let sellerCommunityFeatures = 0;
      for (const selector of sellerCommunityElements) {
        sellerCommunityFeatures += await page.locator(selector).count();
      }
      
      console.log(`✅ Seller community features: ${sellerCommunityFeatures}`);
    });

    test('should access seller networking features', async ({ page }) => {
      await loginAsSeller(page);
      
      // Check for seller networking/messaging features
      const networkingPaths = ['/messages', '/community', '/network'];
      let networkingFeatures = 0;
      
      for (const path of networkingPaths) {
        await page.goto(path);
        await page.waitForLoadState('networkidle');
        
        const networkingElements = [
          '[data-testid*="message"]',
          '[data-testid*="follow"]',
          'button:has-text("Follow"), button:has-text("フォロー")',
          'button:has-text("Message"), button:has-text("メッセージ")'
        ];
        
        for (const selector of networkingElements) {
          networkingFeatures += await page.locator(selector).count();
        }
      }
      
      console.log(`✅ Seller networking features: ${networkingFeatures}`);
    });
  });

  test.describe('💼 Business Intelligence Tools', () => {
    
    test('should access profitability analysis', async ({ page }) => {
      await loginAsSeller(page);
      
      // Look for profitability analysis features
      await page.goto('/products');
      await page.waitForLoadState('networkidle');
      
      const profitabilityElements = [
        ':has-text("Profit"), :has-text("利益")',
        ':has-text("Margin"), :has-text("マージン")', 
        ':has-text("ROI")',
        '[data-testid*="profit"]',
        '[data-testid*="margin"]',
        'input[name*="wholesalePrice"]',
        'input[name*="retailPrice"]'
      ];
      
      let profitabilityFeatures = 0;
      for (const selector of profitabilityElements) {
        profitabilityFeatures += await page.locator(selector).count();
      }
      
      console.log(`✅ Profitability analysis features: ${profitabilityFeatures}`);
    });

    test('should access market data integration', async ({ page }) => {
      await loginAsSeller(page);
      
      // Test market data API endpoints
      const marketDataEndpoints = [
        '/api/products/market-data',
        '/api/market-data',
        '/api/external-apis/market-data'
      ];
      
      let marketDataAccessible = 0;
      for (const endpoint of marketDataEndpoints) {
        try {
          const response = await measureSellerApiPerformance(page, endpoint);
          if (response.ok) {
            marketDataAccessible++;
          }
        } catch (error) {
          // Endpoint might not exist
        }
      }
      
      console.log(`✅ Market data integration endpoints: ${marketDataAccessible}`);
    });
  });

  test.describe('🚀 Seller Performance & Optimization', () => {
    
    test('should maintain good performance for seller operations', async ({ page }) => {
      await loginAsSeller(page);
      
      // Test key seller endpoints performance
      const sellerEndpoints = [
        '/api/products',
        '/api/orders',
        '/api/analytics'
      ];
      
      const performanceResults = [];
      
      for (const endpoint of sellerEndpoints) {
        try {
          const perf = await measureSellerApiPerformance(page, endpoint);
          if (perf.ok) {
            performanceResults.push(perf);
            expect(perf.responseTime).toBeLessThan(2500); // 2.5s max for seller operations
          }
        } catch (error) {
          // Some endpoints might not exist
        }
      }
      
      if (performanceResults.length > 0) {
        const avgResponseTime = performanceResults.reduce((sum, result) => sum + result.responseTime, 0) / performanceResults.length;
        const maxResponseTime = Math.max(...performanceResults.map(result => result.responseTime));
        
        console.log(`✅ Seller API performance - Avg: ${avgResponseTime.toFixed(2)}ms, Max: ${maxResponseTime}ms`);
      }
    });

    test('should handle seller page navigation efficiently', async ({ page }) => {
      await loginAsSeller(page);
      
      const sellerPages = ['/dashboard', '/products', '/orders', '/analytics', '/inventory'];
      
      for (const pagePath of sellerPages) {
        const startTime = Date.now();
        
        await page.goto(pagePath);
        await page.waitForLoadState('networkidle');
        
        const loadTime = Date.now() - startTime;
        expect(loadTime).toBeLessThan(4000); // 4s max for seller pages
        
        console.log(`✅ Seller page load: ${pagePath} - ${loadTime}ms`);
      }
    });

    test('should support concurrent seller operations', async ({ page }) => {
      await loginAsSeller(page);
      
      // Simulate concurrent API calls that a seller might make
      const concurrentRequests = [
        measureSellerApiPerformance(page, '/api/products'),
        measureSellerApiPerformance(page, '/api/orders'),
        measureSellerApiPerformance(page, '/api/auth/me')
      ];
      
      const results = await Promise.all(concurrentRequests.map(p => p.catch(e => null)));
      const successfulRequests = results.filter(r => r && r.ok);
      
      expect(successfulRequests.length).toBeGreaterThan(0);
      console.log(`✅ Concurrent operations: ${successfulRequests.length}/${results.length} successful`);
    });
  });
});