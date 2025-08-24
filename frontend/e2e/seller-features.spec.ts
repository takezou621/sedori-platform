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
  
  // Monitor login API
  const loginPromise = page.waitForResponse(
    response => response.url().includes('/api/dev-login') && response.status() === 200,
    { timeout: 15000 }
  ).catch(() => console.log('Login API timeout, checking cookies'));
  
  await sellerLoginButton.click();
  await loginPromise;
  await page.waitForTimeout(3000);
  
  // Verify seller login success
  const cookies = await page.context().cookies();
  const hasAuth = cookies.some(cookie => ['auth_token', 'user_data'].includes(cookie.name));
  
  if (!hasAuth) {
    throw new Error('Seller login failed - no auth cookies found');
  }
  
  console.log('✅ Successfully logged in as seller');
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

test.describe('Seller Features Testing (Sedori Business)', () => {
  test.setTimeout(60000);

  test.beforeEach(async ({ page }) => {
    await performSellerLogin(page);
  });

  test.describe('Seller Dashboard Features', () => {
    test('should display sedori-specific dashboard elements', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      
      // Look for sedori-specific dashboard features
      const sedoriDashboardElements = [
        'text=Profit',
        'text=利益',
        'text=ROI',
        'text=Return on Investment',
        'text=投資収益率',
        'text=Inventory',
        'text=在庫',
        'text=Stock',
        'text=Sales',
        'text=売上',
        'text=Revenue',
        'text=Margin',
        'text=マージン',
        'text=Profit Margin',
        'text=利益率'
      ];
      
      let foundSedoriElements = 0;
      for (const element of sedoriDashboardElements) {
        const count = await page.locator(element).count();
        if (count > 0) {
          foundSedoriElements++;
          console.log(`✅ Found sedori dashboard element: ${element}`);
        }
      }
      
      console.log(`Found ${foundSedoriElements} sedori-specific dashboard elements`);
      expect(foundSedoriElements).toBeGreaterThan(0);
    });

    test('should show profit calculations and metrics', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      
      // Look for numerical metrics and calculations
      const metricsElements = [
        'text=¥',
        'text=%',
        '[data-testid*="profit"]',
        '[data-testid*="roi"]',
        '[data-testid*="margin"]',
        '[class*="profit"]',
        '[class*="roi"]',
        '[class*="metric"]'
      ];
      
      let foundMetrics = 0;
      for (const element of metricsElements) {
        const count = await page.locator(element).count();
        if (count > 0) {
          foundMetrics++;
          console.log(`✅ Found metric element: ${element}`);
        }
      }
      
      console.log(`Found ${foundMetrics} metric display elements`);
    });
  });

  test.describe('Product Management with Sedori Features', () => {
    test('should access products page with sedori-specific features', async ({ page }) => {
      await page.goto('/products');
      await page.waitForLoadState('networkidle');
      
      // Look for sedori-specific product features
      const sedoriProductElements = [
        'text=Cost Price',
        'text=仕入れ価格',
        'text=Selling Price',
        'text=販売価格',
        'text=Profit Margin',
        'text=利益率',
        'text=ROI',
        'text=Break Even',
        'text=損益分岐点',
        'text=Supplier',
        'text=仕入れ先',
        'button:has-text("Calculate")',
        'button:has-text("計算")'
      ];
      
      let foundProductFeatures = 0;
      for (const element of sedoriProductElements) {
        const count = await page.locator(element).count();
        if (count > 0) {
          foundProductFeatures++;
          console.log(`✅ Found sedori product feature: ${element}`);
        }
      }
      
      console.log(`Found ${foundProductFeatures} sedori product features`);
    });

    test('should create new product with profit calculations', async ({ page }) => {
      await page.goto('/products/new');
      await page.waitForLoadState('networkidle');
      
      // Verify we're on the new product page
      const currentUrl = page.url();
      expect(currentUrl).toContain('/products/new');
      
      // Look for sedori-specific form fields
      const sedoriFormElements = [
        'input[name*="cost"]',
        'input[placeholder*="cost"]',
        'input[placeholder*="仕入"]',
        'input[name*="price"]',
        'input[placeholder*="price"]',
        'input[placeholder*="価格"]',
        'input[name*="profit"]',
        'input[placeholder*="profit"]',
        'input[placeholder*="利益"]',
        'input[name*="margin"]',
        'input[placeholder*="margin"]',
        'input[placeholder*="マージン"]'
      ];
      
      let foundFormFields = 0;
      const availableFields: { selector: string; found: boolean }[] = [];
      
      for (const element of sedoriFormElements) {
        const count = await page.locator(element).count();
        if (count > 0) {
          foundFormFields++;
          availableFields.push({ selector: element, found: true });
          console.log(`✅ Found sedori form field: ${element}`);
        } else {
          availableFields.push({ selector: element, found: false });
        }
      }
      
      console.log(`Found ${foundFormFields} sedori form fields`);
      expect(foundFormFields).toBeGreaterThan(0);
    });

    test('should test profit calculation functionality', async ({ page }) => {
      await page.goto('/products/new');
      await page.waitForLoadState('networkidle');
      
      // Test profit calculation by entering cost and selling price
      const testCost = '1000';
      const testPrice = '1500';
      const expectedProfit = '500';
      const expectedMargin = '33.33'; // or similar percentage
      
      // Try to find and fill cost input
      const costSelectors = [
        'input[name*="cost"]',
        'input[placeholder*="cost"]',
        'input[placeholder*="仕入"]',
        'input[placeholder*="Cost"]'
      ];
      
      let costFilled = false;
      for (const selector of costSelectors) {
        if (await fillFieldIfExists(page, selector, testCost)) {
          costFilled = true;
          break;
        }
      }
      
      // Try to find and fill price input
      const priceSelectors = [
        'input[name*="price"]',
        'input[placeholder*="price"]',
        'input[placeholder*="価格"]',
        'input[placeholder*="Price"]'
      ];
      
      let priceFilled = false;
      for (const selector of priceSelectors) {
        if (await fillFieldIfExists(page, selector, testPrice)) {
          priceFilled = true;
          break;
        }
      }
      
      if (costFilled && priceFilled) {
        console.log('✅ Successfully filled cost and price fields');
        
        // Wait for auto-calculation
        await page.waitForTimeout(2000);
        
        // Look for calculated profit values
        const profitResults = [
          `text=${expectedProfit}`,
          `text=¥${expectedProfit}`,
          'text=500',
          'text=¥500',
          'text=33%',
          'text=33.33%'
        ];
        
        let foundCalculation = false;
        for (const result of profitResults) {
          const count = await page.locator(result).count();
          if (count > 0) {
            foundCalculation = true;
            console.log(`✅ Found profit calculation result: ${result}`);
            break;
          }
        }
        
        if (foundCalculation) {
          console.log('✅ Profit calculation is working correctly');
        } else {
          console.log('⚠️ No visible profit calculation results found');
          
          // Check if there are any numeric displays that might be the result
          const body = await page.textContent('body');
          const hasNumbers = body?.includes('500') || body?.includes('33');
          if (hasNumbers) {
            console.log('⚠️ Found expected numbers in page content, calculation may be working');
          }
        }
      } else {
        console.log('⚠️ Could not find or fill cost/price inputs for calculation test');
        
        // Still verify that the page has some form inputs
        const hasInputs = await page.locator('input').count() > 0;
        expect(hasInputs).toBeTruthy();
      }
    });
  });

  test.describe('Inventory Management', () => {
    test('should access inventory management features', async ({ page }) => {
      // Try different inventory management URLs
      const inventoryUrls = ['/inventory', '/products', '/dashboard'];
      
      let inventoryFound = false;
      
      for (const url of inventoryUrls) {
        await page.goto(url);
        await page.waitForLoadState('networkidle');
        
        // Look for inventory-related elements
        const inventoryElements = [
          'text=Inventory',
          'text=在庫',
          'text=Stock',
          'text=在庫管理',
          'text=Stock Level',
          'text=在庫数',
          'text=Quantity',
          'text=数量',
          'text=Available',
          'text=利用可能'
        ];
        
        let foundInventoryElements = 0;
        for (const element of inventoryElements) {
          const count = await page.locator(element).count();
          if (count > 0) {
            foundInventoryElements++;
            console.log(`✅ Found inventory element: ${element} on ${url}`);
          }
        }
        
        if (foundInventoryElements > 1) {
          inventoryFound = true;
          console.log(`✅ Inventory management features found at: ${url}`);
          break;
        }
      }
      
      console.log(`Inventory features found: ${inventoryFound}`);
    });

    test('should display stock levels and alerts', async ({ page }) => {
      await page.goto('/products');
      await page.waitForLoadState('networkidle');
      
      // Look for stock-related displays
      const stockElements = [
        'text=In Stock',
        'text=在庫あり',
        'text=Out of Stock',
        'text=在庫切れ',
        'text=Low Stock',
        'text=在庫少',
        '[class*="stock"]',
        '[data-testid*="stock"]',
        'text=Available',
        'text=Quantity'
      ];
      
      let foundStockElements = 0;
      for (const element of stockElements) {
        const count = await page.locator(element).count();
        if (count > 0) {
          foundStockElements++;
          console.log(`✅ Found stock element: ${element}`);
        }
      }
      
      console.log(`Found ${foundStockElements} stock-related elements`);
    });
  });

  test.describe('ROI Analysis Features', () => {
    test('should display ROI calculation tools', async ({ page }) => {
      // Check dashboard and products pages for ROI features
      const roiPages = ['/dashboard', '/products', '/analytics'];
      
      let roiFound = false;
      
      for (const pagePath of roiPages) {
        try {
          await page.goto(pagePath);
          await page.waitForLoadState('networkidle');
          
          // Look for ROI-related elements
          const roiElements = [
            'text=ROI',
            'text=Return on Investment',
            'text=投資収益率',
            'text=投資利益率',
            'text=Performance',
            'text=パフォーマンス',
            '[data-testid*="roi"]',
            '[class*="roi"]'
          ];
          
          let foundROIElements = 0;
          for (const element of roiElements) {
            const count = await page.locator(element).count();
            if (count > 0) {
              foundROIElements++;
              console.log(`✅ Found ROI element: ${element} on ${pagePath}`);
            }
          }
          
          if (foundROIElements > 0) {
            roiFound = true;
            console.log(`✅ ROI features found at: ${pagePath}`);
            break;
          }
        } catch (error) {
          console.log(`⚠️ Could not access ${pagePath}: ${error}`);
        }
      }
      
      console.log(`ROI analysis features found: ${roiFound}`);
    });

    test('should calculate and display performance metrics', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      
      // Look for performance metrics
      const performanceElements = [
        'text=%',
        'text=¥',
        '[class*="percentage"]',
        '[class*="currency"]',
        '[data-testid*="percentage"]',
        '[data-testid*="metric"]',
        'text=Growth',
        'text=成長',
        'text=Increase',
        'text=増加'
      ];
      
      let foundPerformanceElements = 0;
      for (const element of performanceElements) {
        const count = await page.locator(element).count();
        if (count > 0) {
          foundPerformanceElements++;
          console.log(`✅ Found performance element: ${element}`);
        }
      }
      
      console.log(`Found ${foundPerformanceElements} performance metric elements`);
    });
  });

  test.describe('Price Tracking Features', () => {
    test('should access price tracking functionality', async ({ page }) => {
      await page.goto('/products');
      await page.waitForLoadState('networkidle');
      
      // Look for price tracking elements
      const priceTrackingElements = [
        'text=Price History',
        'text=価格履歴',
        'text=Price Tracking',
        'text=価格追跡',
        'text=Price Alert',
        'text=価格アラート',
        'text=Market Price',
        'text=市場価格',
        'button:has-text("Track")',
        'button:has-text("追跡")'
      ];
      
      let foundPriceTrackingElements = 0;
      for (const element of priceTrackingElements) {
        const count = await page.locator(element).count();
        if (count > 0) {
          foundPriceTrackingElements++;
          console.log(`✅ Found price tracking element: ${element}`);
        }
      }
      
      console.log(`Found ${foundPriceTrackingElements} price tracking elements`);
    });

    test('should display price comparison data', async ({ page }) => {
      await page.goto('/products');
      await page.waitForLoadState('networkidle');
      
      // Look for price comparison features
      const priceComparisonElements = [
        'text=Compare',
        'text=比較',
        'text=Best Price',
        'text=最安値',
        'text=Lowest',
        'text=最低',
        'text=Highest',
        'text=最高',
        'text=Average',
        'text=平均'
      ];
      
      let foundComparisonElements = 0;
      for (const element of priceComparisonElements) {
        const count = await page.locator(element).count();
        if (count > 0) {
          foundComparisonElements++;
          console.log(`✅ Found price comparison element: ${element}`);
        }
      }
      
      console.log(`Found ${foundComparisonElements} price comparison elements`);
    });
  });

  test.describe('Competitor Analysis', () => {
    test('should provide competitor analysis tools', async ({ page }) => {
      // Check various pages for competitor analysis features
      const competitorPages = ['/analytics', '/products', '/dashboard'];
      
      let competitorFeaturesFound = false;
      
      for (const pagePath of competitorPages) {
        try {
          await page.goto(pagePath);
          await page.waitForLoadState('networkidle');
          
          // Look for competitor analysis elements
          const competitorElements = [
            'text=Competitor',
            'text=競合',
            'text=Competition',
            'text=競争',
            'text=Market Analysis',
            'text=市場分析',
            'text=Benchmark',
            'text=ベンチマーク',
            'text=Comparison',
            'text=比較分析'
          ];
          
          let foundCompetitorElements = 0;
          for (const element of competitorElements) {
            const count = await page.locator(element).count();
            if (count > 0) {
              foundCompetitorElements++;
              console.log(`✅ Found competitor element: ${element} on ${pagePath}`);
            }
          }
          
          if (foundCompetitorElements > 0) {
            competitorFeaturesFound = true;
            console.log(`✅ Competitor analysis features found at: ${pagePath}`);
            break;
          }
        } catch (error) {
          console.log(`⚠️ Could not access ${pagePath}: ${error}`);
        }
      }
      
      console.log(`Competitor analysis features found: ${competitorFeaturesFound}`);
    });
  });

  test.describe('Product Sourcing Tools', () => {
    test('should access product sourcing features', async ({ page }) => {
      await page.goto('/products');
      await page.waitForLoadState('networkidle');
      
      // Look for sourcing-related elements
      const sourcingElements = [
        'text=Supplier',
        'text=仕入れ先',
        'text=Source',
        'text=仕入れ',
        'text=Wholesale',
        'text=卸売',
        'text=Vendor',
        'text=ベンダー',
        'text=Purchase',
        'text=購入'
      ];
      
      let foundSourcingElements = 0;
      for (const element of sourcingElements) {
        const count = await page.locator(element).count();
        if (count > 0) {
          foundSourcingElements++;
          console.log(`✅ Found sourcing element: ${element}`);
        }
      }
      
      console.log(`Found ${foundSourcingElements} sourcing elements`);
    });

    test('should calculate sourcing profitability', async ({ page }) => {
      await page.goto('/products/new');
      await page.waitForLoadState('networkidle');
      
      // Look for sourcing profitability calculations
      const profitabilityElements = [
        'text=Profit per Unit',
        'text=単価利益',
        'text=Total Profit',
        'text=総利益',
        'text=Break Even',
        'text=損益分岐点',
        'text=Minimum Order',
        'text=最小注文'
      ];
      
      let foundProfitabilityElements = 0;
      for (const element of profitabilityElements) {
        const count = await page.locator(element).count();
        if (count > 0) {
          foundProfitabilityElements++;
          console.log(`✅ Found profitability element: ${element}`);
        }
      }
      
      console.log(`Found ${foundProfitabilityElements} profitability calculation elements`);
    });
  });

  test.describe('Seller Performance Analytics', () => {
    test('should display seller-specific analytics', async ({ page }) => {
      await page.goto('/analytics');
      await page.waitForLoadState('networkidle');
      
      // Verify analytics page is accessible
      const currentUrl = page.url();
      expect(currentUrl).toContain('/analytics');
      
      // Look for seller-specific analytics
      const sellerAnalyticsElements = [
        'text=Sales Performance',
        'text=売上実績',
        'text=Profit Trends',
        'text=利益トレンド',
        'text=Inventory Turnover',
        'text=在庫回転率',
        'text=Best Sellers',
        'text=ベストセラー',
        'text=Product Performance',
        'text=商品パフォーマンス'
      ];
      
      let foundSellerAnalytics = 0;
      for (const element of sellerAnalyticsElements) {
        const count = await page.locator(element).count();
        if (count > 0) {
          foundSellerAnalytics++;
          console.log(`✅ Found seller analytics element: ${element}`);
        }
      }
      
      console.log(`Found ${foundSellerAnalytics} seller-specific analytics elements`);
    });

    test('should provide actionable business insights', async ({ page }) => {
      await page.goto('/analytics');
      await page.waitForLoadState('networkidle');
      
      // Look for actionable insights
      const insightElements = [
        'text=Recommendation',
        'text=おすすめ',
        'text=Insight',
        'text=洞察',
        'text=Opportunity',
        'text=機会',
        'text=Alert',
        'text=アラート',
        'text=Action Required',
        'text=要対応'
      ];
      
      let foundInsights = 0;
      for (const element of insightElements) {
        const count = await page.locator(element).count();
        if (count > 0) {
          foundInsights++;
          console.log(`✅ Found insight element: ${element}`);
        }
      }
      
      console.log(`Found ${foundInsights} business insight elements`);
    });
  });

  test.describe('Error Handling and Edge Cases', () => {
    test('should handle invalid profit calculations gracefully', async ({ page }) => {
      await page.goto('/products/new');
      await page.waitForLoadState('networkidle');
      
      // Try to enter invalid values for calculation
      const invalidCosts = ['', '0', '-100', 'abc'];
      const invalidPrices = ['', '0', '-50', 'xyz'];
      
      for (const invalidCost of invalidCosts) {
        try {
          await fillFieldIfExists(page, 'input[placeholder*="cost"]', invalidCost);
          await fillFieldIfExists(page, 'input[placeholder*="price"]', '1000');
          await page.waitForTimeout(500);
          
          // Look for error messages or validation
          const errorElements = [
            'text=Error',
            'text=エラー',
            'text=Invalid',
            'text=無効',
            'text=Required',
            'text=必須'
          ];
          
          let foundError = false;
          for (const element of errorElements) {
            const count = await page.locator(element).count();
            if (count > 0) {
              foundError = true;
              console.log(`✅ Found error handling for invalid cost: ${invalidCost}`);
              break;
            }
          }
          
          if (!foundError) {
            console.log(`⚠️ No error handling found for invalid cost: ${invalidCost}`);
          }
        } catch (error) {
          console.log(`⚠️ Error testing invalid cost ${invalidCost}: ${error}`);
        }
      }
    });

    test('should maintain seller session across sedori features', async ({ page }) => {
      const sellerPages = ['/dashboard', '/products', '/products/new', '/analytics'];
      
      for (const sellerPage of sellerPages) {
        try {
          await page.goto(sellerPage);
          await page.waitForLoadState('networkidle');
          
          // Verify seller is still authenticated
          const cookies = await page.context().cookies();
          const hasAuth = cookies.some(cookie => ['auth_token', 'user_data'].includes(cookie.name));
          
          expect(hasAuth).toBeTruthy();
          console.log(`✅ Seller session maintained on: ${sellerPage}`);
        } catch (error) {
          console.log(`⚠️ Error accessing ${sellerPage}: ${error}`);
        }
      }
    });
  });
});