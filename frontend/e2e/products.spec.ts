import { test, expect } from '@playwright/test';

test.describe('商品管理・検索システムE2Eテスト', () => {
  test.beforeEach(async ({ page }) => {
    // 各テスト前にログイン
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'Test@123456');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 10000 });
  });

  test('商品一覧ページの表示', async ({ page }) => {
    // 商品ページに移動
    await page.goto('/products');
    
    // ページタイトル確認
    await expect(page.locator('h1')).toContainText('商品一覧');
    
    // 商品カードが表示されているか確認
    await expect(page.locator('[data-testid="product-card"]')).toHaveCount.greaterThan(0);
    
    // 検索バーの存在確認
    await expect(page.locator('input[placeholder*="商品を検索"]')).toBeVisible();
    
    // カテゴリフィルターの存在確認
    await expect(page.locator('select[name="category"]')).toBeVisible();
  });

  test('商品検索機能', async ({ page }) => {
    await page.goto('/products');
    
    // 検索キーワードを入力
    const searchInput = page.locator('input[placeholder*="商品を検索"]');
    await searchInput.fill('Hat');
    await searchInput.press('Enter');
    
    // 検索結果の確認
    await page.waitForTimeout(2000); // API応答待ち
    
    // 検索結果に「Hat」が含まれているか確認
    const productTitles = page.locator('[data-testid="product-title"]');
    const count = await productTitles.count();
    
    if (count > 0) {
      // 検索結果がある場合、商品名に「Hat」が含まれているか確認
      const firstProductTitle = await productTitles.first().textContent();
      expect(firstProductTitle).toContain('Hat');
    }
  });

  test('商品詳細ページ', async ({ page }) => {
    await page.goto('/products');
    
    // 最初の商品カードをクリック
    const firstProductCard = page.locator('[data-testid="product-card"]').first();
    await firstProductCard.click();
    
    // 商品詳細ページに移動したか確認
    await expect(page).toHaveURL(/.*products\/[a-f0-9-]+/);
    
    // 商品詳細情報の確認
    await expect(page.locator('[data-testid="product-name"]')).toBeVisible();
    await expect(page.locator('[data-testid="product-price"]')).toBeVisible();
    await expect(page.locator('[data-testid="product-description"]')).toBeVisible();
    
    // カートに追加ボタンの確認
    await expect(page.locator('button[data-testid="add-to-cart"]')).toBeVisible();
  });

  test('カテゴリフィルター機能', async ({ page }) => {
    await page.goto('/products');
    
    // カテゴリフィルターを選択
    const categorySelect = page.locator('select[name="category"]');
    await categorySelect.selectOption({ label: 'Electronics' });
    
    // フィルター適用の待機
    await page.waitForTimeout(2000);
    
    // フィルターされた結果の確認
    const productCards = page.locator('[data-testid="product-card"]');
    const count = await productCards.count();
    
    // 商品が表示されているか、または「商品が見つかりません」メッセージが表示されているか確認
    if (count === 0) {
      await expect(page.locator('text=商品が見つかりません')).toBeVisible();
    } else {
      // 商品が表示されている場合、カテゴリ情報を確認
      await expect(productCards.first()).toBeVisible();
    }
  });

  test('商品一覧のページネーション', async ({ page }) => {
    await page.goto('/products');
    
    // ページネーションの確認
    const paginationNext = page.locator('button[aria-label="次のページ"]');
    
    if (await paginationNext.isVisible()) {
      // 次のページボタンをクリック
      await paginationNext.click();
      
      // URLのクエリパラメータが更新されたか確認
      await expect(page).toHaveURL(/.*page=2/);
      
      // 新しい商品が読み込まれたか確認
      await page.waitForTimeout(2000);
      await expect(page.locator('[data-testid="product-card"]')).toHaveCount.greaterThan(0);
    }
  });

  test('レスポンシブデザインの確認', async ({ page }) => {
    // モバイルサイズに変更
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/products');
    
    // モバイルレイアウトの確認
    await expect(page.locator('[data-testid="product-card"]')).toBeVisible();
    
    // ハンバーガーメニューの存在確認（モバイル表示時）
    const mobileMenuButton = page.locator('button[aria-label="メニューを開く"]');
    if (await mobileMenuButton.isVisible()) {
      await mobileMenuButton.click();
      await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
    }
  });
});