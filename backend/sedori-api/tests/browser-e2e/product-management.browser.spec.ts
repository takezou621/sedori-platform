import { test, expect } from '@playwright/test';

test.describe('📦 Product Management - Browser E2E Tests', () => {
  const API_BASE = 'http://localhost:3000/api';
  
  let adminToken: string;
  let userToken: string;
  let testCategoryId: string;
  let testProductId: string;

  const adminUser = {
    email: 'admin.product@example.com',
    password: 'AdminProduct123!',
    name: 'Product Admin User'
  };

  const regularUser = {
    email: 'user.product@example.com', 
    password: 'UserProduct123!',
    name: 'Product Regular User'
  };

  const testCategory = {
    name: 'Browser Test Category',
    description: 'Category for browser testing',
    slug: 'browser-test-category'
  };

  const testProduct = {
    name: 'Browser Test Product',
    description: 'High-quality test product for browser E2E testing',
    sku: 'BROWSER-TEST-001',
    brand: 'TestBrand',
    model: 'TestModel-V1',
    wholesalePrice: 1000.00,
    retailPrice: 1500.00,
    marketPrice: 1800.00,
    currency: 'JPY',
    condition: 'new',
    status: 'active',
    supplier: 'Test Supplier Co.',
    supplierUrl: 'https://testsupplier.example.com',
    stockQuantity: 50,
    minOrderQuantity: 1,
    maxOrderQuantity: 10,
    weight: 2.5,
    weightUnit: 'kg',
    dimensions: '20x15x10cm',
    images: ['https://example.com/image1.jpg'],
    primaryImageUrl: 'https://example.com/primary.jpg',
    specifications: {
      color: 'Blue',
      material: 'Plastic',
      warranty: '1 year'
    },
    tags: ['electronics', 'test', 'browser'],
    metadata: {
      source: 'browser-test',
      importedAt: new Date().toISOString()
    }
  };

  test.beforeAll('Set up authentication tokens', async ({ request }) => {
    // Register and login admin user
    await request.post(`${API_BASE}/auth/register`, {
      data: { ...adminUser, role: 'admin' }
    });
    
    const adminLogin = await request.post(`${API_BASE}/auth/login`, {
      data: { email: adminUser.email, password: adminUser.password }
    });
    const adminResult = await adminLogin.json();
    adminToken = adminResult.access_token;

    // Register and login regular user
    await request.post(`${API_BASE}/auth/register`, {
      data: regularUser
    });
    
    const userLogin = await request.post(`${API_BASE}/auth/login`, {
      data: { email: regularUser.email, password: regularUser.password }
    });
    const userResult = await userLogin.json();
    userToken = userResult.access_token;
  });

  test('🎯 Category Management - Admin Only', async ({ request }) => {
    // Admin can create category
    const createCategoryResponse = await request.post(`${API_BASE}/categories`, {
      headers: { 'Authorization': `Bearer ${adminToken}` },
      data: testCategory
    });
    
    expect(createCategoryResponse.status()).toBe(201);
    const createdCategory = await createCategoryResponse.json();
    testCategoryId = createdCategory.id;
    expect(createdCategory.name).toBe(testCategory.name);

    // Regular user cannot create category
    const userCreateResponse = await request.post(`${API_BASE}/categories`, {
      headers: { 'Authorization': `Bearer ${userToken}` },
      data: {
        name: 'Unauthorized Category',
        description: 'This should fail',
        slug: 'unauthorized'
      }
    });
    expect(userCreateResponse.status()).toBe(403);

    // Both can read categories
    const getAllResponse = await request.get(`${API_BASE}/categories`);
    expect(getAllResponse.status()).toBe(200);
    const categories = await getAllResponse.json();
    expect(categories.length).toBeGreaterThan(0);
  });

  test('🎯 Product Creation - Admin Only', async ({ request }) => {
    const productData = { ...testProduct, categoryId: testCategoryId };
    
    // Admin can create product
    const createProductResponse = await request.post(`${API_BASE}/products`, {
      headers: { 'Authorization': `Bearer ${adminToken}` },
      data: productData
    });
    
    expect(createProductResponse.status()).toBe(201);
    const createdProduct = await createProductResponse.json();
    testProductId = createdProduct.id;
    expect(createdProduct.name).toBe(testProduct.name);
    expect(createdProduct.sku).toBe(testProduct.sku);
    expect(createdProduct.wholesalePrice).toBe(testProduct.wholesalePrice);

    // Regular user cannot create product
    const userCreateResponse = await request.post(`${API_BASE}/products`, {
      headers: { 'Authorization': `Bearer ${userToken}` },
      data: {
        ...productData,
        name: 'Unauthorized Product',
        sku: 'UNAUTHORIZED-001'
      }
    });
    expect(userCreateResponse.status()).toBe(403);
  });

  test('🎯 Product Retrieval - Public Access', async ({ request }) => {
    // Get all products (public access)
    const getAllResponse = await request.get(`${API_BASE}/products`);
    expect(getAllResponse.status()).toBe(200);
    const products = await getAllResponse.json();
    expect(products.length).toBeGreaterThan(0);

    // Get specific product by ID
    const getByIdResponse = await request.get(`${API_BASE}/products/${testProductId}`);
    expect(getByIdResponse.status()).toBe(200);
    const product = await getByIdResponse.json();
    expect(product.name).toBe(testProduct.name);
    expect(product.sku).toBe(testProduct.sku);
  });

  test('🎯 Product Search and Filtering', async ({ request }) => {
    // Search by name
    const searchResponse = await request.get(`${API_BASE}/products?search=Browser Test`);
    expect(searchResponse.status()).toBe(200);
    const searchResults = await searchResponse.json();
    expect(searchResults.length).toBeGreaterThan(0);
    expect(searchResults[0].name).toContain('Browser Test');

    // Filter by category
    const categoryFilterResponse = await request.get(`${API_BASE}/products?categoryId=${testCategoryId}`);
    expect(categoryFilterResponse.status()).toBe(200);
    const categoryResults = await categoryFilterResponse.json();
    expect(categoryResults.length).toBeGreaterThan(0);

    // Filter by status
    const statusFilterResponse = await request.get(`${API_BASE}/products?status=active`);
    expect(statusFilterResponse.status()).toBe(200);
    const statusResults = await statusFilterResponse.json();
    expect(statusResults.length).toBeGreaterThan(0);
  });

  test('🎯 Product Update - Admin Only', async ({ request }) => {
    const updateData = {
      name: 'Updated Browser Test Product',
      description: 'Updated description for browser testing',
      retailPrice: 1600.00,
      stockQuantity: 45
    };

    // Admin can update product
    const updateResponse = await request.patch(`${API_BASE}/products/${testProductId}`, {
      headers: { 'Authorization': `Bearer ${adminToken}` },
      data: updateData
    });
    
    expect(updateResponse.status()).toBe(200);
    const updatedProduct = await updateResponse.json();
    expect(updatedProduct.name).toBe(updateData.name);
    expect(updatedProduct.retailPrice).toBe(updateData.retailPrice);
    expect(updatedProduct.stockQuantity).toBe(updateData.stockQuantity);

    // Regular user cannot update product
    const userUpdateResponse = await request.patch(`${API_BASE}/products/${testProductId}`, {
      headers: { 'Authorization': `Bearer ${userToken}` },
      data: { name: 'Unauthorized Update' }
    });
    expect(userUpdateResponse.status()).toBe(403);
  });

  test('🎯 Product Market Data and Analytics', async ({ request }) => {
    const marketData = {
      amazonPrice: 1750.00,
      rakutenPrice: 1680.00,
      yahooPrice: 1720.00,
      mercariPrice: 1450.00,
      averageSellingPrice: 1650.00,
      competitorCount: 8,
      demandScore: 7.5,
      trendScore: 8.2,
      lastScrapedAt: new Date().toISOString()
    };

    const profitabilityData = {
      estimatedProfit: 650.00,
      profitMargin: 0.65,
      roi: 0.65,
      breakEvenDays: 30,
      riskLevel: 'medium',
      calculatedAt: new Date().toISOString()
    };

    // Update product with market and profitability data
    const marketUpdateResponse = await request.patch(`${API_BASE}/products/${testProductId}`, {
      headers: { 'Authorization': `Bearer ${adminToken}` },
      data: {
        marketData,
        profitabilityData
      }
    });

    expect(marketUpdateResponse.status()).toBe(200);
    const updatedProduct = await marketUpdateResponse.json();
    expect(updatedProduct.marketData.amazonPrice).toBe(marketData.amazonPrice);
    expect(updatedProduct.profitabilityData.estimatedProfit).toBe(profitabilityData.estimatedProfit);
  });

  test('🎯 Product Inventory Management', async ({ request }) => {
    // Update stock quantity
    const stockUpdateResponse = await request.patch(`${API_BASE}/products/${testProductId}`, {
      headers: { 'Authorization': `Bearer ${adminToken}` },
      data: {
        stockQuantity: 25,
        status: 'active'
      }
    });

    expect(stockUpdateResponse.status()).toBe(200);

    // Set product as out of stock
    const outOfStockResponse = await request.patch(`${API_BASE}/products/${testProductId}`, {
      headers: { 'Authorization': `Bearer ${adminToken}` },
      data: {
        stockQuantity: 0,
        status: 'out_of_stock'
      }
    });

    expect(outOfStockResponse.status()).toBe(200);
    const outOfStockProduct = await outOfStockResponse.json();
    expect(outOfStockProduct.status).toBe('out_of_stock');
    expect(outOfStockProduct.stockQuantity).toBe(0);
  });

  test('🎯 Product Validation and Error Handling', async ({ request }) => {
    // Test invalid product data
    const invalidProductResponse = await request.post(`${API_BASE}/products`, {
      headers: { 'Authorization': `Bearer ${adminToken}` },
      data: {
        name: '', // Empty name should fail
        wholesalePrice: -100 // Negative price should fail
      }
    });
    expect(invalidProductResponse.status()).toBe(400);

    // Test duplicate SKU
    const duplicateSkuResponse = await request.post(`${API_BASE}/products`, {
      headers: { 'Authorization': `Bearer ${adminToken}` },
      data: {
        ...testProduct,
        name: 'Different Product',
        sku: testProduct.sku, // Same SKU should fail
        categoryId: testCategoryId
      }
    });
    expect(duplicateSkuResponse.status()).toBe(409);

    // Test non-existent product update
    const nonExistentUpdateResponse = await request.patch(`${API_BASE}/products/non-existent-id`, {
      headers: { 'Authorization': `Bearer ${adminToken}` },
      data: { name: 'Updated Name' }
    });
    expect(nonExistentUpdateResponse.status()).toBe(404);
  });

  test('🎯 Product Performance Metrics', async ({ request }) => {
    // Simulate product views
    const viewPromises = Array(5).fill(null).map(() => 
      request.get(`${API_BASE}/products/${testProductId}`)
    );
    await Promise.all(viewPromises);

    // Check if view count increased
    const viewedProductResponse = await request.get(`${API_BASE}/products/${testProductId}`);
    const viewedProduct = await viewedProductResponse.json();
    expect(viewedProduct.viewCount).toBeGreaterThanOrEqual(5);
  });

  test('🎯 Product Deletion - Admin Only', async ({ request }) => {
    // Regular user cannot delete product
    const userDeleteResponse = await request.delete(`${API_BASE}/products/${testProductId}`, {
      headers: { 'Authorization': `Bearer ${userToken}` }
    });
    expect(userDeleteResponse.status()).toBe(403);

    // Admin can delete product
    const adminDeleteResponse = await request.delete(`${API_BASE}/products/${testProductId}`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    expect(adminDeleteResponse.status()).toBe(200);

    // Verify product is deleted
    const deletedProductResponse = await request.get(`${API_BASE}/products/${testProductId}`);
    expect(deletedProductResponse.status()).toBe(404);
  });

  test.afterAll('Clean up test data', async ({ request }) => {
    // Clean up category
    if (testCategoryId) {
      try {
        await request.delete(`${API_BASE}/categories/${testCategoryId}`, {
          headers: { 'Authorization': `Bearer ${adminToken}` }
        });
      } catch (error) {
        // Ignore cleanup errors
      }
    }

    // Clean up users
    try {
      await request.delete(`${API_BASE}/users/cleanup-test-users`);
    } catch (error) {
      // Ignore cleanup errors
    }
  });
});