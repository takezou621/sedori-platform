const { chromium } = require('playwright');

/**
 * Comprehensive CSS Styling Test for Sedori Platform
 * Tests TailwindCSS classes, responsive design, and role-specific styling
 */

async function testCSSStyleling() {
  const browser = await chromium.launch({ headless: false, slowMo: 1000 });
  const page = await browser.newPage();
  
  const results = {
    homepage: { passed: 0, failed: 0, issues: [] },
    adminLogin: { passed: 0, failed: 0, issues: [] },
    userLogin: { passed: 0, failed: 0, issues: [] },
    sellerLogin: { passed: 0, failed: 0, issues: [] },
    responsive: { passed: 0, failed: 0, issues: [] },
    overall: { status: 'PENDING', summary: '' }
  };

  console.log('🚀 Starting CSS Styling Test Suite for Sedori Platform\n');

  try {
    // Test 1: Homepage CSS Loading
    console.log('📋 Test 1: Homepage CSS Loading and Basic Styling');
    await page.goto('http://localhost:3005');
    await page.waitForLoadState('networkidle');

    // Check if TailwindCSS is loaded by testing key elements
    const heroTitle = await page.locator('h1').first();
    const heroTitleClasses = await heroTitle.getAttribute('class');
    
    if (heroTitleClasses && heroTitleClasses.includes('text-4xl')) {
      console.log('✅ TailwindCSS classes are loading correctly');
      results.homepage.passed++;
    } else {
      console.log('❌ TailwindCSS classes not found on hero title');
      results.homepage.failed++;
      results.homepage.issues.push('TailwindCSS classes not applied to hero title');
    }

    // Test gradient background
    const heroSection = await page.locator('.bg-gradient-to-b').first();
    if (await heroSection.count() > 0) {
      console.log('✅ Gradient background classes working');
      results.homepage.passed++;
    } else {
      console.log('❌ Gradient background not found');
      results.homepage.failed++;
      results.homepage.issues.push('Gradient background classes not working');
    }

    // Test button styling
    const buttons = await page.locator('button, a[role="button"]');
    const buttonCount = await buttons.count();
    if (buttonCount > 0) {
      const firstButton = buttons.first();
      const buttonClasses = await firstButton.getAttribute('class');
      if (buttonClasses && (buttonClasses.includes('btn-') || buttonClasses.includes('bg-'))) {
        console.log('✅ Button styling classes working');
        results.homepage.passed++;
      } else {
        console.log('❌ Button styling classes not found');
        results.homepage.failed++;
        results.homepage.issues.push('Button styling classes not working');
      }
    }

    // Check for dev-login panel (should be visible in development)
    const devPanel = await page.locator('[data-testid="dev-login-panel"]');
    if (await devPanel.count() > 0) {
      console.log('✅ Dev-login panel found');
      results.homepage.passed++;
      
      // Show the dev panel
      const showDevButton = await page.locator('[data-testid="show-dev-panel"]');
      if (await showDevButton.count() > 0) {
        await showDevButton.click();
        await page.waitForTimeout(1000);
        console.log('✅ Dev panel can be shown');
        results.homepage.passed++;
      }
    } else {
      console.log('❌ Dev-login panel not found');
      results.homepage.failed++;
      results.homepage.issues.push('Dev-login panel not visible');
    }

    console.log('📋 Homepage Test Complete\n');

    // Test 2: Dev-login functionality with different roles
    console.log('📋 Test 2: Dev-login Functionality Testing');

    // Test cases for different user roles with the actual dev account emails
    const testAccounts = [
      { email: 'devadmin@example.com', password: 'DevAdmin123!', role: 'admin', name: 'Admin User' },
      { email: 'devseller@example.com', password: 'DevSeller123!', role: 'seller', name: 'Seller User' },
      { email: 'devtest1@example.com', password: 'DevTest123!', role: 'user', name: 'Regular User' }
    ];

    for (const account of testAccounts) {
      console.log(`🔐 Testing ${account.role} login: ${account.email}`);
      
      try {
        await page.goto('http://localhost:3005');
        await page.waitForLoadState('networkidle');

        // Show dev panel if not already visible
        const showDevButton = await page.locator('[data-testid="show-dev-panel"]');
        if (await showDevButton.count() > 0) {
          await showDevButton.click();
          await page.waitForTimeout(500);
        }

        // Find and click the appropriate dev login button
        const devButtons = await page.locator('[data-testid^="dev-login-"]');
        const devButtonCount = await devButtons.count();
        
        if (devButtonCount > 0) {
          // Click the first available dev login button (they auto-create accounts)
          await devButtons.first().click();
          
          // Wait for navigation to dashboard
          await page.waitForURL('**/dashboard', { timeout: 10000 });
          console.log(`✅ ${account.role} dev-login successful - redirected to dashboard`);
          
          // Test dashboard styling
          await page.waitForLoadState('networkidle');
          
          // Check for user welcome message
          const welcomeText = await page.locator('text=Welcome back').first();
          if (await welcomeText.count() > 0) {
            console.log(`✅ Dashboard welcome message displayed`);
            results[account.role === 'admin' ? 'adminLogin' : account.role === 'seller' ? 'sellerLogin' : 'userLogin'].passed++;
          } else {
            console.log(`❌ Dashboard welcome message not found`);
            results[account.role === 'admin' ? 'adminLogin' : account.role === 'seller' ? 'sellerLogin' : 'userLogin'].failed++;
            results[account.role === 'admin' ? 'adminLogin' : account.role === 'seller' ? 'sellerLogin' : 'userLogin'].issues.push('Welcome message not displayed');
          }

          // Check for styled cards
          const cards = await page.locator('.card, [class*="card"]');
          const cardCount = await cards.count();
          if (cardCount > 0) {
            console.log(`✅ Dashboard cards found and styled (${cardCount} cards)`);
            results[account.role === 'admin' ? 'adminLogin' : account.role === 'seller' ? 'sellerLogin' : 'userLogin'].passed++;
          } else {
            console.log(`❌ Dashboard cards not found or not styled`);
            results[account.role === 'admin' ? 'adminLogin' : account.role === 'seller' ? 'sellerLogin' : 'userLogin'].failed++;
            results[account.role === 'admin' ? 'adminLogin' : account.role === 'seller' ? 'sellerLogin' : 'userLogin'].issues.push('Dashboard cards not found');
          }

          // Test admin-specific features if admin user
          if (account.role === 'admin') {
            await page.goto('http://localhost:3005/admin');
            await page.waitForLoadState('networkidle');
            
            const adminTitle = await page.locator('text=Admin Dashboard').first();
            if (await adminTitle.count() > 0) {
              console.log(`✅ Admin dashboard accessible and titled correctly`);
              results.adminLogin.passed++;
            } else {
              console.log(`❌ Admin dashboard not accessible or title missing`);
              results.adminLogin.failed++;
              results.adminLogin.issues.push('Admin dashboard not accessible');
            }

            // Check admin stats cards
            const statsCards = await page.locator('.grid .card, [class*="grid"] [class*="card"]');
            const statsCardCount = await statsCards.count();
            if (statsCardCount >= 4) {
              console.log(`✅ Admin stats cards displayed (${statsCardCount} cards)`);
              results.adminLogin.passed++;
            } else {
              console.log(`❌ Admin stats cards missing (found ${statsCardCount}, expected 4+)`);
              results.adminLogin.failed++;
              results.adminLogin.issues.push(`Insufficient admin stats cards (${statsCardCount}/4+)`);
            }
          }

          // Logout for next test
          await page.goto('http://localhost:3005/api/auth/logout');
          await page.waitForTimeout(1000);

        } else {
          console.log(`❌ No dev-login buttons found`);
          results[account.role === 'admin' ? 'adminLogin' : account.role === 'seller' ? 'sellerLogin' : 'userLogin'].failed++;
          results[account.role === 'admin' ? 'adminLogin' : account.role === 'seller' ? 'sellerLogin' : 'userLogin'].issues.push('Dev-login buttons not found');
        }

      } catch (error) {
        console.log(`❌ Error testing ${account.role} login: ${error.message}`);
        results[account.role === 'admin' ? 'adminLogin' : account.role === 'seller' ? 'sellerLogin' : 'userLogin'].failed++;
        results[account.role === 'admin' ? 'adminLogin' : account.role === 'seller' ? 'sellerLogin' : 'userLogin'].issues.push(`Login error: ${error.message}`);
      }
    }

    console.log('📋 Dev-login Test Complete\n');

    // Test 3: Responsive Design
    console.log('📋 Test 3: Responsive Design Testing');

    const viewports = [
      { width: 1920, height: 1080, name: 'Desktop' },
      { width: 1024, height: 768, name: 'Tablet' },
      { width: 375, height: 667, name: 'Mobile' }
    ];

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('http://localhost:3005');
      await page.waitForLoadState('networkidle');

      console.log(`📱 Testing ${viewport.name} (${viewport.width}x${viewport.height})`);

      // Check if layout adapts properly
      const gridElements = await page.locator('.grid');
      const gridCount = await gridElements.count();
      
      if (gridCount > 0) {
        console.log(`✅ Grid layouts found on ${viewport.name}`);
        results.responsive.passed++;
      } else {
        console.log(`❌ No grid layouts found on ${viewport.name}`);
        results.responsive.failed++;
        results.responsive.issues.push(`No responsive grids on ${viewport.name}`);
      }

      // Check responsive text classes
      const responsiveText = await page.locator('[class*="sm:"], [class*="md:"], [class*="lg:"]');
      const responsiveTextCount = await responsiveText.count();
      
      if (responsiveTextCount > 0) {
        console.log(`✅ Responsive text classes found on ${viewport.name} (${responsiveTextCount} elements)`);
        results.responsive.passed++;
      } else {
        console.log(`❌ No responsive text classes found on ${viewport.name}`);
        results.responsive.failed++;
        results.responsive.issues.push(`No responsive text classes on ${viewport.name}`);
      }
    }

    console.log('📋 Responsive Design Test Complete\n');

    // Test 4: Color Scheme and Theme Variables
    console.log('📋 Test 4: Color Scheme and Theme Variables');

    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('http://localhost:3005');
    await page.waitForLoadState('networkidle');

    // Test CSS custom properties
    const rootStyles = await page.evaluate(() => {
      const rootEl = document.documentElement;
      const computedStyles = getComputedStyle(rootEl);
      return {
        background: computedStyles.getPropertyValue('--background'),
        foreground: computedStyles.getPropertyValue('--foreground'),
        primary: computedStyles.getPropertyValue('--primary')
      };
    });

    if (rootStyles.background && rootStyles.foreground && rootStyles.primary) {
      console.log('✅ CSS custom properties (theme variables) are defined');
      results.homepage.passed++;
    } else {
      console.log('❌ CSS custom properties not found or incomplete');
      results.homepage.failed++;
      results.homepage.issues.push('Theme variables not properly defined');
    }

    // Test primary color usage
    const primaryElements = await page.locator('[class*="primary"], [class*="blue"]');
    const primaryCount = await primaryElements.count();
    
    if (primaryCount > 0) {
      console.log(`✅ Primary color classes in use (${primaryCount} elements)`);
      results.homepage.passed++;
    } else {
      console.log('❌ Primary color classes not found');
      results.homepage.failed++;
      results.homepage.issues.push('Primary color classes not used');
    }

    console.log('📋 Color Scheme Test Complete\n');

  } catch (error) {
    console.error('❌ Test suite error:', error.message);
  }

  await browser.close();

  // Generate final report
  console.log('📊 CSS Styling Test Results Summary');
  console.log('=====================================\n');

  const categories = ['homepage', 'adminLogin', 'userLogin', 'sellerLogin', 'responsive'];
  let totalPassed = 0;
  let totalFailed = 0;
  let totalIssues = [];

  categories.forEach(category => {
    const result = results[category];
    totalPassed += result.passed;
    totalFailed += result.failed;
    totalIssues = totalIssues.concat(result.issues);
    
    const status = result.failed === 0 ? '✅ PASSED' : result.passed > result.failed ? '⚠️ PARTIAL' : '❌ FAILED';
    console.log(`${category.toUpperCase()}: ${status}`);
    console.log(`  Passed: ${result.passed} | Failed: ${result.failed}`);
    
    if (result.issues.length > 0) {
      console.log(`  Issues:`);
      result.issues.forEach(issue => console.log(`    - ${issue}`));
    }
    console.log('');
  });

  // Overall assessment
  const overallStatus = totalFailed === 0 ? '✅ ALL TESTS PASSED' : 
                       totalPassed > totalFailed ? '⚠️ MOSTLY WORKING' : '❌ SIGNIFICANT ISSUES';
  
  results.overall.status = overallStatus;
  results.overall.summary = `Total: ${totalPassed} passed, ${totalFailed} failed`;

  console.log('OVERALL RESULT:', overallStatus);
  console.log(`Total Tests: ${totalPassed + totalFailed}`);
  console.log(`Passed: ${totalPassed}`);
  console.log(`Failed: ${totalFailed}`);
  
  if (totalIssues.length > 0) {
    console.log('\n🔧 REMAINING ISSUES TO ADDRESS:');
    totalIssues.forEach((issue, index) => {
      console.log(`${index + 1}. ${issue}`);
    });
  } else {
    console.log('\n🎉 NO STYLING ISSUES FOUND!');
  }

  console.log('\n📋 Test completed. Check the visual browser output for detailed styling verification.');
  
  return results;
}

// Run the test
testCSSStyleling().catch(console.error);