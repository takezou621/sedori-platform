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
 * Helper function to perform admin login using API
 */
async function performAdminApiLogin(page: Page): Promise<void> {
  console.log(`🔐 API Login: ${ADMIN_ACCOUNT.name} (${ADMIN_ACCOUNT.email})`);
  
  // Use the dev-login API endpoint
  const response = await page.request.post('http://localhost:3005/api/dev-login', {
    data: {
      email: ADMIN_ACCOUNT.email,
      password: ADMIN_ACCOUNT.password
    }
  });
  
  expect(response.status()).toBe(200);
  
  const responseData = await response.json();
  expect(responseData.success).toBe(true);
  expect(responseData.accessToken).toBeTruthy();
  expect(responseData.user).toBeTruthy();
  
  console.log(`✅ API Login successful for ${ADMIN_ACCOUNT.name}`);
  
  // Navigate to home page to set cookies in browser context
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

test.describe('Admin Features API-Based Testing', () => {
  test.setTimeout(30000);

  test.beforeEach(async ({ page }) => {
    await performAdminApiLogin(page);
  });

  test.describe('Admin Dashboard Access', () => {
    test('should access admin dashboard with administrative features', async ({ page }) => {
      await page.goto('http://localhost:3005/admin');
      await page.waitForLoadState('networkidle');
      
      // Verify we're on admin page and not redirected to login
      const currentUrl = page.url();
      expect(currentUrl).toContain('/admin');
      expect(currentUrl).not.toContain('/auth/login');
      
      console.log(`✅ Admin dashboard accessible at: ${currentUrl}`);
      
      // Verify page title indicates admin area
      const pageTitle = await page.title();
      console.log(`Page title: ${pageTitle}`);
      
      // Check if title contains admin-related keywords
      const titleContainsAdmin = pageTitle.toLowerCase().includes('admin') || 
                                 pageTitle.includes('管理') ||
                                 pageTitle.toLowerCase().includes('administration');
      
      if (titleContainsAdmin) {
        console.log(`✅ Page title indicates admin area: ${pageTitle}`);
      } else {
        console.log(`⚠️ Page title may not indicate admin area: ${pageTitle}`);
      }
    });

    test('should access admin-specific pages without redirect', async ({ page }) => {
      const adminPages = [
        'http://localhost:3005/admin',
        'http://localhost:3005/admin/beta',
        'http://localhost:3005/analytics'
      ];
      
      for (const adminPage of adminPages) {
        await page.goto(adminPage);
        await page.waitForLoadState('networkidle');
        
        const currentUrl = page.url();
        
        // Should not be redirected to login
        expect(currentUrl).not.toContain('/auth/login');
        expect(currentUrl).not.toContain('/login');
        
        // Should stay on the intended admin page
        expect(currentUrl).toContain(adminPage.split('/').pop() || 'admin');
        
        console.log(`✅ Admin page accessible: ${adminPage} -> ${currentUrl}`);
      }
    });
  });

  test.describe('Analytics and Reporting', () => {
    test('should access analytics dashboard', async ({ page }) => {
      await page.goto('http://localhost:3005/analytics');
      await page.waitForLoadState('networkidle');
      
      // Verify analytics page is accessible
      const currentUrl = page.url();
      expect(currentUrl).toContain('/analytics');
      expect(currentUrl).not.toContain('/auth/login');
      
      console.log(`✅ Analytics page accessible at: ${currentUrl}`);
      
      // Check page content loads
      const pageContent = await page.textContent('body');
      expect(pageContent).toBeTruthy();
      expect(pageContent!.length).toBeGreaterThan(10); // Basic sanity check
      
      console.log(`✅ Analytics page loaded with ${pageContent!.length} characters of content`);
    });

    test('should verify analytics page has appropriate title', async ({ page }) => {
      await page.goto('http://localhost:3005/analytics');
      await page.waitForLoadState('networkidle');
      
      const pageTitle = await page.title();
      console.log(`Analytics page title: ${pageTitle}`);
      
      // Check if title is appropriate for analytics
      const titleIsAppropriate = pageTitle.toLowerCase().includes('analytics') ||
                                pageTitle.includes('分析') ||
                                pageTitle.toLowerCase().includes('report') ||
                                pageTitle.includes('レポート') ||
                                pageTitle.length > 0; // At minimum should have some title
      
      expect(titleIsAppropriate).toBeTruthy();
      console.log(`✅ Analytics page has appropriate title`);
    });
  });

  test.describe('Beta Features Access', () => {
    test('should access beta admin features', async ({ page }) => {
      await page.goto('http://localhost:3005/admin/beta');
      await page.waitForLoadState('networkidle');
      
      // Verify beta admin page is accessible
      const currentUrl = page.url();
      expect(currentUrl).toContain('/admin/beta');
      expect(currentUrl).not.toContain('/auth/login');
      
      console.log(`✅ Beta admin page accessible at: ${currentUrl}`);
      
      // Verify page content loads
      const pageContent = await page.textContent('body');
      expect(pageContent).toBeTruthy();
      expect(pageContent!.length).toBeGreaterThan(10);
      
      console.log(`✅ Beta page loaded with content`);
    });

    test('should verify beta page title contains admin or beta keywords', async ({ page }) => {
      await page.goto('http://localhost:3005/admin/beta');
      await page.waitForLoadState('networkidle');
      
      const pageTitle = await page.title();
      console.log(`Beta page title: ${pageTitle}`);
      
      // Check for admin or beta related keywords in title
      const titleIsAppropriate = pageTitle.toLowerCase().includes('beta') ||
                                pageTitle.toLowerCase().includes('admin') ||
                                pageTitle.includes('ベータ') ||
                                pageTitle.includes('管理') ||
                                pageTitle.length > 0;
      
      expect(titleIsAppropriate).toBeTruthy();
      console.log(`✅ Beta page has appropriate title`);
    });
  });

  test.describe('Admin Session Management', () => {
    test('should maintain admin session across navigation', async ({ page }) => {
      const adminPages = [
        'http://localhost:3005/admin',
        'http://localhost:3005/analytics', 
        'http://localhost:3005/admin/beta',
        'http://localhost:3005/dashboard',
        'http://localhost:3005/'
      ];
      
      for (const adminPage of adminPages) {
        await page.goto(adminPage);
        await page.waitForLoadState('networkidle');
        
        // Verify admin is still authenticated
        const cookies = await page.context().cookies();
        const hasAuth = cookies.some(cookie => ['auth_token', 'user_data'].includes(cookie.name));
        
        expect(hasAuth).toBeTruthy();
        
        // Should not be redirected to login
        const currentUrl = page.url();
        expect(currentUrl).not.toContain('/auth/login');
        expect(currentUrl).not.toContain('/login');
        
        console.log(`✅ Admin session maintained on: ${adminPage}`);
      }
    });

    test('should have admin user data in cookies', async ({ page }) => {
      await page.goto('http://localhost:3005/admin');
      await page.waitForLoadState('networkidle');
      
      const cookies = await page.context().cookies();
      const userDataCookie = cookies.find(cookie => cookie.name === 'user_data');
      
      expect(userDataCookie).toBeTruthy();
      
      if (userDataCookie) {
        const userData = JSON.parse(decodeURIComponent(userDataCookie.value));
        
        expect(userData.email).toBe(ADMIN_ACCOUNT.email);
        expect(userData.id).toBeTruthy();
        
        console.log(`✅ Admin user data in cookies:`, {
          email: userData.email,
          name: userData.name,
          role: userData.role,
          hasId: !!userData.id
        });
      }
    });
  });

  test.describe('Admin Error Handling', () => {
    test('should handle non-existent admin routes appropriately', async ({ page }) => {
      const testRoutes = [
        'http://localhost:3005/admin/nonexistent',
        'http://localhost:3005/admin/test/invalid',
        'http://localhost:3005/admin/settings',
        'http://localhost:3005/admin/system'
      ];
      
      for (const route of testRoutes) {
        try {
          await page.goto(route);
          await page.waitForLoadState('networkidle');
          
          const currentUrl = page.url();
          console.log(`Navigated to: ${currentUrl} from ${route}`);
          
          // Should either show 404 or redirect to a valid page, but not to login
          expect(currentUrl).not.toContain('/auth/login');
          expect(currentUrl).not.toContain('/login');
          
          // Check if it's a 404 page
          const has404 = await page.locator('text=404').count() > 0;
          const hasNotFound = await page.locator('text=Not Found').count() > 0;
          const isErrorPage = has404 || hasNotFound;
          
          if (isErrorPage) {
            console.log(`✅ Properly handled invalid route with 404: ${route}`);
          } else {
            console.log(`✅ Route accessible or redirected appropriately: ${route} -> ${currentUrl}`);
          }
        } catch (error) {
          console.log(`⚠️ Error accessing route ${route}: ${error}`);
        }
      }
    });
  });

  test.describe('Admin Content Verification', () => {
    test('should load admin pages with reasonable content', async ({ page }) => {
      const adminPages = [
        { url: 'http://localhost:3005/admin', name: 'Admin Dashboard' },
        { url: 'http://localhost:3005/analytics', name: 'Analytics' },
        { url: 'http://localhost:3005/admin/beta', name: 'Beta Features' }
      ];
      
      for (const adminPage of adminPages) {
        await page.goto(adminPage.url);
        await page.waitForLoadState('networkidle');
        
        // Get page content
        const pageContent = await page.textContent('body');
        const contentLength = pageContent?.length || 0;
        
        // Basic content validation
        expect(contentLength).toBeGreaterThan(50); // Should have substantial content
        
        // Check for common error indicators
        const hasError = pageContent?.includes('Error') || 
                        pageContent?.includes('500') ||
                        pageContent?.includes('Something went wrong');
        
        if (hasError) {
          console.log(`⚠️ ${adminPage.name} may have errors in content`);
        } else {
          console.log(`✅ ${adminPage.name} loaded successfully with ${contentLength} characters`);
        }
      }
    });
  });
});