import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { E2ETestHelper } from './helpers/test-helper';

describe('Product Management Flow E2E Tests', () => {
  let app: INestApplication;
  let helper: E2ETestHelper;
  let httpServer: any;
  let testAdmin: any;
  let testUser: any;
  let testCategory: any;

  beforeAll(async () => {
    helper = new E2ETestHelper();
    app = await helper.setupTestApp();
    httpServer = helper.getHttpServer();
  });

  afterAll(async () => {
    await helper.teardownTestApp();
  });

  beforeEach(async () => {
    testAdmin = await helper.createTestAdmin();
    testUser = await helper.createTestUser();
    testCategory = await helper.createTestCategory(testAdmin);
  });

  afterEach(async () => {
    await helper.cleanupTestData();
  });

  describe('Category Management', () => {
    it('should create a new category', async () => {
      const categoryData = {
        name: 'Electronics',
        slug: 'electronics',
        description: 'Electronic products',
        isActive: true,
        sortOrder: 1,
      };

      const response = await request(httpServer)
        .post('/categories')
        .set('Authorization', `Bearer ${testAdmin.accessToken}`)
        .send(categoryData)
        .expect(201);

      expect(response.body.name).toBe(categoryData.name);
      expect(response.body.slug).toBe(categoryData.slug);
      expect(response.body.isActive).toBe(true);
    });

    it('should not allow duplicate category slugs', async () => {
      const categoryData = {
        name: 'Duplicate Category',
        slug: testCategory.slug, // Same slug as existing category
        description: 'This should fail',
      };

      await request(httpServer)
        .post('/categories')
        .set('Authorization', `Bearer ${testAdmin.accessToken}`)
        .send(categoryData)
        .expect(409); // Conflict
    });

    it('should get category hierarchy', async () => {
      // Create parent category
      const parentResponse = await request(httpServer)
        .post('/categories')
        .set('Authorization', `Bearer ${testAdmin.accessToken}`)
        .send({
          name: 'Parent Category',
          slug: 'parent-category',
          description: 'Parent category',
        })
        .expect(201);

      // Create child category
      await request(httpServer)
        .post('/categories')
        .set('Authorization', `Bearer ${testAdmin.accessToken}`)
        .send({
          name: 'Child Category',
          slug: 'child-category',
          description: 'Child category',
          parentId: parentResponse.body.id,
        })
        .expect(201);

      const hierarchyResponse = await request(httpServer)
        .get('/categories/hierarchy')
        .expect(200);

      expect(Array.isArray(hierarchyResponse.body)).toBe(true);
      expect(hierarchyResponse.body.length).toBeGreaterThan(0);
    });

    it('should update category', async () => {
      const updateData = {
        name: 'Updated Category Name',
        description: 'Updated description',
      };

      const response = await request(httpServer)
        .put(`/categories/${testCategory.id}`)
        .set('Authorization', `Bearer ${testAdmin.accessToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.name).toBe(updateData.name);
      expect(response.body.description).toBe(updateData.description);
    });

    it('should not allow non-admin to create categories', async () => {
      const categoryData = {
        name: 'Unauthorized Category',
        slug: 'unauthorized-category',
      };

      await request(httpServer)
        .post('/categories')
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send(categoryData)
        .expect(403);
    });
  });

  describe('Product Creation and Management', () => {
    it('should create a new product', async () => {
      const productData = {
        name: 'Test Product',
        description: 'A test product description',
        categoryId: testCategory.id,
        wholesalePrice: 1000,
        retailPrice: 1500,
        currency: 'JPY',
        condition: 'new',
        status: 'active',
        supplier: 'Test Supplier',
        stockQuantity: 50,
        brand: 'Test Brand',
        model: 'Model-123',
        tags: ['electronics', 'gadget'],
      };

      const response = await request(httpServer)
        .post('/products')
        .set('Authorization', `Bearer ${testAdmin.accessToken}`)
        .send(productData)
        .expect(201);

      expect(response.body.name).toBe(productData.name);
      expect(response.body.categoryId).toBe(productData.categoryId);
      expect(Number(response.body.wholesalePrice)).toBe(productData.wholesalePrice);
      expect(response.body.status).toBe(productData.status);
    });

    it('should validate required fields', async () => {
      const incompleteProductData = {
        name: 'Incomplete Product',
        // Missing required fields
      };

      await request(httpServer)
        .post('/products')
        .set('Authorization', `Bearer ${testAdmin.accessToken}`)
        .send(incompleteProductData)
        .expect(400);
    });

    it('should validate category existence', async () => {
      const productData = {
        name: 'Product with Invalid Category',
        categoryId: '123e4567-e89b-12d3-a456-426614174999', // Non-existent ID
        wholesalePrice: 1000,
        supplier: 'Test Supplier',
      };

      await request(httpServer)
        .post('/products')
        .set('Authorization', `Bearer ${testAdmin.accessToken}`)
        .send(productData)
        .expect(400);
    });

    it('should get products with filtering', async () => {
      // Create multiple products
      await helper.createTestProduct(testAdmin, testCategory, {
        name: 'Product 1',
        wholesalePrice: 1000,
      });
      await helper.createTestProduct(testAdmin, testCategory, {
        name: 'Product 2',
        wholesalePrice: 2000,
      });

      // Test category filter
      const categoryFilterResponse = await request(httpServer)
        .get(`/products?categoryId=${testCategory.id}`)
        .expect(200);

      expect(categoryFilterResponse.body.data.length).toBeGreaterThan(0);
      categoryFilterResponse.body.data.forEach((product: any) => {
        expect(product.categoryId).toBe(testCategory.id);
      });

      // Test price range filter
      const priceFilterResponse = await request(httpServer)
        .get('/products?minPrice=1500&maxPrice=2500')
        .expect(200);

      expect(priceFilterResponse.body.data.length).toBeGreaterThan(0);
      priceFilterResponse.body.data.forEach((product: any) => {
        expect(Number(product.wholesalePrice)).toBeGreaterThanOrEqual(1500);
        expect(Number(product.wholesalePrice)).toBeLessThanOrEqual(2500);
      });
    });

    it('should update product', async () => {
      const product = await helper.createTestProduct(testAdmin, testCategory);
      
      const updateData = {
        name: 'Updated Product Name',
        wholesalePrice: 1500,
        retailPrice: 2000,
        stockQuantity: 25,
      };

      const response = await request(httpServer)
        .put(`/products/${product.id}`)
        .set('Authorization', `Bearer ${testAdmin.accessToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.name).toBe(updateData.name);
      expect(Number(response.body.wholesalePrice)).toBe(updateData.wholesalePrice);
      expect(response.body.stockQuantity).toBe(updateData.stockQuantity);
    });

    it('should delete product', async () => {
      const product = await helper.createTestProduct(testAdmin, testCategory);

      await request(httpServer)
        .delete(`/products/${product.id}`)
        .set('Authorization', `Bearer ${testAdmin.accessToken}`)
        .expect(200);

      // Verify product is deleted
      await request(httpServer)
        .get(`/products/${product.id}`)
        .expect(404);
    });
  });

  describe('Product Market Data and Profitability', () => {
    let testProduct: any;

    beforeEach(async () => {
      testProduct = await helper.createTestProduct(testAdmin, testCategory);
    });

    it('should update market data', async () => {
      const marketData = {
        amazonPrice: 1800,
        rakutenPrice: 1750,
        yahooPrice: 1900,
        averageSellingPrice: 1820,
        competitorCount: 5,
        demandScore: 8.5,
        trendScore: 7.2,
      };

      const response = await request(httpServer)
        .put(`/products/${testProduct.id}/market-data`)
        .set('Authorization', `Bearer ${testAdmin.accessToken}`)
        .send(marketData)
        .expect(200);

      expect(response.body.marketData).toBeDefined();
      expect(Number(response.body.marketData.amazonPrice)).toBe(marketData.amazonPrice);
      expect(Number(response.body.marketData.averageSellingPrice)).toBe(marketData.averageSellingPrice);
    });

    it('should update profitability data', async () => {
      const profitabilityData = {
        estimatedProfit: 500,
        profitMargin: 33.33,
        roi: 50.0,
        breakEvenDays: 15,
        riskLevel: 'medium',
      };

      const response = await request(httpServer)
        .put(`/products/${testProduct.id}/profitability`)
        .set('Authorization', `Bearer ${testAdmin.accessToken}`)
        .send(profitabilityData)
        .expect(200);

      expect(response.body.profitabilityData).toBeDefined();
      expect(Number(response.body.profitabilityData.estimatedProfit)).toBe(profitabilityData.estimatedProfit);
      expect(response.body.profitabilityData.riskLevel).toBe(profitabilityData.riskLevel);
    });

    it('should validate market data fields', async () => {
      const invalidMarketData = {
        amazonPrice: -100, // Invalid negative price
        competitorCount: 'not-a-number', // Invalid type
      };

      await request(httpServer)
        .put(`/products/${testProduct.id}/market-data`)
        .set('Authorization', `Bearer ${testAdmin.accessToken}`)
        .send(invalidMarketData)
        .expect(400);
    });
  });

  describe('Product Search and Pagination', () => {
    beforeEach(async () => {
      // Create multiple products for testing
      for (let i = 1; i <= 5; i++) {
        await helper.createTestProduct(testAdmin, testCategory, {
          name: `Search Product ${i}`,
          wholesalePrice: i * 1000,
        });
      }
    });

    it('should search products by name', async () => {
      const response = await request(httpServer)
        .get('/products?search=Search Product')
        .expect(200);

      expect(response.body.data.length).toBeGreaterThan(0);
      response.body.data.forEach((product: any) => {
        expect(product.name.toLowerCase()).toContain('search product');
      });
    });

    it('should handle pagination', async () => {
      const page1Response = await request(httpServer)
        .get('/products?page=1&limit=2')
        .expect(200);

      expect(page1Response.body.data.length).toBeLessThanOrEqual(2);
      expect(page1Response.body.pagination.page).toBe(1);
      expect(page1Response.body.pagination.limit).toBe(2);
      expect(page1Response.body.pagination.hasNext).toBe(true);

      const page2Response = await request(httpServer)
        .get('/products?page=2&limit=2')
        .expect(200);

      expect(page2Response.body.pagination.page).toBe(2);
      expect(page2Response.body.pagination.hasPrev).toBe(true);
    });

    it('should sort products', async () => {
      // Sort by price ascending
      const ascResponse = await request(httpServer)
        .get('/products?sortBy=wholesalePrice&sortOrder=ASC')
        .expect(200);

      const ascPrices = ascResponse.body.data.map((p: any) => Number(p.wholesalePrice));
      expect(ascPrices).toEqual(ascPrices.slice().sort((a, b) => a - b));

      // Sort by price descending
      const descResponse = await request(httpServer)
        .get('/products?sortBy=wholesalePrice&sortOrder=DESC')
        .expect(200);

      const descPrices = descResponse.body.data.map((p: any) => Number(p.wholesalePrice));
      expect(descPrices).toEqual(descPrices.slice().sort((a, b) => b - a));
    });
  });

  describe('Bulk Operations', () => {
    let products: any[];

    beforeEach(async () => {
      products = [];
      for (let i = 1; i <= 3; i++) {
        const product = await helper.createTestProduct(testAdmin, testCategory, {
          name: `Bulk Product ${i}`,
        });
        products.push(product);
      }
    });

    it('should handle bulk status updates', async () => {
      // This would require implementing bulk update endpoint
      // For now, we'll test individual updates
      for (const product of products) {
        await request(httpServer)
          .put(`/products/${product.id}`)
          .set('Authorization', `Bearer ${testAdmin.accessToken}`)
          .send({ status: 'inactive' })
          .expect(200);
      }

      // Verify all products are inactive
      for (const product of products) {
        const response = await request(httpServer)
          .get(`/products/${product.id}`)
          .expect(200);
        
        expect(response.body.status).toBe('inactive');
      }
    });
  });

  describe('Authorization and Security', () => {
    let testProduct: any;

    beforeEach(async () => {
      testProduct = await helper.createTestProduct(testAdmin, testCategory);
    });

    it('should not allow non-admin to create products', async () => {
      const productData = {
        name: 'Unauthorized Product',
        categoryId: testCategory.id,
        wholesalePrice: 1000,
        supplier: 'Test Supplier',
      };

      await request(httpServer)
        .post('/products')
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send(productData)
        .expect(403);
    });

    it('should not allow non-admin to update products', async () => {
      await request(httpServer)
        .put(`/products/${testProduct.id}`)
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send({ name: 'Unauthorized Update' })
        .expect(403);
    });

    it('should allow users to view products', async () => {
      await request(httpServer)
        .get(`/products/${testProduct.id}`)
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .expect(200);
    });

    it('should allow anonymous users to view products', async () => {
      await request(httpServer)
        .get(`/products/${testProduct.id}`)
        .expect(200);
    });
  });
});