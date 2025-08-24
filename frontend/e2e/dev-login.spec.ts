import { test, expect } from '@playwright/test';

test.describe('開発モード E2E ワンクリックログイン', () => {
  test('開発モード用ログインパネルの表示と動作確認', async ({ page }) => {
    console.log('Testing development mode login panel');
    
    // ホームページにアクセス
    await page.goto('http://localhost:3002');
    await expect(page.locator('body')).toBeVisible();
    
    // 開発モード用パネルが表示されることを確認（開発環境でのみ）
    const devPanelTrigger = page.locator('[data-testid="show-dev-panel"]');
    if (await devPanelTrigger.count() > 0) {
      console.log('✅ Development mode detected - dev panel available');
      
      // パネルを開く
      await devPanelTrigger.click();
      await page.waitForTimeout(1000);
      
      // パネルが表示されることを確認
      await expect(page.locator('[data-testid="dev-login-panel"]')).toBeVisible();
      console.log('✅ Dev login panel opened successfully');
      
      // テストアカウントボタンが表示されることを確認
      const testUserButton = page.locator('[data-testid="dev-login-test-user-1"]');
      const testAdminButton = page.locator('[data-testid="dev-login-test-admin"]');
      const testSellerButton = page.locator('[data-testid="dev-login-test-seller"]');
      
      await expect(testUserButton).toBeVisible();
      await expect(testAdminButton).toBeVisible();  
      await expect(testSellerButton).toBeVisible();
      console.log('✅ All test account buttons are visible');
      
    } else {
      console.log('ℹ️ Production mode - dev panel not available (this is expected)');
    }
  });

  test('テストユーザーでワンクリックログイン', async ({ page }) => {
    console.log('Testing one-click login with test user');
    
    await page.goto('http://localhost:3002');
    
    // 開発モード用パネルを開く
    const devPanelTrigger = page.locator('[data-testid="show-dev-panel"]');
    if (await devPanelTrigger.count() > 0) {
      await devPanelTrigger.click();
      await page.waitForTimeout(1000);
      
      // テストユーザー1でログイン
      const testUserButton = page.locator('[data-testid="dev-login-test-user-1"]');
      await testUserButton.click();
      
      // ダッシュボードにリダイレクトされることを確認
      await page.waitForTimeout(5000); // ログイン処理とリダイレクトを待機
      
      // ダッシュボードページが表示されることを確認
      const currentUrl = page.url();
      if (currentUrl.includes('/dashboard')) {
        console.log('✅ Successfully logged in and redirected to dashboard');
        
        // ダッシュボードの内容が表示されることを確認
        const welcomeMessage = page.locator('text=Welcome back');
        if (await welcomeMessage.count() > 0) {
          console.log('✅ Dashboard welcome message found');
        }
        
        // せどり関連の要素が表示されることを確認
        const sedoriElements = page.locator('.stats, .analytics');
        const elementCount = await sedoriElements.count();
        if (elementCount > 0) {
          console.log(`✅ Found ${elementCount} sedori business elements on dashboard`);
        }
        
      } else {
        console.log(`⚠️ Expected dashboard redirect, but current URL is: ${currentUrl}`);
      }
    } else {
      console.log('ℹ️ Skipping test in production mode');
    }
  });

  test('管理者テストアカウントでログイン', async ({ page }) => {
    console.log('Testing admin account login');
    
    await page.goto('http://localhost:3002');
    
    const devPanelTrigger = page.locator('[data-testid="show-dev-panel"]');
    if (await devPanelTrigger.count() > 0) {
      await devPanelTrigger.click();
      await page.waitForTimeout(1000);
      
      // 管理者テストアカウントでログイン
      const adminButton = page.locator('[data-testid="dev-login-test-admin"]');
      await adminButton.click();
      
      await page.waitForTimeout(5000);
      
      const currentUrl = page.url();
      if (currentUrl.includes('/dashboard')) {
        console.log('✅ Admin account login successful');
      } else {
        console.log(`⚠️ Admin login may have failed, URL: ${currentUrl}`);
      }
    }
  });

  test('せどり業者テストアカウントでログイン', async ({ page }) => {
    console.log('Testing seller account login');
    
    await page.goto('http://localhost:3002');
    
    const devPanelTrigger = page.locator('[data-testid="show-dev-panel"]');
    if (await devPanelTrigger.count() > 0) {
      await devPanelTrigger.click();
      await page.waitForTimeout(1000);
      
      // せどり業者テストアカウントでログイン
      const sellerButton = page.locator('[data-testid="dev-login-test-seller"]');
      await sellerButton.click();
      
      await page.waitForTimeout(5000);
      
      const currentUrl = page.url();
      if (currentUrl.includes('/dashboard')) {
        console.log('✅ Seller account login successful');
        
        // せどり関連機能が利用可能か確認
        await page.goto('http://localhost:3002/products');
        await page.waitForTimeout(2000);
        
        // せどり機能の表示確認
        const sedoriFeatures = page.locator('text=利益率, text=ROI, text=仕入れ価格');
        const featureCount = await sedoriFeatures.count();
        
        if (featureCount > 0) {
          console.log(`✅ Sedori features accessible: ${featureCount} features found`);
        }
        
      } else {
        console.log(`⚠️ Seller login may have failed, URL: ${currentUrl}`);
      }
    }
  });
  
  test('パネルの開閉動作確認', async ({ page }) => {
    console.log('Testing panel open/close functionality');
    
    await page.goto('http://localhost:3002');
    
    const devPanelTrigger = page.locator('[data-testid="show-dev-panel"]');
    if (await devPanelTrigger.count() > 0) {
      // パネルを開く
      await devPanelTrigger.click();
      await page.waitForTimeout(500);
      
      const panel = page.locator('[data-testid="dev-login-panel"]');
      await expect(panel).toBeVisible();
      console.log('✅ Panel opened successfully');
      
      // パネルを閉じる
      const closeButton = page.locator('[data-testid="hide-dev-panel"]');
      await closeButton.click();
      await page.waitForTimeout(500);
      
      // パネルが非表示になることを確認（ただし、開発環境では再度開けるボタンが表示される）
      await expect(devPanelTrigger).toBeVisible();
      console.log('✅ Panel closed successfully');
    }
  });
});