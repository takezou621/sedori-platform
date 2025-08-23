import { test, expect } from '@playwright/test';

test.describe('🔍 Search & Analytics - Browser E2E Tests', () => {
  const API_BASE = 'http://localhost:3000/api';
  
  let adminToken: string;
  let userToken: string;
  let testProductIds: string[] = [];
  let testCategoryId: string;

  const adminUser = {
    email: 'search.admin@example.com',
    password: 'SearchAdmin123!',
    name: 'Search Admin User'
  };

  const regularUser = {
    email: 'search.user@example.com',
    password: 'SearchUser123!',
    name: 'Search Regular User'
  };

  const testCategory = {
    name: 'Electronics Search Test',
    description: 'Category for search testing',
    slug: 'electronics-search-test'
  };

  const testProducts = [
    {
      name: 'iPhone 15 Pro Max',
      description: 'Latest Apple smartphone with advanced camera system',
      sku: 'SEARCH-IPHONE-001',
      brand: 'Apple',
      model: 'iPhone 15 Pro Max',
      wholesalePrice: 80000.00,
      retailPrice: 120000.00,
      currency: 'JPY',
      condition: 'new',
      status: 'active',
      supplier: 'Apple Store',
      stockQuantity: 20,
      tags: ['smartphone', 'apple', 'electronics', 'premium'],
      specifications: {
        color: 'Natural Titanium',
        storage: '256GB',
        display: '6.7-inch Super Retina XDR'
      }
    },
    {
      name: 'Samsung Galaxy S24 Ultra',
      description: 'Flagship Samsung smartphone with S Pen',
      sku: 'SEARCH-GALAXY-001',
      brand: 'Samsung',
      model: 'Galaxy S24 Ultra',
      wholesalePrice: 75000.00,
      retailPrice: 110000.00,
      currency: 'JPY',
      condition: 'new',
      status: 'active',
      supplier: 'Samsung Electronics',
      stockQuantity: 15,
      tags: ['smartphone', 'samsung', 'electronics', 'android'],
      specifications: {
        color: 'Titanium Black',
        storage: '512GB',
        display: '6.8-inch Dynamic AMOLED 2X'
      }
    },
    {
      name: 'Nintendo Switch OLED',
      description: 'Gaming console with OLED display',
      sku: 'SEARCH-SWITCH-001',
      brand: 'Nintendo',
      model: 'Switch OLED',
      wholesalePrice: 25000.00,
      retailPrice: 37000.00,
      currency: 'JPY',
      condition: 'new',
      status: 'active',
      supplier: 'Nintendo Co., Ltd.',
      stockQuantity: 30,
      tags: ['gaming', 'console', 'nintendo', 'portable'],
      specifications: {
        color: 'White',
        storage: '64GB',
        display: '7-inch OLED'
      }
    }
  ];

  test.beforeAll('Set up test data', async ({ request }) => {
    // Setup admin user
    await request.post(`${API_BASE}/auth/register`, {
      data: { ...adminUser, role: 'admin' }
    });
    
    const adminLogin = await request.post(`${API_BASE}/auth/login`, {
      data: { email: adminUser.email, password: adminUser.password }
    });
    const adminResult = await adminLogin.json();
    adminToken = adminResult.access_token;

    // Setup regular user
    await request.post(`${API_BASE}/auth/register`, {
      data: regularUser
    });
    
    const userLogin = await request.post(`${API_BASE}/auth/login`, {
      data: { email: regularUser.email, password: regularUser.password }
    });
    const userResult = await userLogin.json();
    userToken = userResult.access_token;

    // Create test category
    const categoryResponse = await request.post(`${API_BASE}/categories`, {
      headers: { 'Authorization': `Bearer ${adminToken}` },
      data: testCategory
    });
    const category = await categoryResponse.json();
    testCategoryId = category.id;

    // Create test products
    for (const productData of testProducts) {
      const productResponse = await request.post(`${API_BASE}/products`, {
        headers: { 'Authorization': `Bearer ${adminToken}` },
        data: { ...productData, categoryId: testCategoryId }
      });
      const product = await productResponse.json();
      testProductIds.push(product.id);
    }
  });

  test('🎯 Basic Search Functionality', async ({ request }) => {
    // Search by product name
    const nameSearchResponse = await request.get(`${API_BASE}/search?q=iPhone`);
    expect(nameSearchResponse.status()).toBe(200);
    
    const nameResults = await nameSearchResponse.json();
    expect(nameResults.products).toBeDefined();
    expect(nameResults.products.length).toBeGreaterThan(0);
    expect(nameResults.products[0].name).toContain('iPhone');

    // Search by brand
    const brandSearchResponse = await request.get(`${API_BASE}/search?q=Samsung`);
    expect(brandSearchResponse.status()).toBe(200);
    
    const brandResults = await brandSearchResponse.json();
    expect(brandResults.products.length).toBeGreaterThan(0);
    expect(brandResults.products[0].brand).toBe('Samsung');

    // Search by description
    const descSearchResponse = await request.get(`${API_BASE}/search?q=gaming%20console`);
    expect(descSearchResponse.status()).toBe(200);
    
    const descResults = await descSearchResponse.json();
    expect(descResults.products.length).toBeGreaterThan(0);
  });

  test('🎯 Advanced Search Filters', async ({ request }) => {
    // Filter by category
    const categorySearchResponse = await request.get(`${API_BASE}/search?categoryId=${testCategoryId}`);
    expect(categorySearchResponse.status()).toBe(200);
    
    const categoryResults = await categorySearchResponse.json();
    expect(categoryResults.products.length).toBe(3); // All our test products

    // Filter by price range
    const priceSearchResponse = await request.get(`${API_BASE}/search?minPrice=30000&maxPrice=50000`);
    expect(priceSearchResponse.status()).toBe(200);
    
    const priceResults = await priceSearchResponse.json();
    expect(priceResults.products.length).toBeGreaterThan(0);
    priceResults.products.forEach(product => {
      expect(product.retailPrice).toBeGreaterThanOrEqual(30000);
      expect(product.retailPrice).toBeLessThanOrEqual(50000);
    });

    // Filter by brand
    const brandFilterResponse = await request.get(`${API_BASE}/search?brand=Apple`);
    expect(brandFilterResponse.status()).toBe(200);
    
    const brandFilterResults = await brandFilterResponse.json();
    expect(brandFilterResults.products.length).toBeGreaterThan(0);
    brandFilterResults.products.forEach(product => {
      expect(product.brand).toBe('Apple');
    });

    // Filter by condition
    const conditionSearchResponse = await request.get(`${API_BASE}/search?condition=new`);
    expect(conditionSearchResponse.status()).toBe(200);
    
    const conditionResults = await conditionSearchResponse.json();
    expect(conditionResults.products.length).toBe(3); // All are new
  });

  test('🎯 Search Pagination and Sorting', async ({ request }) => {
    // Test pagination
    const page1Response = await request.get(`${API_BASE}/search?page=1&limit=2`);
    expect(page1Response.status()).toBe(200);
    
    const page1Results = await page1Response.json();
    expect(page1Results.products.length).toBe(2);
    expect(page1Results.pagination.currentPage).toBe(1);
    expect(page1Results.pagination.totalPages).toBeGreaterThan(1);

    // Test sorting by price (ascending)
    const priceSortResponse = await request.get(`${API_BASE}/search?sortBy=price&sortOrder=asc`);
    expect(priceSortResponse.status()).toBe(200);
    
    const priceSortResults = await priceSortResponse.json();
    expect(priceSortResults.products.length).toBeGreaterThan(1);
    
    // Verify ascending price order
    for (let i = 1; i < priceSortResults.products.length; i++) {
      expect(priceSortResults.products[i].retailPrice).toBeGreaterThanOrEqual(
        priceSortResults.products[i - 1].retailPrice
      );
    }

    // Test sorting by name
    const nameSortResponse = await request.get(`${API_BASE}/search?sortBy=name&sortOrder=desc`);
    expect(nameSortResponse.status()).toBe(200);
    
    const nameSortResults = await nameSortResponse.json();
    expect(nameSortResults.products.length).toBeGreaterThan(1);
  });

  test('🎯 Search Analytics Tracking', async ({ request }) => {
    const searchQueries = [
      'iPhone 15',
      'Samsung Galaxy',
      'Nintendo Switch',
      'smartphone',
      'gaming console'
    ];

    // Perform multiple searches to generate analytics data
    for (const query of searchQueries) {
      await request.get(`${API_BASE}/search?q=${encodeURIComponent(query)}`);
      // Add small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Get search analytics (admin only)
    const analyticsResponse = await request.get(`${API_BASE}/analytics/search-trends`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });

    expect(analyticsResponse.status()).toBe(200);
    const analyticsData = await analyticsResponse.json();
    expect(analyticsData.topSearchQueries).toBeDefined();
    expect(analyticsData.totalSearches).toBeGreaterThan(0);
  });

  test('🎯 Product View Tracking', async ({ request }) => {
    // View products to generate analytics data
    for (const productId of testProductIds) {
      await request.get(`${API_BASE}/products/${productId}`);
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    // Get product view analytics
    const viewAnalyticsResponse = await request.get(`${API_BASE}/analytics/product-views`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });

    expect(viewAnalyticsResponse.status()).toBe(200);
    const viewData = await viewAnalyticsResponse.json();
    expect(viewData.topViewedProducts).toBeDefined();
    expect(viewData.totalViews).toBeGreaterThan(0);
  });

  test('🎯 Real-time Analytics Dashboard', async ({ request }) => {
    // Get real-time metrics (admin only)
    const dashboardResponse = await request.get(`${API_BASE}/analytics/dashboard`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });

    expect(dashboardResponse.status()).toBe(200);
    const dashboardData = await dashboardResponse.json();
    
    // Check for expected dashboard components
    expect(dashboardData.metrics).toBeDefined();
    expect(dashboardData.alerts).toBeDefined();
    expect(dashboardData.suggestions).toBeDefined();
    
    // Verify metrics structure
    expect(dashboardData.metrics.totalProducts).toBeGreaterThan(0);
    expect(dashboardData.metrics.totalSearches).toBeGreaterThan(0);
    expect(dashboardData.metrics.totalViews).toBeGreaterThan(0);

    // Regular user should not access admin dashboard
    const userDashboardResponse = await request.get(`${API_BASE}/analytics/dashboard`, {
      headers: { 'Authorization': `Bearer ${userToken}` }
    });
    expect(userDashboardResponse.status()).toBe(403);
  });

  test('🎯 Search Suggestions and Autocomplete', async ({ request }) => {
    // Get search suggestions
    const suggestionsResponse = await request.get(`${API_BASE}/search/suggestions?q=iph`);
    expect(suggestionsResponse.status()).toBe(200);
    
    const suggestions = await suggestionsResponse.json();
    expect(suggestions.suggestions).toBeDefined();
    expect(suggestions.suggestions.length).toBeGreaterThan(0);
    
    // Suggestions should be relevant to the query
    suggestions.suggestions.forEach(suggestion => {
      expect(suggestion.toLowerCase()).toContain('iph');
    });
  });

  test('🎯 Search Performance and Indexing', async ({ request }) => {
    // Test search performance with complex query
    const startTime = Date.now();
    const complexSearchResponse = await request.get(
      `${API_BASE}/search?q=smartphone&brand=Apple&minPrice=50000&maxPrice=150000&sortBy=price&sortOrder=desc`
    );
    const endTime = Date.now();
    
    expect(complexSearchResponse.status()).toBe(200);
    const searchTime = endTime - startTime;
    
    // Search should complete within reasonable time (2 seconds)
    expect(searchTime).toBeLessThan(2000);
    
    const complexResults = await complexSearchResponse.json();
    expect(complexResults.products).toBeDefined();
  });

  test('🎯 Event Tracking for User Behavior', async ({ request }) => {
    const eventData = {
      eventType: 'search_performed',
      productId: testProductIds[0],
      query: 'iPhone 15 Pro',
      category: 'smartphones',
      metadata: {
        searchDuration: 1500,
        resultsCount: 1,
        userAgent: 'Playwright Test Browser'
      }
    };

    // Track search event
    const trackEventResponse = await request.post(`${API_BASE}/analytics/track`, {
      headers: { 'Authorization': `Bearer ${userToken}` },
      data: eventData
    });

    expect(trackEventResponse.status()).toBe(201);
    const trackResult = await trackEventResponse.json();
    expect(trackResult.eventId).toBeDefined();

    // Track multiple user interactions
    const interactions = [
      { eventType: 'product_viewed', productId: testProductIds[0] },
      { eventType: 'product_added_to_cart', productId: testProductIds[0] },
      { eventType: 'search_performed', query: 'gaming console' }
    ];

    for (const interaction of interactions) {
      await request.post(`${API_BASE}/analytics/track`, {
        headers: { 'Authorization': `Bearer ${userToken}` },
        data: interaction
      });
    }

    // Get user behavior analytics
    const behaviorResponse = await request.get(`${API_BASE}/analytics/user-behavior`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });

    expect(behaviorResponse.status()).toBe(200);
    const behaviorData = await behaviorResponse.json();
    expect(behaviorData.totalEvents).toBeGreaterThan(0);
  });

  test('🎯 Search Query Optimization', async ({ request }) => {
    // Test fuzzy search (typos)
    const typoSearchResponse = await request.get(`${API_BASE}/search?q=ipone`); // "iphone" with typo
    expect(typoSearchResponse.status()).toBe(200);
    
    const typoResults = await typoSearchResponse.json();
    // Should still return iPhone results despite typo
    expect(typoResults.products.length).toBeGreaterThan(0);

    // Test partial matches
    const partialSearchResponse = await request.get(`${API_BASE}/search?q=Ninten`);
    expect(partialSearchResponse.status()).toBe(200);
    
    const partialResults = await partialSearchResponse.json();
    expect(partialResults.products.length).toBeGreaterThan(0);
    expect(partialResults.products[0].name).toContain('Nintendo');
  });

  test('🎯 Analytics Data Export and Reporting', async ({ request }) => {
    const exportParams = {
      startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 24 hours ago
      endDate: new Date().toISOString(),
      format: 'json'
    };

    // Export search analytics
    const exportResponse = await request.get(
      `${API_BASE}/analytics/export?startDate=${exportParams.startDate}&endDate=${exportParams.endDate}&format=${exportParams.format}`,
      {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      }
    );

    expect(exportResponse.status()).toBe(200);
    const exportData = await exportResponse.json();
    
    expect(exportData.searchAnalytics).toBeDefined();
    expect(exportData.productViews).toBeDefined();
    expect(exportData.userBehavior).toBeDefined();
    expect(exportData.exportMetadata).toBeDefined();
    expect(exportData.exportMetadata.generatedAt).toBeDefined();
  });

  test.afterAll('Clean up test data', async ({ request }) => {
    // Clean up test products
    for (const productId of testProductIds) {
      try {
        await request.delete(`${API_BASE}/products/${productId}`, {
          headers: { 'Authorization': `Bearer ${adminToken}` }
        });
      } catch (error) {
        // Ignore cleanup errors
      }
    }

    // Clean up category
    try {
      await request.delete(`${API_BASE}/categories/${testCategoryId}`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
    } catch (error) {
      // Ignore cleanup errors
    }

    // Clean up users
    try {
      await request.delete(`${API_BASE}/users/cleanup-test-users`);
    } catch (error) {
      // Ignore cleanup errors
    }
  });
});