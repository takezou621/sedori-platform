import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { E2ETestHelper } from './helpers/test-helper';

describe('Search & Analytics Flow E2E Tests', () => {
  let app: INestApplication;
  let helper: E2ETestHelper;
  let httpServer: any;
  let testAdmin: any;
  let testUser: any;
  let testCategories: any[];
  let testProducts: any[];

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

    // Create test categories
    testCategories = [];
    const categories = [
      { name: 'Electronics', slug: 'electronics' },
      { name: 'Books', slug: 'books' },
      { name: 'Clothing', slug: 'clothing' },
    ];

    for (const catData of categories) {
      const category = await helper.createTestCategory(testAdmin, catData);
      testCategories.push(category);
    }

    // Create test products with varied data for search testing
    testProducts = [];
    const products = [
      {
        name: 'iPhone 15 Pro',
        brand: 'Apple',
        categoryIndex: 0,
        price: 120000,
      },
      {
        name: 'Samsung Galaxy S24',
        brand: 'Samsung',
        categoryIndex: 0,
        price: 100000,
      },
      {
        name: 'MacBook Air M2',
        brand: 'Apple',
        categoryIndex: 0,
        price: 150000,
      },
      {
        name: 'Programming Book JavaScript',
        brand: 'TechBooks',
        categoryIndex: 1,
        price: 3000,
      },
      {
        name: 'React Development Guide',
        brand: 'TechBooks',
        categoryIndex: 1,
        price: 3500,
      },
      {
        name: 'Nike Air Max Sneakers',
        brand: 'Nike',
        categoryIndex: 2,
        price: 12000,
      },
      {
        name: 'Adidas Running Shoes',
        brand: 'Adidas',
        categoryIndex: 2,
        price: 10000,
      },
    ];

    for (const prodData of products) {
      const product = await helper.createTestProduct(
        testAdmin,
        testCategories[prodData.categoryIndex],
        {
          name: prodData.name,
          wholesalePrice: prodData.price,
        },
      );

      // Update brand
      await request(httpServer)
        .put(`/products/${product.id}`)
        .set('Authorization', `Bearer ${testAdmin.accessToken}`)
        .send({ brand: prodData.brand })
        .expect(200);

      product.brand = prodData.brand;
      testProducts.push(product);
    }

    // Wait a bit for data to be available
    await helper.wait(100);
  });

  afterEach(async () => {
    await helper.cleanupTestData();
  });

  describe('Basic Search Functionality', () => {
    it('should search products by name', async () => {
      const searchQuery = 'iPhone';

      const response = await request(httpServer)
        .get(`/search?q=${encodeURIComponent(searchQuery)}`)
        .expect(200);

      expect(response.body.products.length).toBeGreaterThan(0);
      expect(response.body.products[0].name.toLowerCase()).toContain('iphone');
      expect(response.body.query).toBe(searchQuery);
      expect(response.body.searchTime).toBeGreaterThan(0);
    });

    it('should search products by brand', async () => {
      const searchQuery = 'Apple';

      const response = await request(httpServer)
        .get(`/search?q=${encodeURIComponent(searchQuery)}`)
        .expect(200);

      expect(response.body.products.length).toBeGreaterThan(0);
      response.body.products.forEach((product: any) => {
        // Check that product is from Apple brand or contains Apple in name/description
        const hasApple = product.brand?.toLowerCase().includes('apple') ||
                        product.name?.toLowerCase().includes('apple') ||
                        product.description?.toLowerCase().includes('apple');
        expect(hasApple).toBeTruthy();
      });
    });

    it('should return empty results for non-existent products', async () => {
      const searchQuery = 'NonExistentProduct12345';

      const response = await request(httpServer)
        .get(`/search?q=${encodeURIComponent(searchQuery)}`)
        .expect(200);

      expect(response.body.products.length).toBe(0);
      expect(response.body.total).toBe(0);
    });

    it('should handle special characters in search', async () => {
      const searchQuery = 'iPhone 15 Pro';

      const response = await request(httpServer)
        .get(`/search?q=${encodeURIComponent(searchQuery)}`)
        .expect(200);

      expect(response.body.products.length).toBeGreaterThan(0);
    });

    it('should search case-insensitively', async () => {
      const searchQueries = ['iphone', 'IPHONE', 'iPhone', 'IpHoNe'];

      for (const query of searchQueries) {
        const response = await request(httpServer)
          .get(`/search?q=${encodeURIComponent(query)}`)
          .expect(200);

        expect(response.body.products.length).toBeGreaterThan(0);
        expect(response.body.products[0].name.toLowerCase()).toContain(
          'iphone',
        );
      }
    });
  });

  describe('Advanced Search Filtering', () => {
    it('should filter by category', async () => {
      const electronicsCategory = testCategories[0];

      const response = await request(httpServer)
        .get(`/search?categoryId=${electronicsCategory.id}`)
        .expect(200);

      expect(response.body.products.length).toBeGreaterThan(0);
      response.body.products.forEach((product: any) => {
        expect(product.categoryId).toBe(electronicsCategory.id);
      });
    });

    it('should filter by price range', async () => {
      const minPrice = 10000;
      const maxPrice = 50000;

      const response = await request(httpServer)
        .get(`/search?priceRange[min]=${minPrice}&priceRange[max]=${maxPrice}`)
        .expect(200);

      expect(response.body.products.length).toBeGreaterThan(0);
      response.body.products.forEach((product: any) => {
        expect(Number(product.wholesalePrice)).toBeGreaterThanOrEqual(minPrice);
        expect(Number(product.wholesalePrice)).toBeLessThanOrEqual(maxPrice);
      });
    });

    it('should filter by brand', async () => {
      const brand = 'Apple';

      const response = await request(httpServer)
        .get(`/search?brands[]=${encodeURIComponent(brand)}`)
        .expect(200);

      expect(response.body.products.length).toBeGreaterThan(0);
      response.body.products.forEach((product: any) => {
        expect(product.brand).toBe(brand);
      });
    });

    it('should filter by multiple brands', async () => {
      const brands = ['Apple', 'Samsung'];
      const brandQuery = brands
        .map((b) => `brands[]=${encodeURIComponent(b)}`)
        .join('&');

      const response = await request(httpServer)
        .get(`/search?${brandQuery}`)
        .expect(200);

      expect(response.body.products.length).toBeGreaterThan(0);
      response.body.products.forEach((product: any) => {
        expect(brands).toContain(product.brand);
      });
    });

    it('should combine multiple filters', async () => {
      const electronicsCategory = testCategories[0];
      const minPrice = 10000;
      const maxPrice = 200000;
      const brand = 'Apple';

      const response = await request(httpServer)
        .get(
          `/search?categoryId=${electronicsCategory.id}&priceRange[min]=${minPrice}&priceRange[max]=${maxPrice}&brands[]=${brand}`,
        )
        .expect(200);

      expect(response.body.products.length).toBeGreaterThan(0);
      response.body.products.forEach((product: any) => {
        expect(product.categoryId).toBe(electronicsCategory.id);
        expect(Number(product.wholesalePrice)).toBeGreaterThanOrEqual(minPrice);
        expect(Number(product.wholesalePrice)).toBeLessThanOrEqual(maxPrice);
        expect(product.brand).toBe(brand);
      });
    });
  });

  describe('Search Sorting and Pagination', () => {
    it('should sort by price ascending', async () => {
      const response = await request(httpServer)
        .get('/search?sortBy=price_asc&limit=10')
        .expect(200);

      const prices = response.body.products.map((p: any) =>
        Number(p.wholesalePrice),
      );
      const sortedPrices = [...prices].sort((a, b) => a - b);
      expect(prices).toEqual(sortedPrices);
    });

    it('should sort by price descending', async () => {
      const response = await request(httpServer)
        .get('/search?sortBy=price_desc&limit=10')
        .expect(200);

      const prices = response.body.products.map((p: any) =>
        Number(p.wholesalePrice),
      );
      const sortedPrices = [...prices].sort((a, b) => b - a);
      expect(prices).toEqual(sortedPrices);
    });

    it('should sort by name ascending', async () => {
      const response = await request(httpServer)
        .get('/search?sortBy=name_asc&limit=10')
        .expect(200);

      const names = response.body.products.map((p: any) => p.name);
      const sortedNames = [...names].sort();
      expect(names).toEqual(sortedNames);
    });

    it('should handle pagination', async () => {
      const page1Response = await request(httpServer)
        .get('/search?page=1&limit=3')
        .expect(200);

      expect(page1Response.body.products.length).toBeLessThanOrEqual(3);
      expect(page1Response.body.pagination.page).toBe(1);
      expect(page1Response.body.pagination.limit).toBe(3);

      if (page1Response.body.pagination.hasNext) {
        const page2Response = await request(httpServer)
          .get('/search?page=2&limit=3')
          .expect(200);

        expect(page2Response.body.pagination.page).toBe(2);
        expect(page2Response.body.pagination.hasPrev).toBe(true);
      }
    });
  });

  describe('Faceted Search', () => {
    it('should return facets when requested', async () => {
      const response = await request(httpServer)
        .get('/search?includeFacets=true')
        .expect(200);

      expect(response.body.facets).toBeDefined();
      expect(Array.isArray(response.body.facets)).toBe(true);

      const categoryFacet = response.body.facets.find(
        (f: any) => f.name === 'category',
      );
      if (categoryFacet) {
        expect(categoryFacet.label).toBeTruthy();
        expect(Array.isArray(categoryFacet.values)).toBe(true);
        expect(categoryFacet.values.length).toBeGreaterThan(0);
      }
    });

    it('should get facets separately', async () => {
      const response = await request(httpServer)
        .get('/search/facets?q=electronics')
        .expect(200);

      expect(response.body.facets).toBeDefined();
      expect(Array.isArray(response.body.facets)).toBe(true);
    });
  });

  describe('Search Suggestions', () => {
    it('should provide search suggestions', async () => {
      const response = await request(httpServer)
        .get('/search/suggestions?q=iPh&limit=5')
        .expect(200);

      expect(response.body.suggestions).toBeDefined();
      expect(Array.isArray(response.body.suggestions)).toBe(true);
      expect(response.body.suggestions.length).toBeLessThanOrEqual(5);
    });

    it('should return relevant suggestions', async () => {
      const response = await request(httpServer)
        .get('/search/suggestions?q=Book&limit=10')
        .expect(200);

      if (response.body.suggestions.length > 0) {
        response.body.suggestions.forEach((suggestion: string) => {
          expect(suggestion.toLowerCase()).toContain('book');
        });
      }
    });
  });

  describe('Category Search', () => {
    it('should search categories', async () => {
      const response = await request(httpServer)
        .get('/search?type=categories&q=Electronics')
        .expect(200);

      expect(response.body.categories.length).toBeGreaterThan(0);
      expect(response.body.categories[0].name.toLowerCase()).toContain(
        'electronics',
      );
    });

    it('should search both products and categories', async () => {
      const response = await request(httpServer)
        .get('/search?type=all&q=Electronics')
        .expect(200);

      expect(response.body.products.length).toBeGreaterThan(0);
      expect(response.body.categories.length).toBeGreaterThan(0);
    });
  });

  describe('Analytics Event Tracking', () => {
    it('should track search events', async () => {
      const searchQuery = 'test search';

      // Perform search
      await request(httpServer)
        .get(`/search?q=${encodeURIComponent(searchQuery)}`)
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .expect(200);

      // Check if analytics event was created (would need analytics dashboard access)
      const analyticsResponse = await request(httpServer)
        .get('/analytics/dashboard?timeRange=today')
        .set('Authorization', `Bearer ${testAdmin.accessToken}`)
        .expect(200);

      // Should have some metrics
      expect(analyticsResponse.body.metrics).toBeDefined();
    });

    it('should track product click events', async () => {
      const product = testProducts[0];
      const trackData = {
        productId: product.id,
        query: 'test search',
        position: 1,
      };

      const response = await request(httpServer)
        .post('/search/track-click')
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send(trackData)
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    it('should track custom analytics events', async () => {
      const eventData = {
        eventType: 'product_view',
        productId: testProducts[0].id,
        properties: {
          source: 'search_results',
          position: 1,
        },
      };

      const response = await request(httpServer)
        .post('/analytics/track')
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send(eventData)
        .expect(201);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Analytics Dashboard', () => {
    beforeEach(async () => {
      // Track some events for analytics
      await helper.trackEvent(testUser, {
        eventType: 'product_view',
        productId: testProducts[0].id,
      });

      await helper.trackEvent(testUser, {
        eventType: 'product_search',
        properties: { query: 'test search' },
      });

      await helper.trackEvent(testUser, {
        eventType: 'cart_add',
        productId: testProducts[0].id,
      });
    });

    it('should get analytics dashboard (admin only)', async () => {
      const response = await request(httpServer)
        .get('/analytics/dashboard')
        .set('Authorization', `Bearer ${testAdmin.accessToken}`)
        .expect(200);

      expect(response.body.metrics).toBeDefined();
      expect(response.body.timeSeries).toBeDefined();
      expect(response.body.topProducts).toBeDefined();
      expect(response.body.topCategories).toBeDefined();
      expect(response.body.userBehavior).toBeDefined();
      expect(response.body.period).toBeDefined();
    });

    it('should not allow non-admin to access analytics', async () => {
      await request(httpServer)
        .get('/analytics/dashboard')
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .expect(403);
    });

    it('should get metrics with different time ranges', async () => {
      const timeRanges = ['today', 'yesterday', 'last_7_days', 'last_30_days'];

      for (const timeRange of timeRanges) {
        const response = await request(httpServer)
          .get(`/analytics/metrics?timeRange=${timeRange}`)
          .set('Authorization', `Bearer ${testAdmin.accessToken}`)
          .expect(200);

        expect(response.body.metrics).toBeDefined();
        expect(response.body.period).toBeDefined();
      }
    });

    it('should get time series data', async () => {
      const response = await request(httpServer)
        .get('/analytics/time-series?groupBy=day')
        .set('Authorization', `Bearer ${testAdmin.accessToken}`)
        .expect(200);

      expect(response.body.timeSeries).toBeDefined();
      expect(Array.isArray(response.body.timeSeries)).toBe(true);
    });

    it('should get top products analytics', async () => {
      const response = await request(httpServer)
        .get('/analytics/top-products')
        .set('Authorization', `Bearer ${testAdmin.accessToken}`)
        .expect(200);

      expect(response.body.topProducts).toBeDefined();
      expect(Array.isArray(response.body.topProducts)).toBe(true);
    });

    it('should get user behavior analytics', async () => {
      const response = await request(httpServer)
        .get('/analytics/user-behavior')
        .set('Authorization', `Bearer ${testAdmin.accessToken}`)
        .expect(200);

      expect(response.body.userBehavior).toBeDefined();
      expect(response.body.userBehavior.sessions).toBeDefined();
      expect(response.body.userBehavior.newUserRate).toBeDefined();
      expect(response.body.userBehavior.returningUserRate).toBeDefined();
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle empty search queries', async () => {
      const response = await request(httpServer).get('/search?q=').expect(200);

      expect(response.body.products).toBeDefined();
      expect(response.body.total).toBeGreaterThan(0);
    });

    it('should handle very long search queries', async () => {
      const longQuery = 'a'.repeat(1000);

      const response = await request(httpServer)
        .get(`/search?q=${encodeURIComponent(longQuery)}`)
        .expect(200);

      expect(response.body.products).toBeDefined();
      expect(response.body.searchTime).toBeGreaterThan(0);
    });

    it('should handle special characters', async () => {
      const specialQuery = '!@#$%^&*()_+-=[]{}|;:,.<>?';

      const response = await request(httpServer)
        .get(`/search?q=${encodeURIComponent(specialQuery)}`)
        .expect(200);

      expect(response.body.products).toBeDefined();
    });

    it('should have reasonable search performance', async () => {
      const startTime = Date.now();

      const response = await request(httpServer)
        .get('/search?q=electronics&includeFacets=true&limit=20')
        .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(response.body.searchTime).toBeLessThan(2000); // Search itself should be under 2 seconds
    });

    it('should handle concurrent search requests', async () => {
      const promises = [];

      for (let i = 0; i < 5; i++) {
        promises.push(
          request(httpServer).get(`/search?q=product${i}`).expect(200),
        );
      }

      const responses = await Promise.all(promises);

      responses.forEach((response, index) => {
        expect(response.body.products).toBeDefined();
        expect(response.body.searchTime).toBeGreaterThan(0);
      });
    });
  });
});
