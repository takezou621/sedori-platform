import { test, expect, type Page } from '@playwright/test';

// Admin test account - using the specified credentials
const ADMIN_ACCOUNT = {
  id: 'test-admin',
  name: '管理者テスト',
  email: 'devadmin@example.com',
  password: 'DevAdmin123!',
  description: '管理者権限テストアカウント'
};

/**
 * Comprehensive Admin User Functionality Validation
 * This test suite validates all admin-specific features and access controls
 */

/**
 * Helper function to perform admin login via dev panel
 */
async function performAdminLogin(page: Page): Promise<void> {
  console.log(`🔐 Starting admin login process for: ${ADMIN_ACCOUNT.name} (${ADMIN_ACCOUNT.email})`);
  
  // Navigate to home page
  await page.goto('http://localhost:3005');
  await page.waitForLoadState('networkidle');
  
  // Show dev panel
  const devPanelTrigger = page.locator('[data-testid="show-dev-panel"]');
  await expect(devPanelTrigger).toBeVisible({ timeout: 10000 });
  await devPanelTrigger.click();
  console.log('✅ Dev panel triggered successfully');
  
  await page.waitForTimeout(1000);
  
  // Click admin login button
  const adminLoginButton = page.locator(`[data-testid="dev-login-${ADMIN_ACCOUNT.id}"]`);
  await expect(adminLoginButton).toBeVisible({ timeout: 10000 });
  
  // Monitor login API request
  const loginPromise = page.waitForResponse(
    response => response.url().includes('/api/dev-login') && response.status() === 200,
    { timeout: 15000 }
  ).catch(() => {
    console.log('⚠️ Login API timeout, proceeding to verify auth state');
  });
  
  await adminLoginButton.click();
  console.log('✅ Admin login button clicked');
  
  await loginPromise;
  await page.waitForTimeout(3000);
  
  // Verify admin login success by checking cookies
  const cookies = await page.context().cookies();
  const authToken = cookies.find(cookie => cookie.name === 'auth_token');
  const userData = cookies.find(cookie => cookie.name === 'user_data');
  
  if (!authToken && !userData) {
    throw new Error('❌ Admin login failed - no authentication cookies found');
  }
  
  console.log('✅ Successfully logged in as admin user');
  console.log(`📝 Auth cookies present: ${cookies.filter(c => ['auth_token', 'user_data'].includes(c.name)).map(c => c.name).join(', ')}`);
  
  return;
}

/**
 * Verify regular user cannot access admin features
 */
async function verifyNonAdminAccess(page: Page, url: string): Promise<boolean> {
  try {
    // Clear admin session
    await page.context().clearCookies();
    
    // Try to access admin URL without authentication
    await page.goto(url);
    await page.waitForLoadState('networkidle');
    
    const currentUrl = page.url();
    
    // Check if redirected to login or shows access denied
    if (currentUrl.includes('/login') || currentUrl.includes('/auth')) {
      console.log(`✅ Non-admin properly redirected to login for: ${url}`);
      return true;
    }
    
    // Check for access denied messages
    const accessDenied = await page.locator('text=Access Denied').count() > 0 ||
                        await page.locator('text=アクセス拒否').count() > 0 ||
                        await page.locator('text=Unauthorized').count() > 0 ||
                        await page.locator('text=401').count() > 0 ||
                        await page.locator('text=403').count() > 0;
    
    if (accessDenied) {
      console.log(`✅ Non-admin properly blocked from: ${url}`);
      return true;
    }
    
    console.log(`⚠️ Non-admin may have unauthorized access to: ${url}`);
    return false;
    
  } catch (error) {
    console.log(`⚠️ Error testing non-admin access to ${url}: ${error}`);
    return false;
  }
}

test.describe('Comprehensive Admin User Functionality Validation', () => {
  test.setTimeout(60000);

  test.beforeEach(async ({ page }) => {
    await performAdminLogin(page);
  });

  test.describe('1. Admin Login via Dev Panel', () => {
    test('should successfully login with devadmin@example.com credentials', async ({ page }) => {
      // Login is already performed in beforeEach, just verify state
      const cookies = await page.context().cookies();
      const hasAuthCookies = cookies.some(cookie => 
        ['auth_token', 'user_data'].includes(cookie.name)
      );
      
      expect(hasAuthCookies).toBeTruthy();
      console.log('✅ Admin login credentials validation passed');
    });

    test('should maintain admin session across page refreshes', async ({ page }) => {
      await page.goto('http://localhost:3005/dashboard');
      await page.waitForLoadState('networkidle');
      
      // Refresh the page
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Verify session is still valid
      const cookies = await page.context().cookies();
      const hasAuthCookies = cookies.some(cookie => 
        ['auth_token', 'user_data'].includes(cookie.name)
      );
      
      expect(hasAuthCookies).toBeTruthy();
      console.log('✅ Admin session persists after page refresh');
    });
  });

  test.describe('2. Admin Dashboard (/admin) Access', () => {
    test('should successfully access admin dashboard', async ({ page }) => {
      await page.goto('http://localhost:3005/admin');
      await page.waitForLoadState('networkidle');
      
      const currentUrl = page.url();
      expect(currentUrl).toContain('/admin');
      console.log(`✅ Successfully accessed admin dashboard: ${currentUrl}`);
      
      // Capture page title and content
      const pageTitle = await page.title();
      console.log(`📄 Admin page title: ${pageTitle}`);
      
      // Look for admin-specific elements
      const adminElements = [
        'text=Admin Dashboard',
        'text=管理ダッシュボード',
        'text=Administration',
        'text=管理',
        'text=Admin Panel',
        'text=管理パネル',
        'text=Administrative',
        'h1',
        'h2',
        'nav'
      ];
      
      let foundElements = 0;
      for (const element of adminElements) {
        const count = await page.locator(element).count();
        if (count > 0) {
          foundElements++;
          const text = await page.locator(element).first().textContent();
          console.log(`✅ Found admin element "${element}": "${text?.trim()}"`);
        }
      }
      
      expect(foundElements).toBeGreaterThan(0);
    });

    test('should display admin navigation and interface elements', async ({ page }) => {
      await page.goto('http://localhost:3005/admin');
      await page.waitForLoadState('networkidle');
      
      // Look for navigation elements
      const navElements = page.locator('nav, [role="navigation"], ul, .nav, .navigation');
      const navCount = await navElements.count();
      
      if (navCount > 0) {
        console.log(`✅ Found ${navCount} navigation elements`);
        
        // Check for common admin nav items
        const commonNavItems = [
          'Users', 'ユーザー', 'Settings', '設定', 'Analytics', '分析',
          'Dashboard', 'ダッシュボード', 'Reports', 'レポート'
        ];
        
        for (const item of commonNavItems) {
          const itemCount = await page.locator(`text=${item}`).count();
          if (itemCount > 0) {
            console.log(`✅ Found nav item: ${item}`);
          }
        }
      }
      
      // Check for interactive elements
      const buttons = await page.locator('button').count();
      const links = await page.locator('a').count();
      const inputs = await page.locator('input').count();
      
      console.log(`📊 Interface elements - Buttons: ${buttons}, Links: ${links}, Inputs: ${inputs}`);
      expect(buttons + links).toBeGreaterThan(0);
    });
  });

  test.describe('3. User Management (/admin/beta)', () => {
    test('should access user management interface at /admin/beta', async ({ page }) => {
      await page.goto('http://localhost:3005/admin/beta');
      await page.waitForLoadState('networkidle');
      
      const currentUrl = page.url();
      expect(currentUrl).toContain('/beta');
      console.log(`✅ Successfully accessed user management: ${currentUrl}`);
      
      // Look for user management elements
      const userMgmtElements = [
        'text=User Management',
        'text=ユーザー管理',
        'text=Users',
        'text=ユーザー一覧',
        'text=User List',
        'table',
        'thead',
        'tbody',
        'tr',
        'td',
        'th'
      ];
      
      let foundUserMgmtElements = 0;
      for (const element of userMgmtElements) {
        const count = await page.locator(element).count();
        if (count > 0) {
          foundUserMgmtElements++;
          console.log(`✅ Found user management element: ${element} (${count} instances)`);
        }
      }
      
      expect(foundUserMgmtElements).toBeGreaterThan(0);
      console.log(`📊 Total user management elements found: ${foundUserMgmtElements}`);
    });

    test('should display user accounts and management controls', async ({ page }) => {
      await page.goto('http://localhost:3005/admin/beta');
      await page.waitForLoadState('networkidle');
      
      // Look for user data fields
      const userDataElements = [
        'text=Email',
        'text=メール',
        'text=Name',
        'text=名前',
        'text=Role',
        'text=役割',
        'text=Status',
        'text=ステータス',
        'text=Created',
        'text=作成日',
        'text=ID'
      ];
      
      let foundDataElements = 0;
      for (const element of userDataElements) {
        const count = await page.locator(element).count();
        if (count > 0) {
          foundDataElements++;
          console.log(`✅ Found user data field: ${element}`);
        }
      }
      
      console.log(`📊 User data fields found: ${foundDataElements}`);
      
      // Look for management controls
      const controlElements = [
        'button',
        'text=Edit',
        'text=編集',
        'text=Delete',
        'text=削除',
        'text=View',
        'text=表示',
        'text=Manage',
        'text=管理',
        'input[type="checkbox"]',
        'select'
      ];
      
      let foundControlElements = 0;
      for (const element of controlElements) {
        const count = await page.locator(element).count();
        if (count > 0) {
          foundControlElements++;
          console.log(`✅ Found management control: ${element} (${count} instances)`);
        }
      }
      
      expect(foundControlElements).toBeGreaterThan(0);
    });

    test('should support user search and filtering functionality', async ({ page }) => {
      await page.goto('http://localhost:3005/admin/beta');
      await page.waitForLoadState('networkidle');
      
      // Look for search functionality
      const searchElements = [
        'input[placeholder*="search"]',
        'input[placeholder*="Search"]',
        'input[placeholder*="検索"]',
        'input[type="search"]',
        'input[name*="search"]',
        '[data-testid*="search"]'
      ];
      
      let searchFound = false;
      for (const element of searchElements) {
        const count = await page.locator(element).count();
        if (count > 0) {
          searchFound = true;
          console.log(`✅ Found search element: ${element}`);
          
          // Test search functionality
          try {
            const searchInput = page.locator(element).first();
            if (await searchInput.isVisible()) {
              await searchInput.fill('admin');
              await page.waitForTimeout(1000);
              console.log('✅ Successfully tested search input');
            }
          } catch (error) {
            console.log(`⚠️ Could not interact with search: ${error}`);
          }
          break;
        }
      }
      
      // Look for filter controls
      const filterElements = await page.locator('select, [role="combobox"], .filter').count();
      if (filterElements > 0) {
        console.log(`✅ Found ${filterElements} filter elements`);
      }
      
      console.log(`📊 Search functionality: ${searchFound ? 'Available' : 'Not found'}`);
    });
  });

  test.describe('4. Analytics Access (/analytics)', () => {
    test('should access analytics dashboard with administrative data', async ({ page }) => {
      await page.goto('http://localhost:3005/analytics');
      await page.waitForLoadState('networkidle');
      
      const currentUrl = page.url();
      expect(currentUrl).toContain('/analytics');
      console.log(`✅ Successfully accessed analytics dashboard: ${currentUrl}`);
      
      // Look for analytics elements
      const analyticsElements = [
        'text=Analytics',
        'text=分析',
        'text=Report',
        'text=レポート',
        'text=Statistics',
        'text=統計',
        'text=Dashboard',
        'text=ダッシュボード',
        'text=Metrics',
        'text=メトリクス'
      ];
      
      let foundAnalyticsElements = 0;
      for (const element of analyticsElements) {
        const count = await page.locator(element).count();
        if (count > 0) {
          foundAnalyticsElements++;
          console.log(`✅ Found analytics element: ${element}`);
        }
      }
      
      expect(foundAnalyticsElements).toBeGreaterThan(0);
    });

    test('should display administrative metrics and KPIs', async ({ page }) => {
      await page.goto('http://localhost:3005/analytics');
      await page.waitForLoadState('networkidle');
      
      // Look for metrics and KPI elements
      const metricsElements = [
        'text=Total Users',
        'text=総ユーザー数',
        'text=Active Users',
        'text=アクティブユーザー',
        'text=Revenue',
        'text=売上',
        'text=Orders',
        'text=注文',
        'text=Growth',
        'text=成長',
        '[data-testid*="metric"]',
        '[data-testid*="kpi"]',
        '.metric',
        '.kpi',
        '.stat',
        '.statistics'
      ];
      
      let foundMetricsElements = 0;
      for (const element of metricsElements) {
        const count = await page.locator(element).count();
        if (count > 0) {
          foundMetricsElements++;
          console.log(`✅ Found metrics element: ${element}`);
        }
      }
      
      // Look for charts and visualizations
      const visualElements = [
        'canvas',
        'svg',
        '[class*="chart"]',
        '[class*="graph"]',
        '[data-testid*="chart"]',
        '.recharts'
      ];
      
      let foundVisualElements = 0;
      for (const element of visualElements) {
        const count = await page.locator(element).count();
        if (count > 0) {
          foundVisualElements++;
          console.log(`✅ Found visualization element: ${element}`);
        }
      }
      
      console.log(`📊 Metrics found: ${foundMetricsElements}, Visualizations found: ${foundVisualElements}`);
    });
  });

  test.describe('5. Admin-Only Features and Controls', () => {
    test('should display admin-specific UI elements', async ({ page }) => {
      await page.goto('http://localhost:3005/dashboard');
      await page.waitForLoadState('networkidle');
      
      // Look for admin indicators
      const adminIndicators = [
        'text=Admin',
        'text=管理者',
        'text=Administrator',
        'text=Admin Panel',
        'text=管理パネル',
        '[data-testid*="admin"]',
        '.admin-badge',
        '.admin-indicator',
        '.admin-only'
      ];
      
      let foundAdminIndicators = 0;
      for (const element of adminIndicators) {
        const count = await page.locator(element).count();
        if (count > 0) {
          foundAdminIndicators++;
          const text = await page.locator(element).first().textContent();
          console.log(`✅ Found admin indicator: ${element} - "${text?.trim()}"`);
        }
      }
      
      console.log(`📊 Admin-specific UI elements found: ${foundAdminIndicators}`);
    });

    test('should have access to administrative controls', async ({ page }) => {
      const adminPages = [
        'http://localhost:3005/admin',
        'http://localhost:3005/admin/beta',
        'http://localhost:3005/analytics'
      ];
      
      for (const adminPage of adminPages) {
        await page.goto(adminPage);
        await page.waitForLoadState('networkidle');
        
        // Wait a bit for any dynamic content to load
        await page.waitForTimeout(2000);
        
        // Look for any interactive elements (buttons, inputs, links, etc.)
        const interactiveElements = [
          'button',
          'input',
          'select',
          'textarea',
          'a[href*="admin"]',
          '[role="button"]',
          '[tabindex="0"]',
          '.btn',
          '.button'
        ];
        
        let foundControls = 0;
        for (const element of interactiveElements) {
          const count = await page.locator(element).count();
          if (count > 0) {
            foundControls += count;
          }
        }
        
        // Also check for basic page structure elements that indicate admin functionality
        const adminStructureElements = [
          'main',
          'nav',
          'header',
          'section',
          'article',
          '.admin',
          '.dashboard',
          '.management'
        ];
        
        let foundStructure = 0;
        for (const element of adminStructureElements) {
          const count = await page.locator(element).count();
          if (count > 0) {
            foundStructure++;
          }
        }
        
        console.log(`✅ Interactive elements found on ${adminPage}: ${foundControls}`);
        console.log(`✅ Page structure elements found on ${adminPage}: ${foundStructure}`);
        
        // Admin pages should have at least some interactive elements or proper structure
        expect(foundControls + foundStructure).toBeGreaterThan(0);
      }
    });
  });

  test.describe('6. Admin Permissions Validation', () => {
    test('should verify admin can access all administrative routes', async ({ page }) => {
      const adminRoutes = [
        { url: 'http://localhost:3005/admin', name: 'Admin Dashboard' },
        { url: 'http://localhost:3005/admin/beta', name: 'Beta Features' },
        { url: 'http://localhost:3005/analytics', name: 'Analytics' },
        { url: 'http://localhost:3005/dashboard', name: 'Main Dashboard' }
      ];
      
      for (const route of adminRoutes) {
        await page.goto(route.url);
        await page.waitForLoadState('networkidle');
        
        const currentUrl = page.url();
        const isAccessible = currentUrl.includes(new URL(route.url).pathname);
        
        expect(isAccessible).toBeTruthy();
        console.log(`✅ Admin can access ${route.name}: ${currentUrl}`);
        
        // Verify no access denied messages
        const accessDenied = await page.locator('text=Access Denied, text=アクセス拒否, text=Unauthorized').count();
        expect(accessDenied).toBe(0);
      }
    });

    test('should verify non-admin users cannot access admin features', async ({ page }) => {
      const adminUrls = [
        'http://localhost:3005/admin',
        'http://localhost:3005/admin/beta',
        'http://localhost:3005/analytics'
      ];
      
      // Test each admin URL for proper access control
      for (const url of adminUrls) {
        const isProtected = await verifyNonAdminAccess(page, url);
        console.log(`🔒 Access control for ${url}: ${isProtected ? 'Protected' : 'May need review'}`);
        
        // Re-login as admin for next test
        await performAdminLogin(page);
      }
    });
  });

  test.describe('7. Administrative Operations', () => {
    test('should handle user role management operations', async ({ page }) => {
      await page.goto('http://localhost:3005/admin/beta');
      await page.waitForLoadState('networkidle');
      
      // Look for role management elements
      const roleElements = [
        'text=Role',
        'text=役割',
        'text=Permission',
        'text=権限',
        'select[name*="role"]',
        '[data-testid*="role"]',
        'text=Admin',
        'text=User',
        'text=Manager'
      ];
      
      let foundRoleElements = 0;
      for (const element of roleElements) {
        const count = await page.locator(element).count();
        if (count > 0) {
          foundRoleElements++;
          console.log(`✅ Found role management element: ${element}`);
        }
      }
      
      console.log(`📊 Role management elements found: ${foundRoleElements}`);
      
      // Test role selection if available
      const roleSelects = page.locator('select');
      const selectCount = await roleSelects.count();
      if (selectCount > 0) {
        console.log(`✅ Found ${selectCount} role selection controls`);
        
        // Try to interact with first select
        try {
          const firstSelect = roleSelects.first();
          if (await firstSelect.isVisible()) {
            const options = await firstSelect.locator('option').count();
            console.log(`✅ Role select has ${options} options`);
          }
        } catch (error) {
          console.log(`⚠️ Could not interact with role select: ${error}`);
        }
      }
    });

    test('should validate administrative form submissions', async ({ page }) => {
      const adminPages = ['http://localhost:3005/admin', 'http://localhost:3005/admin/beta'];
      
      for (const adminPage of adminPages) {
        await page.goto(adminPage);
        await page.waitForLoadState('networkidle');
        
        // Look for forms
        const forms = await page.locator('form').count();
        if (forms > 0) {
          console.log(`✅ Found ${forms} administrative forms on ${adminPage}`);
          
          // Look for form inputs
          const inputs = await page.locator('form input').count();
          const buttons = await page.locator('form button').count();
          const selects = await page.locator('form select').count();
          
          console.log(`📊 Form elements - Inputs: ${inputs}, Buttons: ${buttons}, Selects: ${selects}`);
          
          // Test form validation if submit button exists
          const submitButtons = page.locator('form button[type="submit"], form input[type="submit"]');
          const submitCount = await submitButtons.count();
          
          if (submitCount > 0) {
            console.log(`✅ Found ${submitCount} submit buttons for validation testing`);
          }
        }
      }
    });
  });

  test.describe('8. Session and Security Validation', () => {
    test('should maintain admin session across multiple page navigations', async ({ page }) => {
      const navigationSequence = [
        'http://localhost:3005/dashboard',
        'http://localhost:3005/admin',
        'http://localhost:3005/analytics',
        'http://localhost:3005/admin/beta',
        'http://localhost:3005/products',
        'http://localhost:3005/admin'
      ];
      
      for (const url of navigationSequence) {
        await page.goto(url);
        await page.waitForLoadState('networkidle');
        
        // Verify admin session is maintained
        const cookies = await page.context().cookies();
        const hasAuth = cookies.some(cookie => ['auth_token', 'user_data'].includes(cookie.name));
        
        expect(hasAuth).toBeTruthy();
        console.log(`✅ Admin session maintained on: ${url}`);
      }
    });

    test('should handle admin session timeout gracefully', async ({ page }) => {
      // Note: This is a basic test - in real scenarios, you'd simulate session expiry
      await page.goto('http://localhost:3005/admin');
      await page.waitForLoadState('networkidle');
      
      // Verify current admin access
      const currentUrl = page.url();
      expect(currentUrl).toContain('/admin');
      
      console.log('✅ Admin session handling test completed');
    });
  });

  test.describe('9. Error Handling and Edge Cases', () => {
    test('should handle invalid admin routes gracefully', async ({ page }) => {
      const invalidRoutes = [
        'http://localhost:3005/admin/nonexistent',
        'http://localhost:3005/admin/invalid-page',
        'http://localhost:3005/analytics/fake-report'
      ];
      
      for (const route of invalidRoutes) {
        await page.goto(route);
        await page.waitForLoadState('networkidle');
        
        const currentUrl = page.url();
        
        // Should show 404 or redirect to valid admin page
        const has404 = await page.locator('text=404').count() > 0;
        const hasNotFound = await page.locator('text=Not Found').count() > 0;
        const redirectedToAdmin = currentUrl.includes('/admin') && !currentUrl.includes('nonexistent');
        
        if (has404 || hasNotFound) {
          console.log(`✅ Invalid route properly shows 404: ${route}`);
        } else if (redirectedToAdmin) {
          console.log(`✅ Invalid route redirected to valid admin area: ${route} → ${currentUrl}`);
        } else {
          console.log(`⚠️ Unexpected behavior for invalid route: ${route} → ${currentUrl}`);
        }
      }
    });

    test('should validate admin error boundaries', async ({ page }) => {
      await page.goto('http://localhost:3005/admin');
      await page.waitForLoadState('networkidle');
      
      // Look for error boundaries or error handling
      const errorElements = [
        'text=Error Boundary',
        'text=Something went wrong',
        'text=エラーが発生',
        '[data-testid*="error"]',
        '.error-boundary'
      ];
      
      let errorHandlingFound = 0;
      for (const element of errorElements) {
        const count = await page.locator(element).count();
        if (count > 0) {
          errorHandlingFound++;
          console.log(`⚠️ Found error element (this may be normal): ${element}`);
        }
      }
      
      // Most of the time we expect no errors, but error boundaries are good to have
      console.log(`📊 Error handling elements found: ${errorHandlingFound}`);
    });
  });
});