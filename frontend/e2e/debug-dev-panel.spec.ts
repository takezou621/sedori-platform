import { test } from '@playwright/test';

test('debug dev panel', async ({ page }) => {
  // Listen for console logs
  page.on('console', msg => console.log('Browser console:', msg.text()));
  
  await page.goto('http://localhost:3005');
  
  // Wait for page to fully load
  await page.waitForTimeout(2000);
  
  console.log('Page loaded');
  
  // Take a screenshot
  await page.screenshot({ path: 'debug-homepage.png', fullPage: true });
  
  // Skip NODE_ENV check as it's not available in browser context
  console.log('Checking for dev panel...');
  
  // Check if dev panel button exists
  const showDevButton = page.locator('[data-testid="show-dev-panel"]');
  const buttonExists = await showDevButton.count();
  console.log('Dev panel button count:', buttonExists);
  
  if (buttonExists > 0) {
    console.log('Dev panel button found, clicking...');
    await showDevButton.click();
    await page.waitForTimeout(2000);
    
    // Take another screenshot after clicking
    await page.screenshot({ path: 'debug-after-click.png', fullPage: true });
    
    // Check all data-testid elements
    const allTestIds = await page.locator('[data-testid]').evaluateAll(elements => 
      elements.map(el => el.getAttribute('data-testid'))
    );
    console.log('All test IDs on page:', allTestIds);
    
    // Check specifically for dev login buttons
    const devLoginButtons = await page.locator('[data-testid^="dev-login-"]').count();
    console.log('Dev login buttons found:', devLoginButtons);
    
    // Try to find each expected button individually
    const testUser1 = await page.locator('[data-testid="dev-login-test-user-1"]').count();
    const testAdmin = await page.locator('[data-testid="dev-login-test-admin"]').count();
    const testSeller = await page.locator('[data-testid="dev-login-test-seller"]').count();
    
    console.log('Individual button counts:');
    console.log('  - test-user-1:', testUser1);
    console.log('  - test-admin:', testAdmin);
    console.log('  - test-seller:', testSeller);
    
    // Get all visible text in the dev panel
    const panelText = await page.locator('[data-testid="dev-login-panel"]').textContent();
    console.log('Dev panel text:', panelText);
    
  } else {
    console.log('Dev panel button not found!');
    
    // Check all data-testid elements anyway
    const allTestIds = await page.locator('[data-testid]').evaluateAll(elements => 
      elements.map(el => el.getAttribute('data-testid'))
    );
    console.log('All test IDs on page:', allTestIds);
  }
});