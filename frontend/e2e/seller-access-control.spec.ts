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
 * Helper function to perform seller login
 */
async function performSellerLogin(page: Page): Promise<void> {
  console.log(`🔐 Performing seller login: ${SELLER_ACCOUNT.name} (${SELLER_ACCOUNT.email})`);
  
  await page.goto('/');
  
  const devPanelTrigger = page.locator('[data-testid="show-dev-panel"]');
  await expect(devPanelTrigger).toBeVisible({ timeout: 10000 });
  await devPanelTrigger.click();
  await page.waitForTimeout(1000);
  
  const sellerLoginButton = page.locator(`[data-testid="dev-login-${SELLER_ACCOUNT.id}"]`);
  await expect(sellerLoginButton).toBeVisible({ timeout: 10000 });
  
  await sellerLoginButton.click();
  await page.waitForTimeout(3000);
  
  console.log('✅ Seller login process completed');
}

test.describe('Seller Access Control Testing', () => {
  test.setTimeout(30000);

  test('should allow seller access to business-critical pages', async ({ page }) => {
    await performSellerLogin(page);
    
    // Test access to seller-critical business pages
    const businessPages = [
      '/dashboard',
      '/products',
      '/products/new',
      '/analytics'
    ];
    
    for (const businessPage of businessPages) {
      await page.goto(businessPage);
      await page.waitForLoadState('networkidle');
      
      const currentUrl = page.url();
      expect(currentUrl).toContain(businessPage);
      
      // Verify page has loaded content (not just a login redirect)
      const bodyContent = await page.textContent('body');
      expect(bodyContent).not.toContain('Please log in');
      expect(bodyContent).not.toContain('Unauthorized');
      
      console.log(`✅ Seller has proper access to: ${businessPage}`);
    }
    
    console.log('✅ All business-critical pages are accessible to seller');
  });

  test('should provide sedori-specific navigation and features', async ({ page }) => {
    await performSellerLogin(page);
    
    // Check if seller can navigate to key sedori features
    await page.goto('/products/new');
    await page.waitForLoadState('networkidle');
    
    // Verify sedori-specific elements are visible and functional
    const sedoriElements = [
      'text=Cost Price',
      'text=仕入れ価格',
      'text=Selling Price', 
      'text=販売価格',
      'text=Profit',
      'text=利益',
      'text=ROI',
      'text=Margin'
    ];
    
    let foundElements = 0;
    for (const element of sedoriElements) {
      const elementCount = await page.locator(element).count();
      if (elementCount > 0) {
        foundElements++;
        console.log(`✅ Found seller feature: ${element}`);
      }
    }
    
    expect(foundElements).toBeGreaterThan(4); // Should find at least 4 sedori elements
    console.log(`✅ Seller has access to ${foundElements} sedori-specific features`);
  });

  test('should maintain seller authentication state', async ({ page }) => {
    await performSellerLogin(page);
    
    // Test session persistence across multiple page navigations
    const sessionTestPages = [
      '/dashboard',
      '/products',
      '/analytics',
      '/products/new',
      '/dashboard'  // Return to start to test round trip
    ];
    
    for (const sessionPage of sessionTestPages) {
      await page.goto(sessionPage);
      await page.waitForLoadState('networkidle');
      
      // Check that seller is still authenticated
      const cookies = await page.context().cookies();
      const hasAuthCookies = cookies.some(cookie => 
        ['auth_token', 'user_data', 'session', 'token'].includes(cookie.name)
      );
      
      const currentUrl = page.url();
      const isOnLoginPage = currentUrl.includes('/login') || currentUrl.includes('/auth');
      
      expect(hasAuthCookies || !isOnLoginPage).toBeTruthy();
      console.log(`✅ Session maintained on: ${sessionPage}`);
    }
    
    console.log('✅ Seller authentication state is properly maintained');
  });

  test('should support sedori business workflow', async ({ page }) => {
    await performSellerLogin(page);
    
    // Test complete sedori business workflow
    console.log('Testing complete sedori business workflow...');
    
    // 1. Check dashboard for business overview
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    const dashboardContent = await page.textContent('body');
    const hasBusinessMetrics = dashboardContent?.includes('利益') || 
                              dashboardContent?.includes('Profit') ||
                              dashboardContent?.includes('ROI') ||
                              dashboardContent?.includes('Sales');
    expect(hasBusinessMetrics).toBeTruthy();
    console.log('✅ Dashboard shows business metrics');
    
    // 2. Check products listing
    await page.goto('/products');
    await page.waitForLoadState('networkidle');
    
    const productsContent = await page.textContent('body');
    const hasProductsFeatures = productsContent?.includes('Product') || 
                               productsContent?.includes('商品') ||
                               productsContent?.includes('Add') ||
                               productsContent?.includes('作成');
    expect(hasProductsFeatures).toBeTruthy();
    console.log('✅ Products page is functional');
    
    // 3. Test product creation with profit calculation
    await page.goto('/products/new');
    await page.waitForLoadState('networkidle');
    
    const costInput = page.locator('[data-testid="cost-price-input"]');
    const priceInput = page.locator('[data-testid="selling-price-input"]');
    const profitDisplay = page.locator('[data-testid="profit-amount"]');
    
    await expect(costInput).toBeVisible();
    await expect(priceInput).toBeVisible();
    await expect(profitDisplay).toBeVisible();
    
    // Test calculation functionality
    await costInput.fill('800');
    await priceInput.fill('1200');
    await page.waitForTimeout(1000);
    
    const profitValue = await profitDisplay.textContent();
    expect(profitValue).toContain('400.00'); // 1200 - 800 = 400
    console.log('✅ Profit calculation is working');
    
    // 4. Check analytics for business insights
    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');
    
    const analyticsContent = await page.textContent('body');
    const hasAnalytics = analyticsContent?.includes('Revenue') ||
                        analyticsContent?.includes('Margin') ||
                        analyticsContent?.includes('Analytics') ||
                        analyticsContent?.includes('Performance');
    expect(hasAnalytics).toBeTruthy();
    console.log('✅ Analytics page provides business insights');
    
    console.log('✅ Complete sedori business workflow is functional');
  });

  test('should handle error states gracefully', async ({ page }) => {
    await performSellerLogin(page);
    
    // Test error handling in sedori features
    await page.goto('/products/new');
    await page.waitForLoadState('networkidle');
    
    const costInput = page.locator('[data-testid="cost-price-input"]');
    const priceInput = page.locator('[data-testid="selling-price-input"]');
    
    // Test negative profit scenario
    await costInput.fill('1500');
    await priceInput.fill('1000');
    await page.waitForTimeout(1000);
    
    const profitDisplay = page.locator('[data-testid="profit-amount"]');
    const profitValue = await profitDisplay.textContent();
    
    // Should show negative profit
    expect(profitValue).toContain('-500.00');
    console.log('✅ Negative profit calculation handled correctly');
    
    // Test zero values
    await costInput.fill('0');
    await priceInput.fill('0');
    await page.waitForTimeout(1000);
    
    const zeroProfitValue = await profitDisplay.textContent();
    expect(zeroProfitValue).toContain('0.00');
    console.log('✅ Zero value scenarios handled correctly');
    
    console.log('✅ Error states are handled gracefully');
  });
});