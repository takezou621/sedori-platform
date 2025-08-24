import { test, expect } from '@playwright/test';

test.describe('フルシナリオ統合E2Eテスト', () => {
  
  test('完全なせどりプラットフォーム利用フロー', async ({ page }) => {
    const timestamp = Date.now();
    const testUser = {
      name: `せどりユーザー${timestamp}`,
      email: `sedori-user-${timestamp}@example.com`,
      password: 'Sedori@2025!'
    };

    // === PHASE 1: ユーザー登録とオンボーディング ===
    console.log('Phase 1: User Registration and Onboarding');
    
    await page.goto('/');
    await expect(page).toHaveTitle(/Sedori Platform/);
    
    // プラットフォームの主要価値提案が表示されているか確認
    await expect(page.locator('text=せどり・転売')).toBeVisible();
    
    // 新規登録
    await page.click('text=無料で始める');
    await page.fill('input[name="name"]', testUser.name);
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);
    await page.fill('input[name="confirmPassword"]', testUser.password);
    await page.click('button[type="submit"]');
    
    // ダッシュボードへのリダイレクト確認
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 15000 });
    await expect(page.locator(`text=${testUser.name}`)).toBeVisible();

    // === PHASE 2: 商品リサーチと分析 ===
    console.log('Phase 2: Product Research and Analysis');
    
    // 商品検索機能の利用
    await page.goto('/products');
    await expect(page.locator('h1')).toContainText('商品一覧');
    
    // 利益率の高い商品を検索
    await page.fill('input[placeholder*="商品を検索"]', 'profitable');
    await page.press('input[placeholder*="商品を検索"]', 'Enter');
    await page.waitForTimeout(3000);
    
    // 商品フィルタリング（価格帯で絞り込み）
    const priceFilter = page.locator('select[name="priceRange"]');
    if (await priceFilter.isVisible()) {
      await priceFilter.selectOption('10000-50000');
      await page.waitForTimeout(2000);
    }
    
    // 最初の商品の詳細分析
    const productCards = page.locator('[data-testid="product-card"]');
    await expect(productCards).toHaveCount.greaterThan(0);
    
    const firstProduct = productCards.first();
    await firstProduct.click();
    
    // 商品詳細ページで利益分析データを確認
    await expect(page.locator('[data-testid="product-name"]')).toBeVisible();
    await expect(page.locator('[data-testid="profit-margin"]')).toBeVisible();
    await expect(page.locator('[data-testid="market-price"]')).toBeVisible();
    await expect(page.locator('[data-testid="wholesale-price"]')).toBeVisible();
    
    // 競合分析データの確認
    const competitorData = page.locator('[data-testid="competitor-analysis"]');
    if (await competitorData.isVisible()) {
      await expect(competitorData).toContainText('Amazon');
      await expect(competitorData).toContainText('楽天');
    }

    // === PHASE 3: 在庫管理とカート機能 ===
    console.log('Phase 3: Inventory Management and Cart');
    
    // 在庫数確認
    const stockInfo = page.locator('[data-testid="stock-quantity"]');
    await expect(stockInfo).toBeVisible();
    
    // カートに追加（数量を指定）
    const quantityInput = page.locator('input[data-testid="quantity-selector"]');
    if (await quantityInput.isVisible()) {
      await quantityInput.fill('3');
    }
    
    await page.click('button[data-testid="add-to-cart"]');
    await expect(page.locator('text=カートに追加されました')).toBeVisible();
    
    // 別の商品も追加
    await page.goto('/products');
    await page.locator('[data-testid="product-card"]').nth(1).click();
    await page.click('button[data-testid="add-to-cart"]');

    // === PHASE 4: 価格最適化と利益計算 ===
    console.log('Phase 4: Price Optimization and Profit Calculation');
    
    await page.goto('/cart');
    
    // カート内で利益計算の確認
    const cartItems = page.locator('[data-testid="cart-item"]');
    await expect(cartItems).toHaveCount.greaterThan(1);
    
    // 各商品の利益マージンが表示されているか確認
    const profitMargins = page.locator('[data-testid="item-profit-margin"]');
    const profitCount = await profitMargins.count();
    expect(profitCount).toBeGreaterThan(0);
    
    // 合計利益の表示確認
    await expect(page.locator('[data-testid="total-profit"]')).toBeVisible();
    await expect(page.locator('[data-testid="total-roi"]')).toBeVisible();

    // === PHASE 5: 注文処理と配送管理 ===
    console.log('Phase 5: Order Processing and Shipping');
    
    // チェックアウトプロセス
    await page.click('button[data-testid="proceed-to-checkout"]');
    await expect(page).toHaveURL(/.*checkout/);
    
    // 配送先情報入力
    await page.fill('input[name="fullName"]', testUser.name);
    await page.fill('input[name="address1"]', '東京都渋谷区代々木1-1-1');
    await page.fill('input[name="city"]', '渋谷区');
    await page.fill('input[name="state"]', '東京都');
    await page.fill('input[name="postalCode"]', '151-0053');
    await page.fill('input[name="country"]', '日本');
    
    // 配送オプション選択
    const shippingOptions = page.locator('input[name="shippingMethod"]');
    if (await shippingOptions.count() > 0) {
      await shippingOptions.first().check();
    }
    
    // 支払い方法選択
    await page.selectOption('select[name="paymentMethod"]', 'credit_card');
    
    // 注文最終確認
    await expect(page.locator('[data-testid="order-summary"]')).toBeVisible();
    await expect(page.locator('[data-testid="total-amount"]')).toBeVisible();
    
    // 注文確定
    await page.click('button[data-testid="place-order"]');
    
    // 注文完了確認
    await expect(page).toHaveURL(/.*orders\/[a-f0-9-]+/, { timeout: 20000 });
    await expect(page.locator('text=注文完了')).toBeVisible();
    
    const orderNumber = await page.locator('[data-testid="order-number"]').textContent();
    expect(orderNumber).toBeTruthy();

    // === PHASE 6: ビジネス分析とレポート ===
    console.log('Phase 6: Business Analytics and Reporting');
    
    // ダッシュボードでの売上分析
    await page.goto('/dashboard');
    
    // 売上サマリーの確認
    const statsCards = page.locator('[data-testid="stats-card"]');
    await expect(statsCards).toHaveCount.greaterThan(2);
    
    // 最近の注文が表示されているか確認
    await expect(page.locator('[data-testid="recent-orders"]')).toBeVisible();
    
    // 利益分析セクションの確認
    const profitAnalysis = page.locator('[data-testid="profit-analysis"]');
    if (await profitAnalysis.isVisible()) {
      await expect(profitAnalysis).toContainText('利益率');
      await expect(profitAnalysis).toContainText('ROI');
    }

    // === PHASE 7: マーケット分析ツール ===
    console.log('Phase 7: Market Analysis Tools');
    
    // アナリティクスページ（存在する場合）
    const analyticsLink = page.locator('text=分析・レポート');
    if (await analyticsLink.isVisible()) {
      await analyticsLink.click();
      
      // トレンド分析の確認
      await expect(page.locator('[data-testid="trend-chart"]')).toBeVisible();
      
      // 競合分析データの確認
      const competitorSection = page.locator('[data-testid="competitor-analysis-section"]');
      if (await competitorSection.isVisible()) {
        await expect(competitorSection).toContainText('競合価格');
      }
    }

    // === PHASE 8: ユーザーアカウント管理 ===
    console.log('Phase 8: User Account Management');
    
    // プロファイル設定の確認
    await page.goto('/profile');
    
    // アカウント情報の表示確認
    await expect(page.locator(`text=${testUser.email}`)).toBeVisible();
    await expect(page.locator(`text=${testUser.name}`)).toBeVisible();
    
    // 設定変更のテスト
    const editButton = page.locator('button[data-testid="edit-profile"]');
    if (await editButton.isVisible()) {
      await editButton.click();
      
      // プロフィール編集機能の確認
      const nameInput = page.locator('input[name="name"]');
      if (await nameInput.isVisible()) {
        await nameInput.fill(`${testUser.name} (更新済み)`);
        await page.click('button[data-testid="save-profile"]');
        await expect(page.locator('text=更新されました')).toBeVisible();
      }
    }

    // === PHASE 9: モバイル体験確認 ===
    console.log('Phase 9: Mobile Experience Verification');
    
    // モバイルビューでの操作確認
    await page.setViewportSize({ width: 375, height: 667 });
    
    // レスポンシブデザインの確認
    await page.goto('/products');
    await expect(page.locator('[data-testid="product-card"]')).toBeVisible();
    
    // モバイルナビゲーションの確認
    const mobileMenu = page.locator('button[aria-label="メニューを開く"]');
    if (await mobileMenu.isVisible()) {
      await mobileMenu.click();
      await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
    }

    // === PHASE 10: 最終ログアウト ===
    console.log('Phase 10: Final Logout');
    
    await page.setViewportSize({ width: 1920, height: 1080 }); // デスクトップに戻す
    await page.goto('/dashboard');
    
    // ログアウト
    const logoutButton = page.locator('text=ログアウト');
    await logoutButton.click();
    
    // ホームページにリダイレクトされたか確認
    await expect(page).toHaveURL(/.*login/, { timeout: 10000 });
    
    console.log('✅ 完全なせどりプラットフォーム利用フローが正常に完了しました');
  });

  test('パフォーマンスとユーザビリティの総合テスト', async ({ page }) => {
    // ページ読み込み速度の測定
    const performanceEntries: any[] = [];
    
    page.on('response', response => {
      performanceEntries.push({
        url: response.url(),
        status: response.status(),
        timing: Date.now()
      });
    });

    await page.goto('/');
    
    // 主要ページの読み込み速度確認
    const startTime = Date.now();
    await page.goto('/products');
    const loadTime = Date.now() - startTime;
    
    // 3秒以内の読み込みを期待
    expect(loadTime).toBeLessThan(3000);
    
    // アクセシビリティの基本確認
    await page.goto('/auth/login');
    
    // フォーム要素のラベル確認
    const emailInput = page.locator('input[name="email"]');
    await expect(emailInput).toHaveAttribute('aria-label');
    
    // キーボードナビゲーション確認
    await page.keyboard.press('Tab');
    await expect(emailInput).toBeFocused();
    
    console.log('✅ パフォーマンスとユーザビリティテストが完了しました');
  });
});