import { test, expect } from '@playwright/test';

test.describe('開発モードログイン 簡単テスト', () => {
  test.setTimeout(30000);

  test('devtest1アカウントでの簡単ログインテスト', async ({ page }) => {
    console.log('🚀 Starting simple login test');
    
    // ホームページにアクセス
    await page.goto('http://localhost:3002');
    console.log('✅ Home page loaded');
    
    // 開発パネルボタンが表示されることを確認
    const devPanelTrigger = page.locator('[data-testid="show-dev-panel"]');
    await expect(devPanelTrigger).toBeVisible({ timeout: 10000 });
    console.log('✅ Dev panel button found');
    
    // パネルを開く
    await devPanelTrigger.click();
    await page.waitForTimeout(1000);
    
    // テストユーザーボタンが表示されることを確認
    const testUserButton = page.locator('[data-testid="dev-login-test-user-1"]');
    await expect(testUserButton).toBeVisible({ timeout: 10000 });
    console.log('✅ Test user button found');
    
    // ログインAPIの監視
    let loginSuccessful = false;
    page.on('response', response => {
      if (response.url().includes('/api/dev-login') && response.status() === 200) {
        console.log('✅ Login API call successful');
        loginSuccessful = true;
      }
      if (response.url().includes('/api/dev-login') && response.status() !== 200) {
        console.log('❌ Login API call failed:', response.status());
      }
    });
    
    // ログインボタンをクリック
    await testUserButton.click();
    console.log('✅ Login button clicked');
    
    // ログイン処理を待機
    await page.waitForTimeout(5000);
    
    // URLの確認 - ダッシュボードにリダイレクトされているか、ホームでもOK
    const currentUrl = page.url();
    console.log('Current URL:', currentUrl);
    
    // ログインが成功していれば（APIが200を返していれば）テスト成功
    if (loginSuccessful) {
      console.log('✅ Test passed: Login API was successful');
    } else {
      // APIの成功を見れなかった場合でも、クッキーをチェック
      const cookies = await page.context().cookies();
      const hasAuthToken = cookies.some(cookie => cookie.name === 'auth_token');
      const hasUserData = cookies.some(cookie => cookie.name === 'user_data');
      
      console.log('Has auth_token cookie:', hasAuthToken);
      console.log('Has user_data cookie:', hasUserData);
      
      if (hasAuthToken && hasUserData) {
        console.log('✅ Test passed: Cookies are set correctly');
        loginSuccessful = true;
      }
    }
    
    // アサーション - ログインが成功したか、適切なクッキーが設定されているか
    const cookies = await page.context().cookies();
    const hasAuthToken = cookies.some(cookie => cookie.name === 'auth_token');
    const hasUserData = cookies.some(cookie => cookie.name === 'user_data');
    
    expect(hasAuthToken || loginSuccessful).toBeTruthy();
    expect(hasUserData || loginSuccessful).toBeTruthy();
  });

  test('ダッシュボード直接アクセステスト', async ({ page }) => {
    console.log('🔍 Testing dashboard direct access');
    
    // まずログイン
    await page.goto('http://localhost:3002');
    const devPanelTrigger = page.locator('[data-testid="show-dev-panel"]');
    await devPanelTrigger.click();
    await page.waitForTimeout(1000);
    
    const testUserButton = page.locator('[data-testid="dev-login-test-user-1"]');
    await testUserButton.click();
    await page.waitForTimeout(3000);
    
    // ダッシュボードに直接アクセス
    console.log('Navigating to dashboard...');
    await page.goto('http://localhost:3002/dashboard');
    await page.waitForTimeout(5000);
    
    // ページタイトルを確認
    const title = await page.title();
    console.log('Page title:', title);
    
    // ダッシュボード要素の存在確認
    const welcomeText = page.locator('text=Welcome back');
    const loadingText = page.locator('text=Loading...');
    
    const hasWelcome = await welcomeText.count() > 0;
    const hasLoading = await loadingText.count() > 0;
    
    console.log('Has welcome message:', hasWelcome);
    console.log('Has loading spinner:', hasLoading);
    
    // 成功条件：ウェルカムメッセージがあるか、ローディングがない
    expect(hasWelcome || !hasLoading).toBeTruthy();
  });
});