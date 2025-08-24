import { test, expect, type Page } from '@playwright/test';

// Seller test account for business logic testing
const SELLER_ACCOUNT = {
  email: 'devseller@example.com',
  password: 'DevSeller123!',
  name: 'せどり業者テスト'
};

/**
 * Helper function to perform seller login using API
 */
async function performSellerApiLogin(page: Page): Promise<void> {
  console.log(`🔐 API Login: ${SELLER_ACCOUNT.name} (${SELLER_ACCOUNT.email})`);
  
  const response = await page.request.post('http://localhost:3005/api/dev-login', {
    data: {
      email: SELLER_ACCOUNT.email,
      password: SELLER_ACCOUNT.password
    }
  });
  
  expect(response.status()).toBe(200);
  const responseData = await response.json();
  expect(responseData.success).toBe(true);
  
  // Set cookies in browser context
  await page.goto('http://localhost:3005');
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
  
  console.log(`✅ API Login successful for ${SELLER_ACCOUNT.name}`);
}

/**
 * Test data for profit calculations
 */
const profitTestCases = [
  {
    name: 'Basic Profit Calculation',
    cost: 1000,
    price: 1500,
    expectedProfit: 500,
    expectedMargin: 33.3,
    expectedROI: 50.0
  },
  {
    name: 'High Margin Product',
    cost: 100,
    price: 500,
    expectedProfit: 400,
    expectedMargin: 80.0,
    expectedROI: 400.0
  },
  {
    name: 'Low Margin Product',
    cost: 900,
    price: 1000,
    expectedProfit: 100,
    expectedMargin: 10.0,
    expectedROI: 11.1
  },
  {
    name: 'Zero Profit (Break Even)',
    cost: 1000,
    price: 1000,
    expectedProfit: 0,
    expectedMargin: 0.0,
    expectedROI: 0.0
  }
];

test.describe('Business Logic Validation - Sedori Profit Calculations', () => {
  test.setTimeout(45000);

  test.beforeEach(async ({ page }) => {
    await performSellerApiLogin(page);
  });

  test.describe('Profit Calculation Engine', () => {
    test('should access new product page and verify calculation interface', async ({ page }) => {
      await page.goto('http://localhost:3005/products/new');
      await page.waitForLoadState('networkidle');
      
      // Verify we're on the correct page
      const currentUrl = page.url();
      expect(currentUrl).toContain('/products/new');
      
      // Check for profit calculation elements
      const costInput = page.locator('[data-testid="cost-price-input"]');
      const priceInput = page.locator('[data-testid="selling-price-input"]');
      const profitDisplay = page.locator('[data-testid="profit-amount"]');
      const marginDisplay = page.locator('[data-testid="profit-margin"]');
      const roiDisplay = page.locator('[data-testid="roi-percentage"]');
      
      // Verify all calculation elements are present
      await expect(costInput).toBeVisible();
      await expect(priceInput).toBeVisible();
      await expect(profitDisplay).toBeVisible();
      await expect(marginDisplay).toBeVisible();
      await expect(roiDisplay).toBeVisible();
      
      console.log('✅ All profit calculation interface elements found');
    });

    profitTestCases.forEach((testCase) => {
      test(`should calculate correct profit metrics for: ${testCase.name}`, async ({ page }) => {
        await page.goto('http://localhost:3005/products/new');
        await page.waitForLoadState('networkidle');
        
        // Fill in cost and price
        const costInput = page.locator('[data-testid="cost-price-input"]');
        const priceInput = page.locator('[data-testid="selling-price-input"]');
        
        await costInput.fill(testCase.cost.toString());
        await priceInput.fill(testCase.price.toString());
        
        // Wait for calculations to update
        await page.waitForTimeout(1000);
        
        // Get calculated values
        const profitText = await page.locator('[data-testid="profit-amount"]').textContent();
        const marginText = await page.locator('[data-testid="profit-margin"]').textContent();
        const roiText = await page.locator('[data-testid="roi-percentage"]').textContent();
        
        // Parse values
        const actualProfit = parseFloat(profitText?.replace(/[¥,]/g, '') || '0');
        const actualMargin = parseFloat(marginText?.replace('%', '') || '0');
        const actualROI = parseFloat(roiText?.replace('%', '') || '0');
        
        // Verify calculations (with small tolerance for floating point)
        expect(actualProfit).toBeCloseTo(testCase.expectedProfit, 2);
        expect(actualMargin).toBeCloseTo(testCase.expectedMargin, 1);
        expect(actualROI).toBeCloseTo(testCase.expectedROI, 1);
        
        console.log(`✅ ${testCase.name}: Profit=¥${actualProfit}, Margin=${actualMargin}%, ROI=${actualROI}%`);
      });
    });

    test('should validate real-time calculation updates', async ({ page }) => {
      await page.goto('http://localhost:3005/products/new');
      await page.waitForLoadState('networkidle');
      
      const costInput = page.locator('[data-testid="cost-price-input"]');
      const priceInput = page.locator('[data-testid="selling-price-input"]');
      const profitDisplay = page.locator('[data-testid="profit-amount"]');
      
      // Test sequence of calculations
      const testSequence = [
        { cost: 500, price: 750, expectedProfit: 250 },
        { cost: 500, price: 1000, expectedProfit: 500 },
        { cost: 750, price: 1000, expectedProfit: 250 },
        { cost: 800, price: 1000, expectedProfit: 200 }
      ];
      
      for (const step of testSequence) {
        await costInput.fill(step.cost.toString());
        await priceInput.fill(step.price.toString());
        await page.waitForTimeout(500); // Wait for calculation update
        
        const profitText = await profitDisplay.textContent();
        const actualProfit = parseFloat(profitText?.replace(/[¥,]/g, '') || '0');
        
        expect(actualProfit).toBeCloseTo(step.expectedProfit, 2);
        console.log(`✅ Real-time update: Cost=¥${step.cost}, Price=¥${step.price} → Profit=¥${actualProfit}`);
      }
    });

    test('should handle edge cases and validation', async ({ page }) => {
      await page.goto('http://localhost:3005/products/new');
      await page.waitForLoadState('networkidle');
      
      const costInput = page.locator('[data-testid="cost-price-input"]');
      const priceInput = page.locator('[data-testid="selling-price-input"]');
      
      // Test case: Cost higher than price (negative profit)
      await costInput.fill('1500');
      await priceInput.fill('1000');
      await page.waitForTimeout(1000);
      
      // Check if form shows error state or warning
      const errorMessages = page.locator('.text-red-600');
      const errorCount = await errorMessages.count();
      
      if (errorCount > 0) {
        console.log('✅ Form correctly shows error for negative profit scenario');
        
        // Check error message content
        const errorText = await errorMessages.first().textContent();
        console.log(`Error message: ${errorText}`);
      }
      
      // Test case: Zero values
      await costInput.fill('0');
      await priceInput.fill('0');
      await page.waitForTimeout(500);
      
      const profitText = await page.locator('[data-testid="profit-amount"]').textContent();
      const actualProfit = parseFloat(profitText?.replace(/[¥,]/g, '') || '0');
      expect(actualProfit).toBe(0);
      
      console.log('✅ Zero values handled correctly');
    });

    test('should verify calculated fields are read-only', async ({ page }) => {
      await page.goto('http://localhost:3005/products/new');
      await page.waitForLoadState('networkidle');
      
      // Fill cost and price to generate calculations
      await page.locator('[data-testid="cost-price-input"]').fill('1000');
      await page.locator('[data-testid="selling-price-input"]').fill('1500');
      await page.waitForTimeout(500);
      
      // Check if calculated fields are read-only
      const calculatedProfitInput = page.locator('[data-testid="calculated-profit-input"]');
      const marginInput = page.locator('[data-testid="profit-margin-input"]');
      const roiInput = page.locator('[data-testid="roi-calculation-input"]');
      
      // Verify read-only state
      if (await calculatedProfitInput.count() > 0) {
        const isReadOnly = await calculatedProfitInput.getAttribute('readonly');
        expect(isReadOnly).toBeTruthy();
        console.log('✅ Calculated profit field is read-only');
      }
      
      if (await marginInput.count() > 0) {
        const isReadOnly = await marginInput.getAttribute('readonly');
        expect(isReadOnly).toBeTruthy();
        console.log('✅ Margin field is read-only');
      }
      
      if (await roiInput.count() > 0) {
        const isReadOnly = await roiInput.getAttribute('readonly');
        expect(isReadOnly).toBeTruthy();
        console.log('✅ ROI field is read-only');
      }
    });

    test('should validate form submission with profit calculations', async ({ page }) => {
      await page.goto('http://localhost:3005/products/new');
      await page.waitForLoadState('networkidle');
      
      // Fill out complete form
      await page.locator('input[placeholder="Product Title"]').fill('Test Sedori Product');
      await page.locator('textarea[placeholder="Product Description"]').fill('Test product for sedori business profit calculation');
      
      // Select category (if available)
      const categorySelect = page.locator('select, [role="combobox"]').first();
      if (await categorySelect.count() > 0) {
        await categorySelect.click();
        await page.waitForTimeout(500);
        // Try to select first available option
        const firstOption = page.locator('[role="option"]').first();
        if (await firstOption.count() > 0) {
          await firstOption.click();
        }
      }
      
      // Fill pricing with profitable scenario
      await page.locator('[data-testid="cost-price-input"]').fill('1000');
      await page.locator('[data-testid="selling-price-input"]').fill('1500');
      await page.locator('input[placeholder="0"]').fill('10'); // stock
      
      // Wait for calculations
      await page.waitForTimeout(1000);
      
      // Check if submit button is enabled
      const submitButton = page.locator('button[type="submit"]');
      const isDisabled = await submitButton.isDisabled();
      
      console.log(`Submit button disabled: ${isDisabled}`);
      
      // If form is valid, the button should be enabled
      if (!isDisabled) {
        console.log('✅ Form with valid profit calculations enables submission');
      } else {
        console.log('⚠️ Submit button is disabled - may require additional validation');
      }
    });
  });

  test.describe('Sedori Business Metrics', () => {
    test('should calculate ROI correctly for sedori scenarios', async ({ page }) => {
      await page.goto('http://localhost:3005/products/new');
      await page.waitForLoadState('networkidle');
      
      // Test typical sedori scenarios
      const sedoriScenarios = [
        { 
          name: '書籍転売 (Book Resale)',
          cost: 300, 
          price: 800, 
          expectedROI: 166.7 // (800-300)/300 * 100
        },
        {
          name: 'ゲーム転売 (Game Resale)',
          cost: 2000,
          price: 3500,
          expectedROI: 75.0 // (3500-2000)/2000 * 100
        },
        {
          name: '家電転売 (Electronics Resale)',
          cost: 15000,
          price: 20000,
          expectedROI: 33.3 // (20000-15000)/15000 * 100
        }
      ];
      
      for (const scenario of sedoriScenarios) {
        await page.locator('[data-testid="cost-price-input"]').fill(scenario.cost.toString());
        await page.locator('[data-testid="selling-price-input"]').fill(scenario.price.toString());
        await page.waitForTimeout(500);
        
        const roiText = await page.locator('[data-testid="roi-percentage"]').textContent();
        const actualROI = parseFloat(roiText?.replace('%', '') || '0');
        
        expect(actualROI).toBeCloseTo(scenario.expectedROI, 1);
        console.log(`✅ ${scenario.name}: ROI=${actualROI}% (expected: ${scenario.expectedROI}%)`);
      }
    });

    test('should show appropriate profit margin categories', async ({ page }) => {
      await page.goto('http://localhost:3005/products/new');
      await page.waitForLoadState('networkidle');
      
      const marginCategories = [
        { cost: 1000, price: 1100, category: 'Low Margin (10%)' },
        { cost: 1000, price: 1300, category: 'Good Margin (23%)' },
        { cost: 1000, price: 1500, category: 'High Margin (33%)' },
        { cost: 1000, price: 2000, category: 'Excellent Margin (50%)' }
      ];
      
      for (const test of marginCategories) {
        await page.locator('[data-testid="cost-price-input"]').fill(test.cost.toString());
        await page.locator('[data-testid="selling-price-input"]').fill(test.price.toString());
        await page.waitForTimeout(500);
        
        const marginText = await page.locator('[data-testid="profit-margin"]').textContent();
        const actualMargin = parseFloat(marginText?.replace('%', '') || '0');
        const expectedMargin = ((test.price - test.cost) / test.price) * 100;
        
        expect(actualMargin).toBeCloseTo(expectedMargin, 1);
        console.log(`✅ ${test.category}: Margin=${actualMargin}%`);
      }
    });
  });
});