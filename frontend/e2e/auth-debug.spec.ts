import { test, expect } from '@playwright/test';

test.describe('認証フロー詳細デバッグ', () => {
  test('開発モードログインフローのステップバイステップ確認', async ({ page }) => {
    console.log('🔍 Starting detailed authentication flow debug');
    
    // ステップ1: ホームページにアクセス
    await page.goto('http://localhost:3005');
    await page.waitForLoadState('networkidle');
    console.log('✅ Step 1: Home page loaded');
    
    // ステップ2: 開発パネルボタンの確認
    const devPanelTrigger = page.locator('[data-testid="show-dev-panel"]');
    await expect(devPanelTrigger).toBeVisible();
    console.log('✅ Step 2: Dev panel trigger found');
    
    // ステップ3: パネルを開く
    await devPanelTrigger.click();
    await page.waitForTimeout(1000);
    console.log('✅ Step 3: Dev panel opened');
    
    // ステップ4: テストアカウントボタンの確認
    const testUserButton = page.locator('[data-testid="dev-login-test-user-1"]');
    await expect(testUserButton).toBeVisible();
    console.log('✅ Step 4: Test user button found');
    
    // ステップ5: ログイン前の状態確認
    console.log('Current URL before login:', page.url());
    const cookiesBefore = await page.context().cookies();
    console.log('Cookies before login:', cookiesBefore);
    
    // ステップ6: ネットワークリクエストの監視
    page.on('request', request => {
      if (request.url().includes('/api/dev-login') || request.url().includes('/dashboard')) {
        console.log(`🌐 Request: ${request.method()} ${request.url()}`);
      }
    });
    
    page.on('response', response => {
      if (response.url().includes('/api/dev-login') || response.url().includes('/dashboard')) {
        console.log(`📥 Response: ${response.status()} ${response.url()}`);
      }
    });
    
    // ステップ7: ログインボタンをクリック
    console.log('⏳ Clicking login button...');
    await testUserButton.click();
    
    // ステップ8: ログイン処理の完了を待機
    await page.waitForTimeout(3000);
    console.log('⏳ Waited 3 seconds for login processing...');
    
    // ステップ9: 現在のURLを確認
    const currentUrl = page.url();
    console.log('Current URL after login:', currentUrl);
    
    // ステップ10: Cookieの確認
    const cookiesAfter = await page.context().cookies();
    console.log('Cookies after login:', cookiesAfter);
    
    // ステップ11: LocalStorageの確認
    const authToken = await page.evaluate(() => localStorage.getItem('auth-token'));
    console.log('LocalStorage auth-token:', authToken);
    
    // ステップ12: ページコンテンツの確認
    const pageTitle = await page.title();
    console.log('Page title:', pageTitle);
    
    const bodyText = await page.locator('body').textContent();
    console.log('Body contains "dashboard":', bodyText?.includes('dashboard'));
    console.log('Body contains "Welcome":', bodyText?.includes('Welcome'));
    console.log('Body contains "Loading":', bodyText?.includes('Loading'));
    
    // ステップ13: もしダッシュボードにリダイレクトされていない場合、手動でアクセス
    if (!currentUrl.includes('/dashboard')) {
      console.log('⚠️ Not redirected to dashboard, navigating manually...');
      await page.goto('http://localhost:3005/dashboard');
      await page.waitForTimeout(3000);
      
      const finalUrl = page.url();
      console.log('Final URL after manual navigation:', finalUrl);
      
      const dashboardContent = await page.locator('body').textContent();
      console.log('Dashboard contains "Welcome":', dashboardContent?.includes('Welcome'));
      console.log('Dashboard contains "Loading":', dashboardContent?.includes('Loading'));
    }
    
    // テスト結果の判定
    const finalCookies = await page.context().cookies();
    const hasAuthToken = finalCookies.some(cookie => cookie.name === 'auth_token');
    const hasUserData = finalCookies.some(cookie => cookie.name === 'user_data');
    
    console.log('Final test results:');
    console.log('- Has auth_token cookie:', hasAuthToken);
    console.log('- Has user_data cookie:', hasUserData);
    console.log('- Current URL:', page.url());
    
    // アサーション
    expect(hasAuthToken).toBeTruthy();
    expect(hasUserData).toBeTruthy();
  });
  
  test('Dashboard直接アクセス認証状態テスト', async ({ page }) => {
    console.log('🔍 Testing dashboard direct access after login');
    
    // まずログインフローを実行
    await page.goto('http://localhost:3005');
    await page.waitForLoadState('networkidle');
    
    const devPanelTrigger = page.locator('[data-testid="show-dev-panel"]');
    await devPanelTrigger.click();
    await page.waitForTimeout(1000);
    
    const testUserButton = page.locator('[data-testid="dev-login-test-user-1"]');
    await testUserButton.click();
    await page.waitForTimeout(3000);
    
    // Cookieが設定されているか確認
    const cookies = await page.context().cookies();
    const authToken = cookies.find(cookie => cookie.name === 'auth_token');
    const userData = cookies.find(cookie => cookie.name === 'user_data');
    
    console.log('Auth token cookie exists:', !!authToken);
    console.log('User data cookie exists:', !!userData);
    
    if (userData) {
      const decodedUserData = decodeURIComponent(userData.value);
      console.log('User data:', decodedUserData);
      
      try {
        const parsedUser = JSON.parse(decodedUserData);
        console.log('Parsed user:', parsedUser);
      } catch (e) {
        console.log('Failed to parse user data:', e);
      }
    }
    
    // Dashboard に直接アクセス
    await page.goto('http://localhost:3005/dashboard');
    await page.waitForTimeout(5000); // zustand初期化を待機
    
    // Dashboard内容の確認
    const welcomeText = page.locator('h1:has-text("Welcome back")');
    const loadingSpinner = page.locator('text=Loading...');
    
    const hasWelcome = await welcomeText.count() > 0;
    const hasLoading = await loadingSpinner.count() > 0;
    
    console.log('Dashboard shows welcome message:', hasWelcome);
    console.log('Dashboard shows loading spinner:', hasLoading);
    
    if (hasWelcome) {
      const welcomeMessage = await welcomeText.textContent();
      console.log('Welcome message:', welcomeMessage);
    }
    
    // Dashboard metrics cards の確認
    const statsCards = page.locator('.stats, .analytics');
    const cardCount = await statsCards.count();
    console.log('Stats cards count:', cardCount);
    
    // アサーション
    expect(hasWelcome || !hasLoading).toBeTruthy(); // Welcome messageがあるか、Loadingがない
  });
});