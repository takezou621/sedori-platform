import { test, expect } from '@playwright/test';

test.describe('カート・注文システムE2Eテスト', () => {
  test.beforeEach(async ({ page }) => {
    // 各テスト前にログイン
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'Test@123456');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 10000 });
  });

  test('商品をカートに追加する完全フロー', async ({ page }) => {
    // 1. 商品ページに移動
    await page.goto('/products');
    await expect(page.locator('[data-testid="product-card"]')).toHaveCount.greaterThan(0);

    // 2. 最初の商品の詳細ページに移動
    await page.locator('[data-testid="product-card"]').first().click();
    await expect(page).toHaveURL(/.*products\/[a-f0-9-]+/);

    // 3. 商品情報の確認
    const productName = await page.locator('[data-testid="product-name"]').textContent();
    const productPrice = await page.locator('[data-testid="product-price"]').textContent();
    
    expect(productName).toBeTruthy();
    expect(productPrice).toBeTruthy();

    // 4. カートに追加
    await page.click('button[data-testid="add-to-cart"]');
    
    // 5. カートに追加されたことを確認（通知やカートアイコンの更新）
    const cartNotification = page.locator('text=商品がカートに追加されました');
    if (await cartNotification.isVisible({ timeout: 3000 })) {
      await expect(cartNotification).toBeVisible();
    }

    // 6. カートページに移動
    await page.goto('/cart');
    
    // 7. カートに商品が表示されているか確認
    await expect(page.locator('[data-testid="cart-item"]')).toHaveCount.greaterThan(0);
    await expect(page.locator(`text=${productName?.substring(0, 20)}`)).toBeVisible();
  });

  test('カート内での数量変更', async ({ page }) => {
    // カートに商品があることを前提とする（前のテストでカートに追加済み）
    await page.goto('/cart');
    
    const cartItem = page.locator('[data-testid="cart-item"]').first();
    await expect(cartItem).toBeVisible();

    // 現在の数量を取得
    const quantityInput = cartItem.locator('input[data-testid="quantity-input"]');
    const currentQuantity = await quantityInput.inputValue();
    
    // 数量を増加
    const increaseButton = cartItem.locator('button[data-testid="increase-quantity"]');
    if (await increaseButton.isVisible()) {
      await increaseButton.click();
      
      // 数量が増加したか確認
      await expect(quantityInput).toHaveValue(String(parseInt(currentQuantity) + 1));
    }

    // 数量を減少
    const decreaseButton = cartItem.locator('button[data-testid="decrease-quantity"]');
    if (await decreaseButton.isVisible()) {
      await decreaseButton.click();
      
      // 数量が元に戻ったか確認
      await expect(quantityInput).toHaveValue(currentQuantity);
    }
  });

  test('カートから商品を削除', async ({ page }) => {
    await page.goto('/cart');
    
    const initialCartItems = page.locator('[data-testid="cart-item"]');
    const initialCount = await initialCartItems.count();
    
    if (initialCount > 0) {
      // 最初の商品を削除
      await initialCartItems.first().locator('button[data-testid="remove-item"]').click();
      
      // 確認ダイアログがある場合は承認
      const confirmDialog = page.locator('text=削除しますか');
      if (await confirmDialog.isVisible({ timeout: 2000 })) {
        await page.click('button:has-text("削除")');
      }
      
      // アイテム数が減ったか確認
      await expect(page.locator('[data-testid="cart-item"]')).toHaveCount(initialCount - 1);
    }
  });

  test('注文作成フロー', async ({ page }) => {
    // カートに商品を追加（テストデータとして）
    await page.goto('/products');
    await page.locator('[data-testid="product-card"]').first().click();
    await page.click('button[data-testid="add-to-cart"]');
    
    // チェックアウトページに移動
    await page.goto('/checkout');
    
    // 配送先情報の入力
    await page.fill('input[name="fullName"]', 'E2E Test User');
    await page.fill('input[name="address1"]', '123 Test Street');
    await page.fill('input[name="city"]', 'Tokyo');
    await page.fill('input[name="state"]', 'Tokyo');
    await page.fill('input[name="postalCode"]', '123-4567');
    await page.fill('input[name="country"]', 'Japan');
    
    // 支払い方法の選択
    await page.selectOption('select[name="paymentMethod"]', 'credit_card');
    
    // 注文確認
    const orderSummary = page.locator('[data-testid="order-summary"]');
    await expect(orderSummary).toBeVisible();
    
    // 合計金額の確認
    const totalAmount = page.locator('[data-testid="total-amount"]');
    await expect(totalAmount).toBeVisible();
    
    // 注文確定ボタンをクリック
    await page.click('button[data-testid="place-order"]');
    
    // 注文完了ページにリダイレクトされるか確認
    await expect(page).toHaveURL(/.*orders\/[a-f0-9-]+/, { timeout: 15000 });
    
    // 注文完了メッセージの確認
    await expect(page.locator('text=注文が完了しました')).toBeVisible();
    
    // 注文番号の表示確認
    await expect(page.locator('[data-testid="order-number"]')).toBeVisible();
  });

  test('注文履歴の確認', async ({ page }) => {
    // 注文履歴ページに移動
    await page.goto('/orders');
    
    // 注文履歴の表示確認
    await expect(page.locator('h1')).toContainText('注文履歴');
    
    const orderItems = page.locator('[data-testid="order-item"]');
    const orderCount = await orderItems.count();
    
    if (orderCount > 0) {
      // 最初の注文の詳細を確認
      const firstOrder = orderItems.first();
      await expect(firstOrder.locator('[data-testid="order-number"]')).toBeVisible();
      await expect(firstOrder.locator('[data-testid="order-date"]')).toBeVisible();
      await expect(firstOrder.locator('[data-testid="order-total"]')).toBeVisible();
      await expect(firstOrder.locator('[data-testid="order-status"]')).toBeVisible();
      
      // 注文詳細ページへのリンクをクリック
      await firstOrder.click();
      
      // 注文詳細ページの確認
      await expect(page).toHaveURL(/.*orders\/[a-f0-9-]+/);
      await expect(page.locator('[data-testid="order-details"]')).toBeVisible();
    } else {
      // 注文がない場合のメッセージ確認
      await expect(page.locator('text=注文履歴がありません')).toBeVisible();
    }
  });

  test('カートの永続化', async ({ page, context }) => {
    // カートに商品を追加
    await page.goto('/products');
    await page.locator('[data-testid="product-card"]').first().click();
    await page.click('button[data-testid="add-to-cart"]');
    
    // 新しいタブで同じサイトを開く
    const newPage = await context.newPage();
    await newPage.goto('/auth/login');
    await newPage.fill('input[name="email"]', 'test@example.com');
    await newPage.fill('input[name="password"]', 'Test@123456');
    await newPage.click('button[type="submit"]');
    
    // カートページに移動
    await newPage.goto('/cart');
    
    // カートの内容が保持されているか確認
    await expect(newPage.locator('[data-testid="cart-item"]')).toHaveCount.greaterThan(0);
    
    await newPage.close();
  });
});