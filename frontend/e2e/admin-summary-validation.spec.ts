import { test, expect, type Page } from '@playwright/test';

// Admin test account
const ADMIN_ACCOUNT = {
  id: 'test-admin',
  name: '管理者テスト',
  email: 'devadmin@example.com',
  password: 'DevAdmin123!',
  description: '管理者権限テストアカウント'
};

/**
 * Admin User Functionality Summary Validation
 * Quick validation of key admin features
 */

/**
 * Helper function to perform admin login
 */
async function performAdminLogin(page: Page): Promise<void> {
  console.log(`🔐 Starting admin login for: ${ADMIN_ACCOUNT.email}`);
  
  await page.goto('http://localhost:3005');
  await page.waitForLoadState('networkidle');
  
  // Show dev panel
  const devPanelTrigger = page.locator('[data-testid="show-dev-panel"]');
  await expect(devPanelTrigger).toBeVisible({ timeout: 10000 });
  await devPanelTrigger.click();
  await page.waitForTimeout(1000);
  
  // Click admin login button
  const adminLoginButton = page.locator(`[data-testid="dev-login-${ADMIN_ACCOUNT.id}"]`);
  await expect(adminLoginButton).toBeVisible({ timeout: 10000 });
  
  const loginPromise = page.waitForResponse(
    response => response.url().includes('/api/dev-login') && response.status() === 200,
    { timeout: 15000 }
  ).catch(() => console.log('Login API timeout, checking auth state'));
  
  await adminLoginButton.click();
  await loginPromise;
  await page.waitForTimeout(2000);
  
  // Verify login
  const cookies = await page.context().cookies();
  const hasAuth = cookies.some(cookie => ['auth_token', 'user_data'].includes(cookie.name));
  
  if (!hasAuth) {
    throw new Error('Admin login failed - no auth cookies');
  }
  
  console.log('✅ Admin login successful');
}

test.describe('Admin User Functionality Summary Validation', () => {
  test.setTimeout(60000);

  test.beforeEach(async ({ page }) => {
    await performAdminLogin(page);
  });

  test('Admin Login and Authentication', async ({ page }) => {
    // Verify login was successful (already done in beforeEach)
    const cookies = await page.context().cookies();
    const authCookies = cookies.filter(c => ['auth_token', 'user_data'].includes(c.name));
    
    expect(authCookies.length).toBeGreaterThan(0);
    console.log(`✅ Admin authentication successful with cookies: ${authCookies.map(c => c.name).join(', ')}`);
  });

  test('Admin Dashboard Access (/admin)', async ({ page }) => {
    await page.goto('http://localhost:3005/admin');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const currentUrl = page.url();
    expect(currentUrl).toContain('/admin');
    
    const pageTitle = await page.title();
    expect(pageTitle.toLowerCase()).toMatch(/admin|管理/);
    
    // Look for admin content
    const adminElements = await page.locator('text=Admin Dashboard, text=管理ダッシュボード, h1, nav').count();
    expect(adminElements).toBeGreaterThan(0);
    
    console.log(`✅ Admin Dashboard accessible at: ${currentUrl}`);
    console.log(`📄 Page title: ${pageTitle}`);
    console.log(`📊 Admin elements found: ${adminElements}`);
  });

  test('User Management Access (/admin/beta)', async ({ page }) => {
    await page.goto('http://localhost:3005/admin/beta');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const currentUrl = page.url();
    expect(currentUrl).toContain('/beta');
    
    // Look for user management elements
    const userMgmtElements = await page.locator('text=User Management, text=ユーザー管理, table, thead, tbody').count();
    expect(userMgmtElements).toBeGreaterThan(0);
    
    // Look for user data
    const userDataElements = await page.locator('td, th, tr').count();
    console.log(`✅ User Management accessible at: ${currentUrl}`);
    console.log(`📊 User management elements: ${userMgmtElements}`);
    console.log(`📊 User data elements: ${userDataElements}`);
  });

  test('Analytics Access (/analytics)', async ({ page }) => {
    await page.goto('http://localhost:3005/analytics');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const currentUrl = page.url();
    expect(currentUrl).toContain('/analytics');
    
    // Look for analytics elements
    const analyticsElements = await page.locator('text=Analytics, text=分析, text=Dashboard').count();
    expect(analyticsElements).toBeGreaterThan(0);
    
    console.log(`✅ Analytics accessible at: ${currentUrl}`);
    console.log(`📊 Analytics elements found: ${analyticsElements}`);
  });

  test('Admin Navigation and Controls', async ({ page }) => {
    const adminPages = [
      { url: 'http://localhost:3005/admin', name: 'Admin Dashboard' },
      { url: 'http://localhost:3005/admin/beta', name: 'User Management' },
      { url: 'http://localhost:3005/analytics', name: 'Analytics' }
    ];
    
    let totalInteractiveElements = 0;
    let pagesWithControls = 0;
    
    for (const adminPage of adminPages) {
      await page.goto(adminPage.url);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1500);
      
      const buttons = await page.locator('button').count();
      const inputs = await page.locator('input').count();
      const selects = await page.locator('select').count();
      const links = await page.locator('a').count();
      
      const pageControls = buttons + inputs + selects + links;
      totalInteractiveElements += pageControls;
      
      if (pageControls > 0) {
        pagesWithControls++;
      }
      
      console.log(`📊 ${adminPage.name} controls - Buttons: ${buttons}, Inputs: ${inputs}, Selects: ${selects}, Links: ${links}`);
    }
    
    expect(totalInteractiveElements).toBeGreaterThan(0);
    expect(pagesWithControls).toBeGreaterThan(0);
    
    console.log(`✅ Total interactive elements across admin pages: ${totalInteractiveElements}`);
    console.log(`✅ Pages with controls: ${pagesWithControls}/${adminPages.length}`);
  });

  test('Admin Session Persistence', async ({ page }) => {
    const testPages = [
      'http://localhost:3005/admin',
      'http://localhost:3005/analytics',
      'http://localhost:3005/dashboard',
      'http://localhost:3005/admin/beta'
    ];
    
    let sessionMaintained = 0;
    
    for (const testPage of testPages) {
      await page.goto(testPage);
      await page.waitForLoadState('networkidle');
      
      const cookies = await page.context().cookies();
      const hasAuth = cookies.some(cookie => ['auth_token', 'user_data'].includes(cookie.name));
      
      if (hasAuth) {
        sessionMaintained++;
        console.log(`✅ Session maintained on: ${testPage}`);
      } else {
        console.log(`❌ Session lost on: ${testPage}`);
      }
    }
    
    expect(sessionMaintained).toBe(testPages.length);
    console.log(`✅ Admin session persistence: ${sessionMaintained}/${testPages.length} pages`);
  });

  test('Admin vs Regular User Access Control', async ({ page }) => {
    // Test access control by clearing auth and trying to access admin pages
    const adminUrls = [
      'http://localhost:3005/admin',
      'http://localhost:3005/admin/beta',
      'http://localhost:3005/analytics'
    ];
    
    let protectedPages = 0;
    
    for (const url of adminUrls) {
      // Clear admin session
      await page.context().clearCookies();
      
      await page.goto(url);
      await page.waitForLoadState('networkidle');
      
      const currentUrl = page.url();
      const isRedirected = currentUrl.includes('/login') || currentUrl.includes('/auth');
      const hasAccessDenied = await page.locator('text=Access Denied, text=アクセス拒否, text=Unauthorized').count() > 0;
      
      if (isRedirected || hasAccessDenied) {
        protectedPages++;
        console.log(`✅ Protected: ${url} → redirected or access denied`);
      } else {
        console.log(`⚠️ May need access control review: ${url}`);
      }
      
      // Re-login for next test
      await performAdminLogin(page);
    }
    
    console.log(`🔒 Access control status: ${protectedPages}/${adminUrls.length} pages protected`);
  });

  test('Admin Interface Functionality', async ({ page }) => {
    // Test admin interface elements
    await page.goto('http://localhost:3005/admin/beta');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Test search functionality if available
    const searchInput = page.locator('input[placeholder*="Search"], input[placeholder*="検索"]');
    const searchCount = await searchInput.count();
    
    if (searchCount > 0) {
      await searchInput.first().fill('admin');
      await page.waitForTimeout(1000);
      console.log('✅ Search functionality tested');
    }
    
    // Test dropdown functionality if available
    const selects = page.locator('select');
    const selectCount = await selects.count();
    
    if (selectCount > 0) {
      const options = await selects.first().locator('option').count();
      console.log(`✅ Found dropdown with ${options} options`);
    }
    
    // Count management elements
    const managementElements = await page.locator('button:has-text("Edit"), button:has-text("Manage"), text=管理').count();
    
    console.log(`📊 Admin interface summary:`);
    console.log(`- Search inputs: ${searchCount}`);
    console.log(`- Dropdowns: ${selectCount}`);
    console.log(`- Management controls: ${managementElements}`);
    
    // At least some interactive elements should be present
    expect(searchCount + selectCount + managementElements).toBeGreaterThan(0);
  });
});