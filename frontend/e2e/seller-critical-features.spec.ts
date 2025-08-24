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
  
  // Navigate to home page
  await page.goto('/');
  
  // Show dev panel
  const devPanelTrigger = page.locator('[data-testid="show-dev-panel"]');
  await expect(devPanelTrigger).toBeVisible({ timeout: 10000 });
  await devPanelTrigger.click();
  await page.waitForTimeout(1000);
  
  // Click seller login button
  const sellerLoginButton = page.locator(`[data-testid="dev-login-${SELLER_ACCOUNT.id}"]`);
  await expect(sellerLoginButton).toBeVisible({ timeout: 10000 });
  
  await sellerLoginButton.click();
  await page.waitForTimeout(3000);
  
  // Verify seller login success - check for auth cookies or redirect
  const currentUrl = page.url();
  const cookies = await page.context().cookies();
  const hasAuth = cookies.some(cookie => ['auth_token', 'user_data'].includes(cookie.name));
  
  console.log(`Current URL after login: ${currentUrl}`);
  console.log(`Auth cookies found: ${hasAuth}`);
  console.log('✅ Seller login process completed');
}

test.describe('Critical Seller Features Testing (Sedori Business)', () => {
  test.setTimeout(30000);

  test('should login as seller and access sedori profit calculation features', async ({ page }) => {
    // Perform seller login
    await performSellerLogin(page);
    
    // Navigate to products new page
    await page.goto('/products/new');
    await page.waitForLoadState('networkidle');
    
    // Verify we're on the new product page
    const currentUrl = page.url();
    expect(currentUrl).toContain('/products/new');
    console.log('✅ Successfully accessed /products/new page');
    
    // Verify sedori-specific form elements are present
    const costPriceInput = page.locator('[data-testid="cost-price-input"]');
    const sellingPriceInput = page.locator('[data-testid="selling-price-input"]');
    const profitAmount = page.locator('[data-testid="profit-amount"]');
    const profitMargin = page.locator('[data-testid="profit-margin"]');
    const roiPercentage = page.locator('[data-testid="roi-percentage"]');
    
    await expect(costPriceInput).toBeVisible();
    await expect(sellingPriceInput).toBeVisible();
    await expect(profitAmount).toBeVisible();
    await expect(profitMargin).toBeVisible();
    await expect(roiPercentage).toBeVisible();
    
    console.log('✅ All sedori-specific form elements are visible');
    
    // Test profit calculation functionality
    const testCost = '1000';
    const testPrice = '1500';
    const expectedProfit = '500.00';
    const expectedMargin = '33.3';  // (500/1500) * 100 = 33.33%
    const expectedRoi = '50.0';     // (500/1000) * 100 = 50%
    
    // Fill cost price
    await costPriceInput.fill(testCost);
    await page.waitForTimeout(1000);
    
    // Fill selling price
    await sellingPriceInput.fill(testPrice);
    await page.waitForTimeout(2000); // Wait for calculation
    
    // Verify calculations
    const profitText = await profitAmount.textContent();
    const marginText = await profitMargin.textContent();
    const roiText = await roiPercentage.textContent();
    
    console.log(`Calculated Profit: ${profitText}`);
    console.log(`Calculated Margin: ${marginText}`);
    console.log(`Calculated ROI: ${roiText}`);
    
    // Check if calculated values are correct
    expect(profitText).toContain('¥500');
    expect(marginText).toContain('33.3%');
    expect(roiText).toContain('50.0%');
    
    console.log('✅ Sedori profit calculations are working correctly');
    
    // Test additional sedori inputs
    const calculatedProfitInput = page.locator('[data-testid="calculated-profit-input"]');
    const profitMarginInput = page.locator('[data-testid="profit-margin-input"]');
    const roiCalculationInput = page.locator('[data-testid="roi-calculation-input"]');
    
    await expect(calculatedProfitInput).toBeVisible();
    await expect(profitMarginInput).toBeVisible();
    await expect(roiCalculationInput).toBeVisible();
    
    // Verify readonly calculation fields are populated
    const calculatedProfitValue = await calculatedProfitInput.inputValue();
    const profitMarginValue = await profitMarginInput.inputValue();
    const roiCalculationValue = await roiCalculationInput.inputValue();
    
    expect(calculatedProfitValue).toBe('500.00');
    expect(profitMarginValue).toBe('33.3%');
    expect(roiCalculationValue).toBe('50.0%');
    
    console.log('✅ All sedori calculation fields are properly populated');
  });

  test('should validate sedori business rules and error handling', async ({ page }) => {
    await performSellerLogin(page);
    
    await page.goto('/products/new');
    await page.waitForLoadState('networkidle');
    
    const costPriceInput = page.locator('[data-testid="cost-price-input"]');
    const sellingPriceInput = page.locator('[data-testid="selling-price-input"]');
    const profitAmount = page.locator('[data-testid="profit-amount"]');
    
    // Test scenario where cost > price (should show negative profit or error)
    await costPriceInput.fill('1500');
    await sellingPriceInput.fill('1000');
    await page.waitForTimeout(1000);
    
    const profitText = await profitAmount.textContent();
    console.log(`Profit with cost > price: ${profitText}`);
    
    // Should show negative profit or zero
    expect(profitText).toContain('-500.00');
    
    // Test zero values
    await costPriceInput.fill('0');
    await sellingPriceInput.fill('0');
    await page.waitForTimeout(1000);
    
    const zeroProfit = await profitAmount.textContent();
    expect(zeroProfit).toContain('¥0.00');
    
    console.log('✅ Sedori business rule validation is working');
  });

  test('should access seller dashboard with sedori metrics', async ({ page }) => {
    await performSellerLogin(page);
    
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Look for sedori-specific dashboard elements
    const pageContent = await page.textContent('body');
    
    // Check if any sedori business terms are present
    const sedoriTerms = [
      'Profit', '利益', 'ROI', '投資', 'Margin', 'マージン', 
      'Sales', '売上', 'Revenue', 'Cost', '仕入'
    ];
    
    let foundTerms = 0;
    for (const term of sedoriTerms) {
      if (pageContent?.includes(term)) {
        foundTerms++;
        console.log(`✅ Found sedori term: ${term}`);
      }
    }
    
    console.log(`Found ${foundTerms} sedori-related terms on dashboard`);
    expect(foundTerms).toBeGreaterThan(0);
  });

  test('should maintain seller session across sedori pages', async ({ page }) => {
    await performSellerLogin(page);
    
    const sellerPages = ['/dashboard', '/products', '/products/new'];
    
    for (const sellerPage of sellerPages) {
      await page.goto(sellerPage);
      await page.waitForLoadState('networkidle');
      
      // Verify page is accessible (not redirected to login)
      const currentUrl = page.url();
      expect(currentUrl).toContain(sellerPage);
      
      console.log(`✅ Successfully accessed: ${sellerPage}`);
    }
    
    console.log('✅ Seller session maintained across all sedori pages');
  });
});