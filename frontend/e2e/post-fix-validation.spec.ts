import { test, expect } from '@playwright/test';

test.describe('Post-Fix Validation Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3005');
  });

  test('should show and interact with dev login panel', async ({ page }) => {
    console.log('🧪 Testing dev login panel visibility');
    
    // Check if dev panel toggle exists
    const showDevButton = page.locator('[data-testid="show-dev-panel"]');
    await expect(showDevButton).toBeVisible();
    console.log('✅ Dev panel toggle button found');
    
    // Click to show dev panel
    await showDevButton.click();
    await page.waitForTimeout(1000);
    
    // Check if dev login buttons are now visible
    const testUser1Button = page.locator('[data-testid="dev-login-test-user-1"]');
    const adminButton = page.locator('[data-testid="dev-login-test-admin"]');
    const sellerButton = page.locator('[data-testid="dev-login-test-seller"]');
    
    await expect(testUser1Button).toBeVisible();
    await expect(adminButton).toBeVisible();
    await expect(sellerButton).toBeVisible();
    
    console.log('✅ All dev login buttons are visible');
  });

  test('should successfully login as admin and access admin dashboard', async ({ page }) => {
    console.log('🔐 Testing admin login flow');
    
    // Show dev panel
    await page.locator('[data-testid="show-dev-panel"]').click();
    await page.waitForTimeout(1000);
    
    // Click admin login button
    const adminButton = page.locator('[data-testid="dev-login-test-admin"]');
    await expect(adminButton).toBeVisible();
    
    // Set up API interception to monitor login
    let loginSuccessful = false;
    page.on('response', async response => {
      if (response.url().includes('/api/dev-login') && response.status() === 200) {
        try {
          const data = await response.json();
          console.log('✅ Login API successful:', data.user?.role);
          loginSuccessful = true;
        } catch (error) {
          console.log('Could not parse login response, but got 200 status');
          loginSuccessful = true;
        }
      }
    });
    
    await adminButton.click();
    
    // Wait for redirect to dashboard  
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    console.log('✅ Redirected to dashboard');
    
    // Now try to access admin page
    await page.goto('http://localhost:3005/admin');
    
    // Check if we can access admin page (should not redirect to not-found)
    await page.waitForTimeout(2000);
    const currentUrl = page.url();
    console.log('Current URL after admin access:', currentUrl);
    
    if (currentUrl.includes('/not-found')) {
      console.log('❌ Admin was redirected to not-found page');
      
      // Let's check the cookies to see what's wrong
      const cookies = await page.context().cookies();
      console.log('Cookies after login:', cookies.map(c => ({ name: c.name, httpOnly: c.httpOnly })));
      
      throw new Error('Admin user was incorrectly redirected to not-found page');
    }
    
    // Check for admin page content
    await expect(page.locator('text=Admin Dashboard')).toBeVisible({ timeout: 10000 });
    console.log('✅ Admin dashboard is accessible');
  });

  test('should successfully login as regular user and verify restrictions', async ({ page }) => {
    console.log('🔐 Testing regular user login and access restrictions');
    
    // Show dev panel and login as regular user
    await page.locator('[data-testid="show-dev-panel"]').click();
    await page.waitForTimeout(1000);
    
    const testUserButton = page.locator('[data-testid="dev-login-test-user-1"]');
    await testUserButton.click();
    
    // Wait for redirect to dashboard  
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    console.log('✅ Regular user redirected to dashboard');
    
    // Try to access admin page (should be redirected)
    await page.goto('http://localhost:3005/admin');
    await page.waitForTimeout(2000);
    
    const currentUrl = page.url();
    console.log('Current URL after admin access attempt:', currentUrl);
    
    if (currentUrl.includes('/admin')) {
      throw new Error('Regular user should not be able to access admin page');
    }
    
    console.log('✅ Regular user properly restricted from admin access');
  });

  test('should verify UI components render correctly', async ({ page }) => {
    console.log('🎨 Testing UI component rendering');
    
    // Check main navigation
    const header = page.locator('header');
    await expect(header).toBeVisible();
    
    const logo = page.locator('header a[href="/"]');
    await expect(logo).toBeVisible();
    
    // Check footer
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
    
    // Check main content area
    const main = page.locator('main');
    await expect(main).toBeVisible();
    
    console.log('✅ All main UI components are rendering');
  });

  test('should test products page functionality', async ({ page }) => {
    console.log('🛍️ Testing products page');
    
    await page.goto('http://localhost:3005/products');
    
    // Check if page loads
    await expect(page.locator('[role="main"]')).toBeVisible();
    
    // Check for any error states
    const errorElements = await page.locator('text=Error').count();
    const notFoundElements = await page.locator('text=404').count();
    
    if (errorElements > 0 || notFoundElements > 0) {
      console.log('❌ Products page shows error state');
    } else {
      console.log('✅ Products page loads without errors');
    }
  });

  test('should verify cart functionality exists', async ({ page }) => {
    console.log('🛒 Testing cart page');
    
    await page.goto('http://localhost:3005/cart');
    
    // Check if page loads
    await expect(page.locator('[role="main"]')).toBeVisible();
    
    // Check for any error states
    const errorElements = await page.locator('text=Error').count();
    const notFoundElements = await page.locator('text=404').count();
    
    if (errorElements > 0 || notFoundElements > 0) {
      console.log('❌ Cart page shows error state');
    } else {
      console.log('✅ Cart page loads without errors');
    }
  });
});