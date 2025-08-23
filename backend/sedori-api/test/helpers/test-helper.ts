import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { AppModule } from '../../src/app.module';
import request from 'supertest';

export interface TestUser {
  id: string;
  email: string;
  password: string;
  role: 'admin' | 'user';
  accessToken?: string;
}

export interface TestProduct {
  id: string;
  name: string;
  categoryId: string;
  wholesalePrice: number;
}

export interface TestCategory {
  id: string;
  name: string;
  slug: string;
}

export class E2ETestHelper {
  private app: INestApplication;
  private httpServer: any;
  
  // Test data
  public testUsers: TestUser[] = [];
  public testCategories: TestCategory[] = [];
  public testProducts: TestProduct[] = [];
  public testOrders: any[] = [];

  async setupTestApp(): Promise<INestApplication> {
    // Use PostgreSQL for E2E testing
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: 'localhost',
          port: 5432,
          username: 'sedori',
          password: 'sedori123',
          database: 'sedori_e2e',
          entities: [__dirname + '/../../src/**/*.entity{.ts,.js}'],
          synchronize: true,
          dropSchema: true,
          autoLoadEntities: true,
          logging: false,
        }),
        require('../../src/auth/auth.module').AuthModule,
        require('../../src/users/users.module').UsersModule,
        require('../../src/products/products.module').ProductsModule,
        require('../../src/categories/categories.module').CategoriesModule,
        require('../../src/carts/carts.module').CartsModule,
        require('../../src/orders/orders.module').OrdersModule,
        require('../../src/analytics/analytics.module').AnalyticsModule,
        require('../../src/search/search.module').SearchModule,
      ],
    })
    .overrideProvider(ConfigService)
    .useValue({
      get: (key: string) => {
        const config = {
          'JWT_SECRET': 'super-secret-test-key-for-e2e-testing-only',
          'JWT_EXPIRES_IN': '1h',
          'app': {
            port: 3001,
          },
          'database': {
            type: 'postgres',
            host: 'localhost',
            port: 5432,
            username: 'sedori',
            password: 'sedori123',
            database: 'sedori_e2e',
          },
        };
        return config[key] || config;
      },
    })
    .compile();

    this.app = moduleFixture.createNestApplication();
    await this.app.init();
    this.httpServer = this.app.getHttpServer();
    
    return this.app;
  }

  async teardownTestApp(): Promise<void> {
    if (this.app) {
      await this.app.close();
    }
  }

  getHttpServer() {
    return this.httpServer;
  }

  // Authentication helpers
  async registerUser(userData: Partial<TestUser>): Promise<TestUser> {
    const response = await request(this.httpServer)
      .post('/auth/register')
      .send({
        name: 'Test User',
        email: userData.email || `test${Date.now()}@example.com`,
        password: userData.password || 'Test123!@#',
        role: userData.role || 'user',
      })
      .expect(201);

    const user: TestUser = {
      id: response.body.user.id,
      email: response.body.user.email,
      password: userData.password || 'Test123!@#',
      role: response.body.user.role,
      accessToken: response.body.accessToken,
    };

    this.testUsers.push(user);
    return user;
  }

  async loginUser(email: string, password: string): Promise<string> {
    const response = await request(this.httpServer)
      .post('/auth/login')
      .send({ email, password })
      .expect(200);

    return response.body.accessToken;
  }

  async createTestAdmin(): Promise<TestUser> {
    return this.registerUser({
      email: `admin-${Date.now()}@sedori.com`,
      password: 'Admin123!@#',
      role: 'admin',
    });
  }

  async createTestUser(): Promise<TestUser> {
    return this.registerUser({
      email: `user-${Date.now()}@sedori.com`,
      password: 'User123!@#',
      role: 'user',
    });
  }

  // Category helpers
  async createTestCategory(admin: TestUser, categoryData?: Partial<TestCategory>): Promise<TestCategory> {
    const response = await request(this.httpServer)
      .post('/categories')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({
        name: categoryData?.name || `Test Category ${Date.now()}`,
        slug: categoryData?.slug || `test-category-${Date.now()}`,
        description: 'Test category description',
        isActive: true,
        sortOrder: 0,
      })
      .expect(201);

    const category: TestCategory = {
      id: response.body.id,
      name: response.body.name,
      slug: response.body.slug,
    };

    this.testCategories.push(category);
    return category;
  }

  // Product helpers
  async createTestProduct(admin: TestUser, category: TestCategory, productData?: Partial<TestProduct>): Promise<TestProduct> {
    const response = await request(this.httpServer)
      .post('/products')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({
        name: productData?.name || `Test Product ${Date.now()}`,
        description: 'Test product description',
        categoryId: category.id,
        wholesalePrice: productData?.wholesalePrice || 1000,
        retailPrice: 1500,
        currency: 'JPY',
        condition: 'new',
        status: 'active',
        supplier: 'Test Supplier',
        stockQuantity: 10,
        brand: 'Test Brand',
        model: 'Test Model',
      })
      .expect(201);

    const product: TestProduct = {
      id: response.body.id,
      name: response.body.name,
      categoryId: response.body.categoryId,
      wholesalePrice: response.body.wholesalePrice,
    };

    this.testProducts.push(product);
    return product;
  }

  // Cart helpers
  async addToCart(user: TestUser, product: TestProduct, quantity: number = 1): Promise<any> {
    return request(this.httpServer)
      .post('/carts/items')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send({
        productId: product.id,
        quantity,
      })
      .expect(201);
  }

  async getCart(user: TestUser): Promise<any> {
    const response = await request(this.httpServer)
      .get('/carts')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .expect(200);

    return response.body;
  }

  // Order helpers
  async createOrder(user: TestUser, orderData?: any): Promise<any> {
    const response = await request(this.httpServer)
      .post('/orders')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send({
        shippingAddress: {
          fullName: 'Test User',
          address1: '123 Test Street',
          city: 'Test City',
          state: 'Test State',
          postalCode: '123-4567',
          country: 'Japan',
        },
        paymentMethod: 'credit_card',
        ...orderData,
      })
      .expect(201);

    this.testOrders.push(response.body);
    return response.body;
  }

  // Search helpers
  async searchProducts(query: string, filters?: any): Promise<any> {
    let searchUrl = `/search?q=${encodeURIComponent(query)}`;
    
    if (filters) {
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined) {
          searchUrl += `&${key}=${encodeURIComponent(filters[key])}`;
        }
      });
    }

    const response = await request(this.httpServer)
      .get(searchUrl)
      .expect(200);

    return response.body;
  }

  // Analytics helpers
  async trackEvent(user: TestUser, eventData: any): Promise<any> {
    return request(this.httpServer)
      .post('/analytics/track')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send(eventData)
      .expect(201);
  }

  async getAnalyticsDashboard(admin: TestUser, timeRange?: string): Promise<any> {
    let url = '/analytics/dashboard';
    if (timeRange) {
      url += `?timeRange=${timeRange}`;
    }

    const response = await request(this.httpServer)
      .get(url)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);

    return response.body;
  }

  // Utility methods
  async wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  generateRandomEmail(): string {
    return `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}@example.com`;
  }

  generateRandomString(length: number = 8): string {
    return Math.random().toString(36).substr(2, length);
  }

  // Data cleanup
  async cleanupTestData(): Promise<void> {
    // This would clean up test data in a real implementation
    // For in-memory database, it's handled by dropSchema
    this.testUsers = [];
    this.testCategories = [];
    this.testProducts = [];
    this.testOrders = [];
  }
}