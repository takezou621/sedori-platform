import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { ThrottlerGuard } from '@nestjs/throttler';
import { DataSource, Repository } from 'typeorm';
import { AppModule } from '../../src/app.module';
import { User } from '../../src/users/entities/user.entity';
import { UsersService } from '../../src/users/users.service';
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
  private moduleRef: TestingModule;

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
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .overrideProvider(ConfigService)
      .useValue({
        get: (key: string) => {
          const config = {
            JWT_SECRET: '1qgHxS3/ZI/cZlomiWJEo+Ok8g8RWQoEWGcPAtE1GWw=',
            JWT_EXPIRES_IN: '1h',
            app: {
              port: 3001,
            },
            database: {
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
    this.moduleRef = moduleFixture;

    // Enable validation pipe for testing
    this.app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );

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
    // Generate highly unique email to avoid conflicts
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substr(2, 9);
    const uniqueEmail =
      userData.email || `test-${timestamp}-${randomId}@example.com`;

    // Try multiple times if email conflicts occur
    let attempts = 0;
    let response;

    while (attempts < 3) {
      try {
        const emailToTry =
          attempts === 0
            ? uniqueEmail
            : `test-${timestamp}-${randomId}-${attempts}@example.com`;

        response = await request(this.httpServer)
          .post('/auth/register')
          .send({
            name: userData.name || 'Test User',
            email: emailToTry,
            password: userData.password || 'Test123!@#',
          })
          .expect(201);

        break; // Success, exit loop
      } catch (error) {
        if (error.status === 409 && attempts < 2) {
          // Conflict, try again with different email
          attempts++;
          await this.wait(50); // Small delay
          continue;
        }
        throw error; // Re-throw if not a conflict or max attempts reached
      }
    }

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
    // Create a regular user first
    const user = await this.registerUser({
      email: `admin-${Date.now()}-${Math.random().toString(36).substr(2, 9)}@sedori.com`,
      password: 'Admin123!@#',
    });

    // Update user role directly in the database using TypeORM
    try {
      const userRepository = this.moduleRef.get<Repository<User>>(
        getRepositoryToken(User),
      );
      await userRepository.update(user.id, { role: 'admin' });
    } catch (error) {
      console.log(
        'Warning: Could not update user role via repository, trying alternative approach',
      );
      try {
        // Alternative: Get the User service directly
        const usersService = this.moduleRef.get<UsersService>(UsersService);
        await usersService.update(user.id, { role: 'admin' });
      } catch (innerError) {
        console.log(
          'Warning: Could not update user role in database, using JWT role only',
        );
      }
    }

    // Set admin role in test user object
    user.role = 'admin';

    // Create admin JWT token manually using the test JWT secret
    const jwt = require('jsonwebtoken');
    const testJwtSecret = '1qgHxS3/ZI/cZlomiWJEo+Ok8g8RWQoEWGcPAtE1GWw=';

    const payload = {
      sub: user.id,
      email: user.email,
      name: 'Test Admin',
      role: 'admin',
      plan: 'free',
      status: 'active',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour expiry
    };

    user.accessToken = jwt.sign(payload, testJwtSecret);

    return user;
  }

  async createTestUser(): Promise<TestUser> {
    return this.registerUser({
      email: `user-${Date.now()}@sedori.com`,
      password: 'User123!@#',
    });
  }

  // Category helpers
  async createTestCategory(
    admin: TestUser,
    categoryData?: Partial<TestCategory>,
  ): Promise<TestCategory> {
    const uniqueId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${process.pid}`;

    // Generate unique slug based on provided data or default
    const slug = categoryData?.slug
      ? `${categoryData.slug}-${uniqueId}`
      : `test-category-${uniqueId}`;

    // Try multiple times if slug conflicts occur
    let attempts = 0;
    let response;

    while (attempts < 3) {
      try {
        const slugToTry = attempts === 0 ? slug : `${slug}-${attempts}`;

        response = await request(this.httpServer)
          .post('/categories')
          .set('Authorization', `Bearer ${admin.accessToken}`)
          .send({
            name: categoryData?.name || `Test Category ${uniqueId}`,
            slug: slugToTry,
            description: 'Test category description',
            isActive: true,
            sortOrder: categoryData?.sortOrder || 0,
          })
          .expect(201);

        break; // Success, exit loop
      } catch (error) {
        if (error.status === 409 && attempts < 2) {
          // Conflict, try again with different slug
          attempts++;
          await this.wait(50); // Small delay
          continue;
        }
        throw error; // Re-throw if not a conflict or max attempts reached
      }
    }

    const category: TestCategory = {
      id: response.body.id,
      name: response.body.name,
      slug: response.body.slug,
    };

    this.testCategories.push(category);
    return category;
  }

  // Product helpers
  async createTestProduct(
    admin: TestUser,
    category: TestCategory,
    productData?: Partial<TestProduct>,
  ): Promise<TestProduct> {
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
  async addToCart(
    user: TestUser,
    product: TestProduct,
    quantity: number = 1,
  ): Promise<any> {
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
          city: 'Tokyo',
          state: 'Tokyo',
          postalCode: '100-0001',
          country: 'Japan',
          phone: '+81-90-1234-5678',
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
      Object.keys(filters).forEach((key) => {
        if (filters[key] !== undefined) {
          searchUrl += `&${key}=${encodeURIComponent(filters[key])}`;
        }
      });
    }

    const response = await request(this.httpServer).get(searchUrl).expect(200);

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

  async getAnalyticsDashboard(
    admin: TestUser,
    timeRange?: string,
  ): Promise<any> {
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
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  generateRandomEmail(): string {
    return `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}@example.com`;
  }

  generateRandomString(length: number = 8): string {
    return Math.random().toString(36).substr(2, length);
  }

  // Data cleanup
  async cleanupTestData(): Promise<void> {
    try {
      // Clean up database data
      if (this.httpServer && this.testUsers.length > 0) {
        // Clear carts for all test users
        for (const user of this.testUsers) {
          try {
            await request(this.httpServer)
              .delete('/carts')
              .set('Authorization', `Bearer ${user.accessToken}`)
              .send();
          } catch (error) {
            // Ignore individual cart clear errors
          }
        }
      }
    } catch (error) {
      // Ignore cleanup errors to prevent test interference
      console.warn('Cleanup warning:', error.message);
    }

    // Clean up test data arrays
    this.testUsers = [];
    this.testCategories = [];
    this.testProducts = [];
    this.testOrders = [];
  }
}
