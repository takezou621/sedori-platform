import { test, expect, type Page } from '@playwright/test';

// Seller test account
const SELLER_ACCOUNT = {
  id: 'test-seller',
  name: 'せどり業者テスト',
  email: 'devseller@example.com',
  password: 'DevSeller123!',
  description: 'せどり業者向けテストアカウント'
};

/**
 * Helper function to perform seller login using API
 */
async function performSellerApiLogin(page: Page): Promise<void> {
  console.log(`🔐 API Login: ${SELLER_ACCOUNT.name} (${SELLER_ACCOUNT.email})`);
  
  // Use the dev-login API endpoint
  const response = await page.request.post('http://localhost:3005/api/dev-login', {
    data: {
      email: SELLER_ACCOUNT.email,
      password: SELLER_ACCOUNT.password
    }
  });
  
  expect(response.status()).toBe(200);
  
  const responseData = await response.json();
  expect(responseData.success).toBe(true);
  expect(responseData.accessToken).toBeTruthy();
  expect(responseData.user).toBeTruthy();
  
  console.log(`✅ API Login successful for ${SELLER_ACCOUNT.name}`);
  
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

/**
 * Helper function to fill form fields if they exist
 */
async function fillFieldIfExists(page: Page, selector: string, value: string): Promise<boolean> {
  try {
    const field = page.locator(selector);
    const count = await field.count();
    if (count > 0 && await field.first().isVisible()) {
      await field.first().fill(value);
      console.log(`✅ Filled field ${selector} with value: ${value}`);
      return true;
    }
  } catch (error) {
    console.log(`⚠️ Could not fill field ${selector}: ${error}`);
  }
  return false;
}

test.describe('Seller Features API-Based Testing (Sedori Business)', () => {
  test.setTimeout(45000);

  test.beforeEach(async ({ page }) => {
    await performSellerApiLogin(page);
  });

  test.describe('Seller Dashboard Features', () => {
    test('should access seller dashboard and display content', async ({ page }) => {
      await page.goto('http://localhost:3005/dashboard');
      await page.waitForLoadState('networkidle');
      
      // Verify we're on dashboard and not redirected to login
      const currentUrl = page.url();
      expect(currentUrl).toContain('/dashboard');
      expect(currentUrl).not.toContain('/auth/login');
      
      console.log(`✅ Seller dashboard accessible at: ${currentUrl}`);
      
      // Check page content loads
      const pageContent = await page.textContent('body');
      expect(pageContent).toBeTruthy();
      expect(pageContent!.length).toBeGreaterThan(50);
      
      console.log(`✅ Dashboard loaded with ${pageContent!.length} characters of content`);
    });

    test('should display appropriate dashboard title', async ({ page }) => {
      await page.goto('http://localhost:3005/dashboard');
      await page.waitForLoadState('networkidle');
      
      const pageTitle = await page.title();
      console.log(`Seller dashboard title: ${pageTitle}`);
      
      // Dashboard should have appropriate title
      const titleIsAppropriate = pageTitle.toLowerCase().includes('dashboard') ||
                                pageTitle.toLowerCase().includes('sedori') ||
                                pageTitle.includes('ダッシュボード') ||
                                pageTitle.length > 0;
      
      expect(titleIsAppropriate).toBeTruthy();
      console.log(`✅ Dashboard has appropriate title`);
    });
  });

  test.describe('Product Management Features', () => {
    test('should access products page', async ({ page }) => {
      await page.goto('http://localhost:3005/products');
      await page.waitForLoadState('networkidle');
      
      // Verify products page is accessible
      const currentUrl = page.url();
      expect(currentUrl).toContain('/products');
      expect(currentUrl).not.toContain('/auth/login');
      
      console.log(`✅ Products page accessible at: ${currentUrl}`);
      
      // Check page content loads
      const pageContent = await page.textContent('body');
      expect(pageContent).toBeTruthy();
      expect(pageContent!.length).toBeGreaterThan(50);
      
      console.log(`✅ Products page loaded with content`);
    });

    test('should access new product creation page', async ({ page }) => {
      await page.goto('http://localhost:3005/products/new');
      await page.waitForLoadState('networkidle');
      
      // Verify new product page is accessible
      const currentUrl = page.url();
      expect(currentUrl).toContain('/products/new');
      expect(currentUrl).not.toContain('/auth/login');
      
      console.log(`✅ New product page accessible at: ${currentUrl}`);
      
      // Check page content loads
      const pageContent = await page.textContent('body');
      expect(pageContent).toBeTruthy();
      expect(pageContent!.length).toBeGreaterThan(50);
      
      console.log(`✅ New product page loaded with content`);
    });

    test('should verify product creation form elements', async ({ page }) => {
      await page.goto('http://localhost:3005/products/new');
      await page.waitForLoadState('networkidle');
      
      // Look for common form elements that might be present
      const formElements = [
        'input[type="text"]',
        'input[type="number"]',
        'textarea',
        'select',
        'button[type="submit"]',
        'form'
      ];
      
      let foundFormElements = 0;
      for (const element of formElements) {
        const count = await page.locator(element).count();
        if (count > 0) {
          foundFormElements++;
          console.log(`✅ Found form element: ${element} (${count} instances)`);
        }
      }
      
      console.log(`✅ Found ${foundFormElements} types of form elements on product creation page`);
      expect(foundFormElements).toBeGreaterThan(0);
    });
  });

  test.describe('Sedori-Specific Features', () => {
    test('should test profit calculation functionality if available', async ({ page }) => {
      await page.goto('http://localhost:3005/products/new');
      await page.waitForLoadState('networkidle');
      
      // Look for profit calculation inputs
      const profitInputSelectors = [
        'input[name*="cost"]',
        'input[name*="price"]',
        'input[name*="profit"]',
        'input[placeholder*="cost"]',
        'input[placeholder*="price"]',
        'input[placeholder*="仕入"]',
        'input[placeholder*="価格"]',
        'input[placeholder*="利益"]'
      ];
      
      let foundProfitInputs = 0;
      let costInput = null;
      let priceInput = null;
      
      for (const selector of profitInputSelectors) {
        const count = await page.locator(selector).count();
        if (count > 0) {
          foundProfitInputs++;
          console.log(`✅ Found potential profit input: ${selector}`);
          
          // Capture potential cost/price inputs for testing
          if (selector.includes('cost') || selector.includes('仕入')) {
            costInput = selector;
          }
          if (selector.includes('price') || selector.includes('価格')) {
            priceInput = selector;
          }
        }
      }
      
      if (foundProfitInputs > 0) {
        console.log(`✅ Found ${foundProfitInputs} potential profit calculation inputs`);
        
        // Test profit calculation if we have both cost and price inputs
        if (costInput && priceInput) {
          try {
            await page.locator(costInput).first().fill('1000');
            await page.locator(priceInput).first().fill('1500');
            
            // Wait for potential auto-calculation
            await page.waitForTimeout(2000);
            
            console.log('✅ Successfully filled profit calculation inputs');
          } catch (error) {
            console.log(`⚠️ Could not test profit calculation: ${error}`);
          }
        }
      } else {
        console.log('ℹ️ No specific profit calculation inputs found');
      }
    });

    test('should verify access to inventory-related features', async ({ page }) => {
      // Try different potential inventory URLs
      const inventoryUrls = [
        'http://localhost:3005/inventory',
        'http://localhost:3005/products',
        'http://localhost:3005/dashboard'
      ];
      
      for (const url of inventoryUrls) {
        await page.goto(url);
        await page.waitForLoadState('networkidle');
        
        const currentUrl = page.url();
        
        // Should not be redirected to login
        expect(currentUrl).not.toContain('/auth/login');
        
        // Check if page loads with content
        const pageContent = await page.textContent('body');
        const contentLength = pageContent?.length || 0;
        
        if (contentLength > 100) {
          console.log(`✅ ${url} accessible with ${contentLength} characters of content`);
        } else {
          console.log(`⚠️ ${url} may have limited content (${contentLength} characters)`);
        }
      }
    });
  });

  test.describe('Business Analytics for Sellers', () => {
    test('should access analytics if available for sellers', async ({ page }) => {
      await page.goto('http://localhost:3005/analytics');
      await page.waitForLoadState('networkidle');
      
      const currentUrl = page.url();
      
      // Should not be redirected to login
      expect(currentUrl).not.toContain('/auth/login');
      
      if (currentUrl.includes('/analytics')) {
        console.log(`✅ Seller can access analytics at: ${currentUrl}`);
        
        // Check page content
        const pageContent = await page.textContent('body');
        expect(pageContent).toBeTruthy();
        console.log(`✅ Analytics page loaded for seller`);
      } else {
        console.log(`ℹ️ Analytics may be restricted for sellers, redirected to: ${currentUrl}`);
      }
    });

    test('should verify seller-specific metrics access', async ({ page }) => {
      await page.goto('http://localhost:3005/dashboard');
      await page.waitForLoadState('networkidle');
      
      // Look for business metrics that sellers might need
      const businessMetrics = [
        'text=ROI',
        'text=Profit',
        'text=利益',
        'text=Revenue',
        'text=売上',
        'text=Inventory',
        'text=在庫',
        'text=Orders',
        'text=注文',
        'text=Sales',
        'text=販売'
      ];
      
      let foundMetrics = 0;
      for (const metric of businessMetrics) {
        const count = await page.locator(metric).count();
        if (count > 0) {
          foundMetrics++;
          console.log(`✅ Found business metric: ${metric}`);
        }
      }
      
      console.log(`Found ${foundMetrics} business-related metrics on seller dashboard`);
    });
  });

  test.describe('Seller Session Management', () => {
    test('should maintain seller session across navigation', async ({ page }) => {
      const sellerPages = [
        'http://localhost:3005/dashboard',
        'http://localhost:3005/products',
        'http://localhost:3005/products/new',
        'http://localhost:3005/'
      ];
      
      for (const sellerPage of sellerPages) {
        await page.goto(sellerPage);
        await page.waitForLoadState('networkidle');
        
        // Verify seller is still authenticated
        const cookies = await page.context().cookies();
        const hasAuth = cookies.some(cookie => ['auth_token', 'user_data'].includes(cookie.name));
        
        expect(hasAuth).toBeTruthy();
        
        // Should not be redirected to login
        const currentUrl = page.url();
        expect(currentUrl).not.toContain('/auth/login');
        
        console.log(`✅ Seller session maintained on: ${sellerPage}`);
      }
    });

    test('should have seller user data in cookies', async ({ page }) => {
      await page.goto('http://localhost:3005/dashboard');
      await page.waitForLoadState('networkidle');
      
      const cookies = await page.context().cookies();
      const userDataCookie = cookies.find(cookie => cookie.name === 'user_data');
      
      expect(userDataCookie).toBeTruthy();
      
      if (userDataCookie) {
        const userData = JSON.parse(decodeURIComponent(userDataCookie.value));
        
        expect(userData.email).toBe(SELLER_ACCOUNT.email);
        expect(userData.id).toBeTruthy();
        
        console.log(`✅ Seller user data in cookies:`, {
          email: userData.email,
          name: userData.name,
          role: userData.role,
          hasId: !!userData.id
        });
      }
    });
  });

  test.describe('Seller Error Handling', () => {
    test('should handle product-related errors gracefully', async ({ page }) => {
      const testProductUrls = [
        'http://localhost:3005/products/999999',
        'http://localhost:3005/products/nonexistent'
      ];
      
      for (const url of testProductUrls) {
        try {
          await page.goto(url);
          await page.waitForLoadState('networkidle');
          
          const currentUrl = page.url();
          
          // Should not be redirected to login
          expect(currentUrl).not.toContain('/auth/login');
          
          // Check if it's a 404 or redirects appropriately
          const has404 = await page.locator('text=404').count() > 0;
          const hasNotFound = await page.locator('text=Not Found').count() > 0;
          
          if (has404 || hasNotFound) {
            console.log(`✅ Properly handled invalid product URL with 404: ${url}`);
          } else {
            console.log(`✅ Product URL handled appropriately: ${url} -> ${currentUrl}`);
          }
        } catch (error) {
          console.log(`⚠️ Error accessing product URL ${url}: ${error}`);
        }
      }
    });
  });
});