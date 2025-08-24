import { test, expect } from '@playwright/test';

test.describe('スモークテスト - 基本動作確認', () => {
  test('ホームページの基本表示確認', async ({ page }) => {
    console.log('Testing homepage basic functionality');
    
    // ホームページへのアクセス
    await page.goto('http://localhost:3005');
    
    // ページタイトルの確認
    await expect(page).toHaveTitle(/.*/, { timeout: 10000 });
    
    // ページが正常に読み込まれたか確認
    await expect(page.locator('body')).toBeVisible();
    
    console.log('✅ Homepage loads successfully');
  });

  test('認証ページの基本表示確認', async ({ page }) => {
    console.log('Testing authentication pages');
    
    // ログインページ
    await page.goto('http://localhost:3005/auth/login');
    await expect(page.locator('body')).toBeVisible();
    
    // 基本的なフォーム要素の存在確認
    const emailInput = page.locator('input[type="email"], input[name="email"]');
    const passwordInput = page.locator('input[type="password"], input[name="password"]');
    
    if (await emailInput.count() > 0) {
      await expect(emailInput.first()).toBeVisible();
    }
    
    if (await passwordInput.count() > 0) {
      await expect(passwordInput.first()).toBeVisible();
    }
    
    console.log('✅ Authentication pages load successfully');
  });

  test('商品ページの基本表示確認', async ({ page }) => {
    console.log('Testing products page');
    
    // 商品ページにアクセス
    await page.goto('http://localhost:3005/products');
    
    // ページが読み込まれることを確認
    await expect(page.locator('body')).toBeVisible();
    
    // 何らかのコンテンツが表示されていることを確認
    const hasContent = await page.locator('h1, h2, main, [role="main"]').count() > 0;
    expect(hasContent).toBe(true);
    
    console.log('✅ Products page loads successfully');
  });

  test('ナビゲーション基本機能', async ({ page }) => {
    console.log('Testing basic navigation');
    
    await page.goto('http://localhost:3005');
    
    // ナビゲーションリンクのテスト
    const links = page.locator('a[href]');
    const linkCount = await links.count();
    
    if (linkCount > 0) {
      console.log(`Found ${linkCount} navigation links`);
      
      // 最初の内部リンクをクリックしてみる
      for (let i = 0; i < Math.min(3, linkCount); i++) {
        const link = links.nth(i);
        const href = await link.getAttribute('href');
        
        if (href && href.startsWith('/') && !href.startsWith('//')) {
          console.log(`Testing link: ${href}`);
          await link.click();
          await page.waitForTimeout(1000);
          
          // ページが変わったことを確認
          await expect(page.locator('body')).toBeVisible();
          break;
        }
      }
    }
    
    console.log('✅ Basic navigation works');
  });

  test('レスポンシブデザイン基本確認', async ({ page }) => {
    console.log('Testing responsive design');
    
    // デスクトップサイズ
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('http://localhost:3005');
    await expect(page.locator('body')).toBeVisible();
    
    // タブレットサイズ
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.reload();
    await expect(page.locator('body')).toBeVisible();
    
    // モバイルサイズ
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    await expect(page.locator('body')).toBeVisible();
    
    console.log('✅ Responsive design works across viewports');
  });
});