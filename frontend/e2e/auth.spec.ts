import { test, expect } from '@playwright/test';

test.describe('認証システムE2Eテスト', () => {
  test('ユーザー登録・ログイン・ログアウトフロー', async ({ page }) => {
    // テスト用のユニークなメールアドレス
    const testEmail = `test-${Date.now()}@example.com`;
    const testPassword = 'Test@123456';
    const testName = 'E2E Test User';

    // 1. ホームページに移動
    await page.goto('/');
    await expect(page).toHaveTitle(/Sedori Platform/);

    // 2. 登録ページに移動
    await page.click('text=登録');
    await expect(page).toHaveURL(/.*register/);
    await expect(page.locator('h1')).toContainText('アカウント作成');

    // 3. ユーザー登録
    await page.fill('input[name="name"]', testName);
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.fill('input[name="confirmPassword"]', testPassword);
    
    await page.click('button[type="submit"]');

    // 4. 登録成功確認（ダッシュボードにリダイレクト）
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 10000 });
    await expect(page.locator('text=ダッシュボード')).toBeVisible();

    // 5. ユーザー名が表示されているか確認
    await expect(page.locator(`text=${testName}`)).toBeVisible();

    // 6. ログアウト
    await page.click('text=ログアウト');
    await expect(page).toHaveURL(/.*login/);

    // 7. ログインテスト
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button[type="submit"]');

    // 8. ログイン成功確認
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 10000 });
    await expect(page.locator(`text=${testName}`)).toBeVisible();
  });

  test('不正な認証情報でのログイン失敗', async ({ page }) => {
    await page.goto('/auth/login');
    
    // 存在しないユーザーでのログイン試行
    await page.fill('input[name="email"]', 'nonexistent@example.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    // エラーメッセージの確認
    await expect(page.locator('text=メールアドレスまたはパスワードが間違っています')).toBeVisible();
    await expect(page).toHaveURL(/.*login/);
  });

  test('パスワード強度検証', async ({ page }) => {
    await page.goto('/auth/register');
    
    await page.fill('input[name="name"]', 'Test User');
    await page.fill('input[name="email"]', 'test@example.com');
    
    // 弱いパスワードを入力
    await page.fill('input[name="password"]', 'weak');
    await page.fill('input[name="confirmPassword"]', 'weak');
    
    await page.click('button[type="submit"]');

    // パスワード強度エラーの確認
    await expect(page.locator('text=パスワードは大文字・小文字・数字・記号を含む必要があります')).toBeVisible();
  });
});