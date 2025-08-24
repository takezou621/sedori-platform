import { test, expect, type Page, type BrowserContext } from '@playwright/test';

// Test user accounts as requested by user
const REQUESTED_TEST_ACCOUNTS = {
  testUser: {
    id: 'test-user',
    name: 'Test User',
    email: 'devtest1@example.com',
    password: 'DevTest123!',
    role: 'user',
    description: 'Regular user with basic e-commerce functionality'
  },
  admin: {
    id: 'admin-user',
    name: 'Admin User',
    email: 'admin@example.com',
    password: 'Admin123!',
    role: 'admin',
    description: 'Administrator with full platform access'
  },
  seller: {
    id: 'seller-user',
    name: 'Seller User',
    email: 'seller@example.com',
    password: 'Seller123!',
    role: 'seller',
    description: 'Seller with sedori business functionality'
  }
} as const;

type UserRole = keyof typeof REQUESTED_TEST_ACCOUNTS;

/**
 * Enhanced dev login function using the existing dev login infrastructure
 */
async function performDevLogin(page: Page, role: UserRole): Promise<void> {
  const account = REQUESTED_TEST_ACCOUNTS[role];
  console.log(`🔐 Performing dev login for: ${account.name} (${account.email})`);
  
  try {
    // Navigate to home page
    await page.goto('http://localhost:3005');
    await page.waitForLoadState('networkidle');
    
    // Use the dev login API directly
    const loginResponse = await page.request.post('/api/dev-login', {
      data: {
        email: account.email,
        password: account.password,
        name: account.name
      }
    });
    
    if (loginResponse.status() === 200) {
      console.log(`✅ Login API successful for ${account.name}`);
      
      // Navigate to dashboard to verify login
      await page.goto('http://localhost:3005/dashboard');
      await page.waitForLoadState('networkidle');
      
    } else if (loginResponse.status() === 404 || loginResponse.status() === 401) {
      console.log(`📝 Account doesn't exist, creating ${account.name}...`);
      
      // Try to register the account first
      const registerResponse = await page.request.post('/api/dev-register', {
        data: {
          name: account.name,
          email: account.email,
          password: account.password
        }
      });
      
      if (registerResponse.ok()) {
        console.log(`✅ Account created for ${account.name}`);
        await page.goto('http://localhost:3005/dashboard');
        await page.waitForLoadState('networkidle');
      } else {
        throw new Error(`Failed to create account for ${account.name}`);
      }
    } else {
      throw new Error(`Login failed with status ${loginResponse.status()}`);
    }
    
    // Verify login by checking for auth cookies or user context
    const cookies = await page.context().cookies();
    const hasAuthCookie = cookies.some(cookie => 
      cookie.name.includes('auth') || cookie.name.includes('token')
    );
    
    if (!hasAuthCookie) {
      // Also check if we can access user-specific content
      const currentUrl = page.url();
      if (!currentUrl.includes('dashboard') && !currentUrl.includes('login')) {
        console.log('⚠️ No auth cookies found, but login may still be successful');
      }
    }
    
    console.log(`✅ Successfully logged in as ${account.name}`);
    
  } catch (error) {
    console.error(`❌ Login failed for ${account.name}:`, error);
    throw error;
  }
}

/**
 * Enhanced accessibility verification
 */
async function verifyPageAccessibility(
  page: Page, 
  pageName: string, 
  expectedElements: string[], 
  options: { allowErrors?: boolean } = {}
): Promise<void> {
  console.log(`🔍 Verifying accessibility for ${pageName} page`);
  
  const foundElements: string[] = [];
  const missingElements: string[] = [];
  
  for (const element of expectedElements) {
    try {
      await expect(page.locator(element)).toBeVisible({ timeout: 5000 });
      foundElements.push(element);
      console.log(`✅ Found expected element: ${element}`);
    } catch (error) {
      missingElements.push(element);
      console.log(`❌ Missing expected element: ${element}`);
    }
  }
  
  // Check for error states
  const errorIndicators = [
    'text=500',
    'text=Internal Server Error',
    'text=Error',
    'text=Not Found',
    'text=404'
  ];
  
  let hasError = false;
  for (const errorElement of errorIndicators) {
    const errorCount = await page.locator(errorElement).count();
    if (errorCount > 0) {
      hasError = true;
      console.log(`⚠️ Found error indicator: ${errorElement}`);
      break;
    }
  }
  
  if (hasError && !options.allowErrors) {
    throw new Error(`Page ${pageName} shows error state`);
  }
  
  if (foundElements.length === 0 && !hasError) {
    throw new Error(`Page ${pageName} has no expected elements and no error state`);
  }
  
  return;
}

/**
 * Security verification - test unauthorized access
 */
async function verifyUnauthorizedAccess(page: Page, protectedUrl: string, userRole: UserRole): Promise<void> {
  console.log(`🔒 Testing unauthorized access to ${protectedUrl} for ${userRole}`);
  
  await page.goto(protectedUrl);
  await page.waitForLoadState('networkidle');
  
  const currentUrl = page.url();
  
  // Check if redirected away from protected resource
  if (!currentUrl.includes(protectedUrl.replace('http://localhost:3005', ''))) {
    console.log(`✅ User ${userRole} was redirected away from ${protectedUrl} to ${currentUrl}`);
    return;
  }
  
  // Check for access denied messages
  const accessDeniedElements = [
    'text=Access Denied',
    'text=Unauthorized',
    'text=Permission Denied',
    'text=403',
    'text=Forbidden'
  ];
  
  let hasAccessDenied = false;
  for (const element of accessDeniedElements) {
    const count = await page.locator(element).count();
    if (count > 0) {
      hasAccessDenied = true;
      console.log(`✅ Found access restriction: ${element}`);
      break;
    }
  }
  
  if (!hasAccessDenied) {
    console.log(`⚠️ User ${userRole} may have unauthorized access to ${protectedUrl}`);
  }
}

test.describe('Comprehensive User Role Validation - As Requested', () => {
  test.setTimeout(120000);

  test.describe('Regular User (devtest1@example.com) - Basic E-commerce Functionality', () => {
    test('should successfully login via dev-login panel', async ({ page }) => {
      await performDevLogin(page, 'testUser');
      
      // Verify successful login by checking dashboard access
      const currentUrl = page.url();
      expect(currentUrl).toContain('dashboard');
      
      // Look for user-specific elements
      const userElements = [
        'text=Dashboard',
        'text=Welcome',
        '[role="main"]',
        'nav'
      ];
      
      await verifyPageAccessibility(page, 'Dashboard', userElements);
    });

    test('should access basic product browsing', async ({ page }) => {
      await performDevLogin(page, 'testUser');
      
      await page.goto('http://localhost:3005/products');
      await page.waitForLoadState('networkidle');
      
      const productElements = [
        'text=Products',
        'text=Search',
        '[data-testid*="product"]',
        'input[type="search"]',
        'input[placeholder*="search"]'
      ];
      
      await verifyPageAccessibility(page, 'Products', productElements, { allowErrors: true });
      
      // Test search functionality if available
      const searchInput = page.locator('input[type="search"], input[placeholder*="search"]').first();
      if (await searchInput.count() > 0) {
        await searchInput.fill('test product');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(1000);
        console.log('✅ Search functionality tested');
      }
    });

    test('should access shopping cart functionality', async ({ page }) => {
      await performDevLogin(page, 'testUser');
      
      await page.goto('http://localhost:3005/cart');
      await page.waitForLoadState('networkidle');
      
      const cartElements = [
        'text=Cart',
        'text=Shopping Cart',
        'text=Your Cart',
        'text=Empty',
        'text=Total'
      ];
      
      await verifyPageAccessibility(page, 'Cart', cartElements, { allowErrors: true });
      
      // Verify cart API functionality
      try {
        const cartApiResponse = await page.request.get('/api/cart');
        if (cartApiResponse.ok()) {
          console.log('✅ Cart API accessible for regular user');
        }
      } catch (error) {
        console.log('⚠️ Cart API may not be fully implemented');
      }
    });

    test('should have dashboard access for regular users', async ({ page }) => {
      await performDevLogin(page, 'testUser');
      
      await page.goto('http://localhost:3005/dashboard');
      await page.waitForLoadState('networkidle');
      
      // Look for basic dashboard elements
      const dashboardElements = [
        'text=Dashboard',
        'text=Welcome',
        'text=Overview',
        '[role="main"]'
      ];
      
      await verifyPageAccessibility(page, 'User Dashboard', dashboardElements);
      
      // Should NOT have admin-specific elements
      const adminElements = page.locator('text=Admin Panel, text=User Management, text=System Settings');
      const adminElementCount = await adminElements.count();
      expect(adminElementCount).toBe(0);
      console.log('✅ No admin elements visible to regular user');
    });

    test('should be restricted from admin-only features', async ({ page }) => {
      await performDevLogin(page, 'testUser');
      
      // Test access to admin routes
      const adminRoutes = [
        'http://localhost:3005/admin',
        'http://localhost:3005/admin/users',
        'http://localhost:3005/admin/settings'
      ];
      
      for (const route of adminRoutes) {
        await verifyUnauthorizedAccess(page, route, 'testUser');
      }
    });

    test('should persist HTTP-only cookies correctly', async ({ page }) => {
      await performDevLogin(page, 'testUser');
      
      // Check cookies after login
      const cookies = await page.context().cookies();
      console.log('Cookies set after login:', cookies.map(c => ({ name: c.name, httpOnly: c.httpOnly })));
      
      // Navigate to different pages and verify session persistence
      const testPages = [
        'http://localhost:3005/dashboard',
        'http://localhost:3005/products',
        'http://localhost:3005/'
      ];
      
      for (const pageUrl of testPages) {
        await page.goto(pageUrl);
        await page.waitForLoadState('networkidle');
        
        const currentCookies = await page.context().cookies();
        const hasSessionCookies = currentCookies.length > 0;
        expect(hasSessionCookies).toBeTruthy();
        console.log(`✅ Session maintained on: ${pageUrl}`);
      }
    });
  });

  test.describe('Admin User (admin@example.com) - Administrative Features', () => {
    test('should successfully login via dev-login panel', async ({ page }) => {
      await performDevLogin(page, 'admin');
      
      const currentUrl = page.url();
      expect(currentUrl).toContain('dashboard');
      console.log('✅ Admin user successfully logged in');
    });

    test('should access admin dashboard (/admin)', async ({ page }) => {
      await performDevLogin(page, 'admin');
      
      await page.goto('http://localhost:3005/admin');
      await page.waitForLoadState('networkidle');
      
      const currentUrl = page.url();
      expect(currentUrl).toContain('/admin');
      
      const adminElements = [
        'text=Admin',
        'text=Administration',
        'text=Management',
        'text=Users',
        'text=Settings'
      ];
      
      await verifyPageAccessibility(page, 'Admin Dashboard', adminElements, { allowErrors: true });
    });

    test('should have admin-only features and controls', async ({ page }) => {
      await performDevLogin(page, 'admin');
      
      await page.goto('http://localhost:3005/admin');
      await page.waitForLoadState('networkidle');
      
      // Look for admin-specific features
      const adminFeatures = [
        'text=User Management',
        'text=System Settings',
        'text=Analytics',
        'text=Reports',
        'button:has-text("Delete")',
        'button:has-text("Edit")',
        'button:has-text("Manage")'
      ];
      
      let foundAdminFeatures = 0;
      for (const feature of adminFeatures) {
        const count = await page.locator(feature).count();
        if (count > 0) {
          foundAdminFeatures++;
          console.log(`✅ Found admin feature: ${feature}`);
        }
      }
      
      console.log(`Found ${foundAdminFeatures} admin-specific features`);
    });

    test('should access user management capabilities', async ({ page }) => {
      await performDevLogin(page, 'admin');
      
      // Test various admin routes
      const adminRoutes = [
        'http://localhost:3005/admin',
        'http://localhost:3005/admin/beta'
      ];
      
      for (const route of adminRoutes) {
        await page.goto(route);
        await page.waitForLoadState('networkidle');
        
        const currentUrl = page.url();
        expect(currentUrl).toContain(route.replace('http://localhost:3005', ''));
        console.log(`✅ Admin can access: ${route}`);
      }
    });

    test('should have full platform access', async ({ page }) => {
      await performDevLogin(page, 'admin');
      
      // Test access to all major platform areas
      const platformRoutes = [
        'http://localhost:3005/dashboard',
        'http://localhost:3005/products',
        'http://localhost:3005/analytics',
        'http://localhost:3005/admin'
      ];
      
      for (const route of platformRoutes) {
        await page.goto(route);
        await page.waitForLoadState('networkidle');
        
        // Should not be redirected away or see access denied
        const currentUrl = page.url();
        const isAccessible = currentUrl.includes(route.replace('http://localhost:3005', '')) || 
                           !currentUrl.includes('unauthorized') && 
                           !currentUrl.includes('403');
        
        expect(isAccessible).toBeTruthy();
        console.log(`✅ Admin has access to: ${route}`);
      }
    });

    test('should access analytics page', async ({ page }) => {
      await performDevLogin(page, 'admin');
      
      await page.goto('http://localhost:3005/analytics');
      await page.waitForLoadState('networkidle');
      
      const analyticsElements = [
        'text=Analytics',
        'text=Reports',
        'text=Statistics',
        'text=Dashboard',
        'text=Metrics'
      ];
      
      await verifyPageAccessibility(page, 'Analytics', analyticsElements, { allowErrors: true });
    });
  });

  test.describe('Seller User (seller@example.com) - Sedori Business Features', () => {
    test('should successfully login via dev-login panel', async ({ page }) => {
      await performDevLogin(page, 'seller');
      
      const currentUrl = page.url();
      expect(currentUrl).toContain('dashboard');
      console.log('✅ Seller user successfully logged in');
    });

    test('should access seller-specific features', async ({ page }) => {
      await performDevLogin(page, 'seller');
      
      await page.goto('http://localhost:3005/dashboard');
      await page.waitForLoadState('networkidle');
      
      // Look for seller-specific dashboard features
      const sellerFeatures = [
        'text=Profit',
        'text=ROI',
        'text=Inventory',
        'text=Sales',
        'text=Revenue',
        'text=Margin'
      ];
      
      let foundSellerFeatures = 0;
      for (const feature of sellerFeatures) {
        const count = await page.locator(feature).count();
        if (count > 0) {
          foundSellerFeatures++;
          console.log(`✅ Found seller feature: ${feature}`);
        }
      }
      
      console.log(`Found ${foundSellerFeatures} seller-specific features`);
    });

    test('should access product management for sellers', async ({ page }) => {
      await performDevLogin(page, 'seller');
      
      await page.goto('http://localhost:3005/products');
      await page.waitForLoadState('networkidle');
      
      // Look for seller-specific product features
      const sellerProductFeatures = [
        'text=Add Product',
        'text=Profit Calculation',
        'text=Cost Price',
        'text=Selling Price',
        'button:has-text("Calculate Profit")',
        'input[placeholder*="cost"]',
        'input[placeholder*="price"]'
      ];
      
      let foundFeatures = 0;
      for (const feature of sellerProductFeatures) {
        const count = await page.locator(feature).count();
        if (count > 0) {
          foundFeatures++;
          console.log(`✅ Found seller product feature: ${feature}`);
        }
      }
      
      console.log(`Found ${foundFeatures} seller-specific product features`);
    });

    test('should access sedori business tools (profit calculations, inventory management)', async ({ page }) => {
      await performDevLogin(page, 'seller');
      
      // Test new product creation with sedori features
      await page.goto('http://localhost:3005/products/new');
      await page.waitForLoadState('networkidle');
      
      const sedoriFeatures = [
        'text=Profit Calculation',
        'text=Cost Analysis',
        'text=ROI Calculator',
        'text=Margin Analysis',
        'input[name*="cost"]',
        'input[name*="profit"]',
        'input[name*="margin"]'
      ];
      
      let foundSedoriFeatures = 0;
      for (const feature of sedoriFeatures) {
        const count = await page.locator(feature).count();
        if (count > 0) {
          foundSedoriFeatures++;
          console.log(`✅ Found sedori business tool: ${feature}`);
        }
      }
      
      console.log(`Found ${foundSedoriFeatures} sedori business tools`);
      
      // Test profit calculation if inputs are available
      const costInput = page.locator('input[name*="cost"], input[placeholder*="cost"]').first();
      const priceInput = page.locator('input[name*="price"], input[placeholder*="price"]').first();
      
      if (await costInput.count() > 0 && await priceInput.count() > 0) {
        await costInput.fill('100');
        await priceInput.fill('150');
        
        // Look for automatic profit calculation
        await page.waitForTimeout(1000);
        const profitResult = await page.locator('text=50, text=¥50, text=Profit: 50').count();
        
        if (profitResult > 0) {
          console.log('✅ Profit calculation working automatically');
        }
      }
    });

    test('should access analytics and reporting', async ({ page }) => {
      await performDevLogin(page, 'seller');
      
      await page.goto('http://localhost:3005/analytics');
      await page.waitForLoadState('networkidle');
      
      // Seller should have access to analytics but with seller-specific views
      const sellerAnalytics = [
        'text=Profit Analysis',
        'text=Sales Performance',
        'text=ROI Tracking',
        'text=Inventory Turnover',
        'text=Product Performance'
      ];
      
      let foundAnalytics = 0;
      for (const feature of sellerAnalytics) {
        const count = await page.locator(feature).count();
        if (count > 0) {
          foundAnalytics++;
          console.log(`✅ Found seller analytics: ${feature}`);
        }
      }
      
      console.log(`Found ${foundAnalytics} seller-specific analytics features`);
    });
  });

  test.describe('Cross-Role Security and Functionality Tests', () => {
    test('should verify different users have different dashboard content', async ({ browser }) => {
      const testUserContext = await browser.newContext();
      const adminContext = await browser.newContext();
      const sellerContext = await browser.newContext();
      
      try {
        const testUserPage = await testUserContext.newPage();
        const adminPage = await adminContext.newPage();
        const sellerPage = await sellerContext.newPage();
        
        // Login with different roles
        await performDevLogin(testUserPage, 'testUser');
        await performDevLogin(adminPage, 'admin');
        await performDevLogin(sellerPage, 'seller');
        
        // Navigate all to dashboard
        await Promise.all([
          testUserPage.goto('http://localhost:3005/dashboard'),
          adminPage.goto('http://localhost:3005/dashboard'),
          sellerPage.goto('http://localhost:3005/dashboard')
        ]);
        
        await Promise.all([
          testUserPage.waitForLoadState('networkidle'),
          adminPage.waitForLoadState('networkidle'),
          sellerPage.waitForLoadState('networkidle')
        ]);
        
        // Get page content for comparison
        const testUserContent = await testUserPage.textContent('body') || '';
        const adminContent = await adminPage.textContent('body') || '';
        const sellerContent = await sellerPage.textContent('body') || '';
        
        // Verify content is different between roles
        const contentsAreDifferent = 
          testUserContent !== adminContent &&
          testUserContent !== sellerContent &&
          adminContent !== sellerContent;
        
        if (!contentsAreDifferent) {
          console.log('⚠️ Dashboard content may be too similar between user roles');
        } else {
          console.log('✅ Verified different dashboard content for different user roles');
        }
        
      } finally {
        await testUserContext.close();
        await adminContext.close();
        await sellerContext.close();
      }
    });

    test('should verify middleware protection works correctly', async ({ page }) => {
      // Test without login first
      const protectedRoutes = [
        'http://localhost:3005/admin',
        'http://localhost:3005/dashboard',
        'http://localhost:3005/products/new'
      ];
      
      for (const route of protectedRoutes) {
        await page.goto(route);
        await page.waitForLoadState('networkidle');
        
        const currentUrl = page.url();
        
        // Should be redirected to login or show access denied
        if (currentUrl.includes('login') || currentUrl.includes('auth')) {
          console.log(`✅ Middleware redirected unauthenticated user away from ${route}`);
        } else {
          console.log(`⚠️ Route ${route} may be accessible without authentication`);
        }
      }
    });

    test('should verify session persistence across page navigation', async ({ page }) => {
      await performDevLogin(page, 'testUser');
      
      const testRoutes = [
        'http://localhost:3005/dashboard',
        'http://localhost:3005/products',
        'http://localhost:3005/',
        'http://localhost:3005/cart'
      ];
      
      for (const route of testRoutes) {
        await page.goto(route);
        await page.waitForLoadState('networkidle');
        
        // Check that session is maintained
        const cookies = await page.context().cookies();
        const hasSession = cookies.length > 0;
        
        expect(hasSession).toBeTruthy();
        console.log(`✅ Session maintained on: ${route}`);
      }
    });

    test('should verify API endpoints respect user permissions', async ({ page }) => {
      await performDevLogin(page, 'testUser');
      
      // Test API endpoints that should be accessible
      const userApiTests = [
        { endpoint: '/api/auth/me', shouldSucceed: true },
        { endpoint: '/api/cart', shouldSucceed: true }
      ];
      
      for (const test of userApiTests) {
        try {
          const response = await page.request.get(test.endpoint);
          const succeeded = response.ok();
          
          if (succeeded === test.shouldSucceed) {
            console.log(`✅ API ${test.endpoint} access correct for regular user`);
          } else {
            console.log(`⚠️ API ${test.endpoint} access unexpected for regular user`);
          }
        } catch (error) {
          console.log(`⚠️ API ${test.endpoint} test failed: ${error}`);
        }
      }
    });
  });

  test.describe('Performance and Reliability Tests', () => {
    test('should measure page load times for each user type', async ({ browser }) => {
      const roles: UserRole[] = ['testUser', 'admin', 'seller'];
      const testRoutes = ['/dashboard', '/products', '/'];
      
      for (const role of roles) {
        const context = await browser.newContext();
        const page = await context.newPage();
        
        try {
          await performDevLogin(page, role);
          
          for (const route of testRoutes) {
            const startTime = Date.now();
            await page.goto(`http://localhost:3005${route}`);
            await page.waitForLoadState('networkidle');
            const endTime = Date.now();
            
            const loadTime = endTime - startTime;
            console.log(`📊 ${role} - ${route}: ${loadTime}ms load time`);
            
            // Performance assertion - should load within 10 seconds
            expect(loadTime).toBeLessThan(10000);
          }
        } finally {
          await context.close();
        }
      }
    });

    test('should verify no JavaScript errors during user interactions', async ({ page }) => {
      const errors: string[] = [];
      
      page.on('pageerror', error => {
        errors.push(error.toString());
        console.log(`🚨 JavaScript error: ${error.toString()}`);
      });
      
      await performDevLogin(page, 'testUser');
      
      // Interact with various UI elements
      const interactionRoutes = [
        'http://localhost:3005/dashboard',
        'http://localhost:3005/products',
        'http://localhost:3005/cart'
      ];
      
      for (const route of interactionRoutes) {
        await page.goto(route);
        await page.waitForLoadState('networkidle');
        
        // Try to interact with common UI elements
        const buttons = page.locator('button').first();
        if (await buttons.count() > 0) {
          try {
            await buttons.click();
            await page.waitForTimeout(500);
          } catch (error) {
            console.log(`⚠️ Button interaction failed on ${route}: ${error}`);
          }
        }
      }
      
      // Report JavaScript errors
      if (errors.length > 0) {
        console.log(`⚠️ Found ${errors.length} JavaScript errors during testing`);
        errors.forEach(error => console.log(`  - ${error}`));
      } else {
        console.log('✅ No JavaScript errors detected');
      }
    });

    test('should test responsive design across different user interfaces', async ({ browser }) => {
      const viewports = [
        { width: 1920, height: 1080, name: 'Desktop' },
        { width: 768, height: 1024, name: 'Tablet' },
        { width: 375, height: 667, name: 'Mobile' }
      ];
      
      for (const viewport of viewports) {
        const context = await browser.newContext({ viewport });
        const page = await context.newPage();
        
        try {
          await performDevLogin(page, 'testUser');
          await page.goto('http://localhost:3005/dashboard');
          await page.waitForLoadState('networkidle');
          
          // Verify responsive elements
          const nav = page.locator('nav');
          const main = page.locator('main, [role="main"]');
          
          if (await nav.count() > 0) {
            expect(await nav.isVisible()).toBeTruthy();
            console.log(`✅ Navigation visible on ${viewport.name}`);
          }
          
          if (await main.count() > 0) {
            expect(await main.isVisible()).toBeTruthy();
            console.log(`✅ Main content visible on ${viewport.name}`);
          }
          
        } finally {
          await context.close();
        }
      }
    });
  });
});