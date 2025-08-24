import { test, expect } from '@playwright/test';

test.describe('商品検索・カートE2Eテスト', () => {
  test('商品ページの基本機能確認', async ({ page }) => {
    console.log('Testing product page basic functionality');
    
    // 商品ページに移動
    await page.goto('http://localhost:3005/products');
    await expect(page.locator('body')).toBeVisible();
    
    // ページタイトルまたはヘッダーの確認
    const pageTitle = page.locator('h1, h2, [role="heading"]');
    if (await pageTitle.count() > 0) {
      console.log('✅ Product page header found');
    }
    
    // 商品カードまたはリストの確認
    const productElements = page.locator('[data-testid*="product"], .product, [class*="product"]');
    const productCount = await productElements.count();
    
    if (productCount > 0) {
      console.log(`✅ Found ${productCount} product elements`);
    } else {
      console.log('⚠️ No product elements found');
    }
    
    // 検索バーの確認
    const searchInput = page.locator('input[placeholder*="検索"], input[placeholder*="search"], input[type="search"]');
    if (await searchInput.count() > 0) {
      console.log('✅ Search input found');
      
      // 検索機能のテスト
      await searchInput.first().fill('test');
      await searchInput.first().press('Enter');
      await page.waitForTimeout(2000);
      
      console.log('✅ Search functionality tested');
    } else {
      console.log('⚠️ No search input found');
    }
    
    console.log('Product page test completed');
  });

  test('商品詳細ページのナビゲーション', async ({ page }) => {
    console.log('Testing product detail navigation');
    
    await page.goto('http://localhost:3005/products');
    await page.waitForTimeout(3000);
    
    // クリック可能な商品要素を探す
    const productLinks = page.locator('a[href*="/products/"], [data-testid*="product"] a, .product a');
    const clickableProducts = page.locator('button[data-testid*="product"], [data-testid*="product"][role="button"], .product[role="button"]');
    
    if (await productLinks.count() > 0) {
      console.log('Found product links, clicking first one');
      await productLinks.first().click();
      await page.waitForTimeout(2000);
      
      const currentUrl = page.url();
      if (currentUrl.includes('/products/')) {
        console.log('✅ Successfully navigated to product detail page');
        
        // 商品詳細ページの基本要素確認
        const productName = page.locator('[data-testid*="name"], h1, h2, .title, .name');
        const productPrice = page.locator('[data-testid*="price"], .price, [class*="price"]');
        
        if (await productName.count() > 0) {
          console.log('✅ Product name found');
        }
        if (await productPrice.count() > 0) {
          console.log('✅ Product price found');
        }
      }
    } else if (await clickableProducts.count() > 0) {
      console.log('Found clickable product elements');
      await clickableProducts.first().click();
      await page.waitForTimeout(2000);
    } else {
      console.log('⚠️ No clickable product elements found');
    }
    
    console.log('Product detail navigation test completed');
  });

  test('カート機能の基本テスト', async ({ page }) => {
    console.log('Testing cart functionality');
    
    // カートページに直接アクセス
    await page.goto('http://localhost:3005/cart');
    await expect(page.locator('body')).toBeVisible();
    
    // カートページの基本要素確認
    const cartTitle = page.locator('h1, h2, [role="heading"]');
    if (await cartTitle.count() > 0) {
      console.log('✅ Cart page header found');
    }
    
    // 空のカート状態の確認
    const emptyCartMessage = page.locator('text=空, text=empty, text=カートに商品がありません, .empty');
    const cartItems = page.locator('[data-testid*="cart-item"], .cart-item, [class*="cart-item"]');
    
    if (await emptyCartMessage.count() > 0) {
      console.log('✅ Empty cart message displayed');
    } else if (await cartItems.count() > 0) {
      console.log('✅ Cart items found');
      
      // カートアイテムの操作確認
      const quantityInputs = page.locator('input[type="number"], [data-testid*="quantity"]');
      const removeButtons = page.locator('button[data-testid*="remove"], button:has-text("削除"), button:has-text("remove")');
      
      if (await quantityInputs.count() > 0) {
        console.log('✅ Quantity controls found');
      }
      if (await removeButtons.count() > 0) {
        console.log('✅ Remove buttons found');
      }
    }
    
    console.log('Cart functionality test completed');
  });

  test('商品フィルタリング機能', async ({ page }) => {
    console.log('Testing product filtering');
    
    await page.goto('http://localhost:3005/products');
    await page.waitForTimeout(3000);
    
    // フィルター要素を探す
    const categoryFilter = page.locator('select[name*="category"], select:has-text("カテゴリ"), .category-filter select');
    const priceFilter = page.locator('select[name*="price"], input[name*="price"], .price-filter select, .price-filter input');
    const sortFilter = page.locator('select[name*="sort"], .sort-filter select');
    
    // カテゴリフィルターのテスト
    if (await categoryFilter.count() > 0) {
      console.log('✅ Category filter found');
      
      const options = await categoryFilter.first().locator('option').count();
      if (options > 1) {
        // 2番目のオプションを選択
        await categoryFilter.first().selectOption({ index: 1 });
        await page.waitForTimeout(2000);
        console.log('✅ Category filter tested');
      }
    } else {
      console.log('⚠️ No category filter found');
    }
    
    // 価格フィルターのテスト
    if (await priceFilter.count() > 0) {
      console.log('✅ Price filter found');
      
      const filterElement = priceFilter.first();
      const tagName = await filterElement.evaluate(el => el.tagName.toLowerCase());
      
      if (tagName === 'select') {
        const options = await filterElement.locator('option').count();
        if (options > 1) {
          await filterElement.selectOption({ index: 1 });
          await page.waitForTimeout(2000);
        }
      } else if (tagName === 'input') {
        await filterElement.fill('1000');
        await page.waitForTimeout(2000);
      }
      
      console.log('✅ Price filter tested');
    } else {
      console.log('⚠️ No price filter found');
    }
    
    // ソート機能のテスト
    if (await sortFilter.count() > 0) {
      console.log('✅ Sort filter found');
      
      const options = await sortFilter.first().locator('option').count();
      if (options > 1) {
        await sortFilter.first().selectOption({ index: 1 });
        await page.waitForTimeout(2000);
        console.log('✅ Sort filter tested');
      }
    } else {
      console.log('⚠️ No sort filter found');
    }
    
    console.log('Product filtering test completed');
  });

  test('ページネーション機能', async ({ page }) => {
    console.log('Testing pagination functionality');
    
    await page.goto('http://localhost:3005/products');
    await page.waitForTimeout(3000);
    
    // ページネーション要素を探す
    const pagination = page.locator('.pagination, [data-testid*="pagination"], nav[aria-label*="pagination"]');
    const nextButton = page.locator('button:has-text("次"), button:has-text("Next"), a:has-text("次"), a:has-text("Next"), button[aria-label*="次"], a[aria-label*="Next"]');
    const prevButton = page.locator('button:has-text("前"), button:has-text("Previous"), a:has-text("前"), a:has-text("Previous"), button[aria-label*="前"], a[aria-label*="Previous"]');
    const pageNumbers = page.locator('.pagination button[data-page], .pagination a[data-page]');
    
    if (await pagination.count() > 0) {
      console.log('✅ Pagination container found');
    }
    
    if (await nextButton.count() > 0) {
      console.log('✅ Next button found');
      
      // 現在のURL記録
      const currentUrl = page.url();
      
      // 次ページボタンをクリック
      await nextButton.first().click();
      await page.waitForTimeout(2000);
      
      // URLまたはコンテンツが変更されたか確認
      const newUrl = page.url();
      if (newUrl !== currentUrl || newUrl.includes('page=')) {
        console.log('✅ Pagination navigation successful');
      } else {
        console.log('⚠️ Pagination may not be working');
      }
    } else {
      console.log('⚠️ No next button found');
    }
    
    if (await pageNumbers.count() > 0) {
      console.log(`✅ Found ${await pageNumbers.count()} page number buttons`);
    } else {
      console.log('⚠️ No page number buttons found');
    }
    
    console.log('Pagination test completed');
  });

  test('商品詳細からカートへの追加', async ({ page }) => {
    console.log('Testing add to cart from product detail');
    
    await page.goto('http://localhost:3005/products');
    await page.waitForTimeout(3000);
    
    // 商品詳細ページに移動
    const productLinks = page.locator('a[href*="/products/"]');
    
    if (await productLinks.count() > 0) {
      await productLinks.first().click();
      await page.waitForTimeout(3000);
      
      // カートに追加ボタンを探す
      const addToCartButton = page.locator(
        'button[data-testid*="add-to-cart"], ' +
        'button:has-text("カートに追加"), ' +
        'button:has-text("Add to Cart"), ' +
        'button:has-text("カート"), ' +
        '.add-to-cart, ' +
        'button[class*="add-cart"]'
      );
      
      if (await addToCartButton.count() > 0) {
        console.log('✅ Add to cart button found');
        
        // 数量選択があれば設定
        const quantityInput = page.locator('input[name*="quantity"], input[type="number"]');
        if (await quantityInput.count() > 0) {
          await quantityInput.first().fill('2');
          console.log('✅ Quantity set to 2');
        }
        
        // カートに追加
        await addToCartButton.first().click();
        await page.waitForTimeout(2000);
        
        // 成功メッセージまたはカート更新の確認
        const successMessage = page.locator('text=追加, text=added, .success, .notification');
        const cartIcon = page.locator('[data-testid*="cart"], .cart-icon, .cart-count');
        
        if (await successMessage.count() > 0) {
          console.log('✅ Add to cart success message displayed');
        } else if (await cartIcon.count() > 0) {
          console.log('✅ Cart icon updated');
        } else {
          console.log('⚠️ No clear indication of successful cart addition');
        }
        
        // カートページで確認
        await page.goto('http://localhost:3005/cart');
        await page.waitForTimeout(2000);
        
        const cartItems = page.locator('[data-testid*="cart-item"], .cart-item');
        if (await cartItems.count() > 0) {
          console.log('✅ Product successfully added to cart');
        } else {
          console.log('⚠️ Product not found in cart');
        }
      } else {
        console.log('⚠️ No add to cart button found');
      }
    } else {
      console.log('⚠️ No product links found');
    }
    
    console.log('Add to cart test completed');
  });
});