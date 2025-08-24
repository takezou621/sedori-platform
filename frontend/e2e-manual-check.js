#!/usr/bin/env node

async function checkNewProductPage() {
  const response = await fetch('http://localhost:3005/api/dev-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'devseller@example.com',
      password: 'DevSeller123!'
    })
  });

  const loginData = await response.json();
  console.log('Login successful:', loginData.success);
  
  // Get the page content with authentication
  const pageResponse = await fetch('http://localhost:3005/products/new', {
    headers: {
      'Cookie': `auth_token=${loginData.accessToken}; user_data=${encodeURIComponent(JSON.stringify(loginData.user))}`
    }
  });
  
  const html = await pageResponse.text();
  
  // Check for specific elements
  console.log('Page contains cost-price-input:', html.includes('data-testid="cost-price-input"'));
  console.log('Page contains selling-price-input:', html.includes('data-testid="selling-price-input"'));
  console.log('Page contains profit-amount:', html.includes('data-testid="profit-amount"'));
  console.log('Page contains profit-margin:', html.includes('data-testid="profit-margin"'));
  
  // Check for form inputs
  console.log('Page contains cost input:', html.includes('name="cost-price"'));
  console.log('Page contains price input:', html.includes('name="selling-price"'));
  console.log('Page contains forms:', html.includes('<form'));
  console.log('Page contains inputs:', html.includes('<input'));
  
  // Check page length
  console.log('HTML length:', html.length);
  
  // Save to file for inspection
  require('fs').writeFileSync('/tmp/products-new.html', html);
  console.log('HTML saved to /tmp/products-new.html');
}

checkNewProductPage().catch(console.error);