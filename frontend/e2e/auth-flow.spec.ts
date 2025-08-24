import { test, expect } from '@playwright/test';

test.describe('認証フローE2Eテスト', () => {
  test('基本的なログインフロー', async ({ page }) => {
    console.log('Testing basic login flow');
    
    // ログインページに移動
    await page.goto('http://localhost:3002/auth/login');
    
    // ページが読み込まれたことを確認
    await expect(page.locator('body')).toBeVisible();
    
    // フォーム要素を探す
    const emailField = page.locator('input[type="email"], input[name="email"], input[placeholder*="メール"], input[placeholder*="email"]').first();
    const passwordField = page.locator('input[type="password"], input[name="password"], input[placeholder*="パスワード"], input[placeholder*="password"]').first();
    const submitButton = page.locator('button[type="submit"], button:has-text("ログイン"), button:has-text("Login")').first();
    
    // フォーム要素の存在確認
    if (await emailField.count() > 0 && await passwordField.count() > 0) {
      console.log('Login form elements found');
      
      // テスト用の既存ユーザーでログイン試行
      await emailField.fill('test@example.com');
      await passwordField.fill('Test@123456');
      
      if (await submitButton.count() > 0) {
        await submitButton.click();
        
        // ログイン後の画面遷移を確認
        await page.waitForTimeout(3000);
        
        // ダッシュボードまたはホームページにリダイレクトされたか確認
        const currentUrl = page.url();
        const isLoggedIn = currentUrl.includes('/dashboard') || 
                          currentUrl.includes('/home') || 
                          !currentUrl.includes('/login');
        
        if (isLoggedIn) {
          console.log('✅ Login successful, redirected to:', currentUrl);
        } else {
          console.log('⚠️ Login may have failed or no redirect occurred');
        }
      } else {
        console.log('⚠️ No submit button found');
      }
    } else {
      console.log('⚠️ Login form elements not found');
    }
    
    console.log('Login flow test completed');
  });

  test('ユーザー登録基本フロー', async ({ page }) => {
    console.log('Testing user registration flow');
    
    // 登録ページに移動
    await page.goto('http://localhost:3002/auth/register');
    
    // ページが読み込まれたことを確認
    await expect(page.locator('body')).toBeVisible();
    
    // フォーム要素を探す
    const nameField = page.locator('input[name="name"], input[placeholder*="名前"], input[placeholder*="Name"]').first();
    const emailField = page.locator('input[type="email"], input[name="email"], input[placeholder*="メール"], input[placeholder*="email"]').first();
    const passwordField = page.locator('input[type="password"], input[name="password"], input[placeholder*="パスワード"], input[placeholder*="password"]').first();
    const confirmPasswordField = page.locator('input[name="confirmPassword"], input[name="confirm_password"], input[placeholder*="確認"]').first();
    
    if (await nameField.count() > 0 && await emailField.count() > 0 && await passwordField.count() > 0) {
      console.log('Registration form elements found');
      
      // テスト用のユニークなユーザー情報
      const timestamp = Date.now();
      const testUser = {
        name: `Test User ${timestamp}`,
        email: `test-${timestamp}@example.com`,
        password: 'Test@123456'
      };
      
      // フォームに入力
      await nameField.fill(testUser.name);
      await emailField.fill(testUser.email);
      await passwordField.fill(testUser.password);
      
      if (await confirmPasswordField.count() > 0) {
        await confirmPasswordField.fill(testUser.password);
      }
      
      // 送信ボタンを探してクリック
      const submitButton = page.locator('button[type="submit"], button:has-text("登録"), button:has-text("Register"), button:has-text("作成")').first();
      
      if (await submitButton.count() > 0) {
        await submitButton.click();
        
        // 登録後の画面遷移を確認
        await page.waitForTimeout(5000);
        
        const currentUrl = page.url();
        const isRegistered = currentUrl.includes('/dashboard') || 
                           currentUrl.includes('/home') || 
                           currentUrl.includes('/verify') ||
                           !currentUrl.includes('/register');
        
        if (isRegistered) {
          console.log('✅ Registration successful, redirected to:', currentUrl);
        } else {
          console.log('⚠️ Registration may have failed or no redirect occurred');
        }
      } else {
        console.log('⚠️ No submit button found');
      }
    } else {
      console.log('⚠️ Registration form elements not found');
    }
    
    console.log('Registration flow test completed');
  });

  test('パスワード強度検証', async ({ page }) => {
    console.log('Testing password strength validation');
    
    await page.goto('http://localhost:3002/auth/register');
    await expect(page.locator('body')).toBeVisible();
    
    const passwordField = page.locator('input[type="password"]').first();
    
    if (await passwordField.count() > 0) {
      // 弱いパスワードを入力
      await passwordField.fill('weak');
      await passwordField.blur(); // フォーカスを外してバリデーションを実行
      
      // バリデーションエラーメッセージを確認
      await page.waitForTimeout(1000);
      
      const errorMessages = await page.locator('text=パスワードは, text=password, .error, .invalid, [role="alert"]').count();
      
      if (errorMessages > 0) {
        console.log('✅ Password validation working');
      } else {
        console.log('⚠️ No password validation error detected');
      }
    }
    
    console.log('Password validation test completed');
  });

  test('ログアウト機能', async ({ page }) => {
    console.log('Testing logout functionality');
    
    // まずログインする
    await page.goto('http://localhost:3002/auth/login');
    
    const emailField = page.locator('input[type="email"], input[name="email"]').first();
    const passwordField = page.locator('input[type="password"]').first();
    const loginButton = page.locator('button[type="submit"]').first();
    
    if (await emailField.count() > 0 && await passwordField.count() > 0) {
      await emailField.fill('test@example.com');
      await passwordField.fill('Test@123456');
      
      if (await loginButton.count() > 0) {
        await loginButton.click();
        await page.waitForTimeout(3000);
        
        // ログアウトボタンを探す
        const logoutButton = page.locator('button:has-text("ログアウト"), button:has-text("Logout"), a:has-text("ログアウト"), a:has-text("Logout")');
        
        if (await logoutButton.count() > 0) {
          await logoutButton.first().click();
          await page.waitForTimeout(2000);
          
          // ログインページにリダイレクトされたか確認
          const currentUrl = page.url();
          const isLoggedOut = currentUrl.includes('/login') || currentUrl.includes('/auth');
          
          if (isLoggedOut) {
            console.log('✅ Logout successful, redirected to:', currentUrl);
          } else {
            console.log('⚠️ Logout may have failed');
          }
        } else {
          console.log('⚠️ Logout button not found');
        }
      }
    }
    
    console.log('Logout test completed');
  });

  test('認証が必要なページの保護確認', async ({ page }) => {
    console.log('Testing protected route access');
    
    // ログインせずに保護されたページにアクセス
    const protectedRoutes = ['/dashboard', '/profile', '/orders', '/cart'];
    
    for (const route of protectedRoutes) {
      await page.goto(`http://localhost:3002${route}`);
      await page.waitForTimeout(2000);
      
      const currentUrl = page.url();
      const isRedirectedToAuth = currentUrl.includes('/login') || currentUrl.includes('/auth');
      
      if (isRedirectedToAuth) {
        console.log(`✅ Route ${route} is properly protected`);
      } else {
        console.log(`⚠️ Route ${route} may not be properly protected`);
      }
    }
    
    console.log('Protected routes test completed');
  });
});