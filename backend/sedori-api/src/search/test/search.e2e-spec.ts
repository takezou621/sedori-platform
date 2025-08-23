import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { SearchModule } from '../search.module';
import { Product } from '../../products/entities/product.entity';
import { Category } from '../../categories/entities/category.entity';
import { ProductsModule } from '../../products/products.module';
import { CategoriesModule } from '../../categories/categories.module';
import { AnalyticsModule } from '../../analytics/analytics.module';
import { testConfig } from '../../config/test.config';
import { AuthModule } from '../../auth/auth.module';
import { UsersModule } from '../../users/users.module';
import { ThrottlerModule } from '@nestjs/throttler';

describe('SearchController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [testConfig],
        }),
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: process.env.TEST_DATABASE_HOST || 'localhost',
          port: parseInt(process.env.TEST_DATABASE_PORT || '5432'),
          username: process.env.TEST_DATABASE_USERNAME || 'sedori',
          password: process.env.TEST_DATABASE_PASSWORD || 'sedori123',
          database: process.env.TEST_DATABASE_NAME || 'sedori_test',
          entities: [Product, Category],
          synchronize: true,
          logging: false,
        }),
        ThrottlerModule.forRoot([
          {
            ttl: 60000,
            limit: 1000,
          },
        ]),
        SearchModule,
        ProductsModule,
        CategoriesModule,
        AnalyticsModule,
        AuthModule,
        UsersModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('/search (GET) - basic search should work with PostgreSQL fallback', async () => {
    const response = await request(app.getHttpServer())
      .get('/search')
      .query({ q: 'test', limit: 10, page: 1 })
      .expect(200);

    expect(response.body).toHaveProperty('products');
    expect(response.body).toHaveProperty('categories');
    expect(response.body).toHaveProperty('total');
    expect(response.body).toHaveProperty('pagination');
    expect(response.body).toHaveProperty('searchTime');
    expect(response.body.searchTime).toBeGreaterThan(0);
  });

  it('/search (GET) - should handle empty search', async () => {
    const response = await request(app.getHttpServer())
      .get('/search')
      .query({ limit: 10, page: 1 })
      .expect(200);

    expect(response.body).toHaveProperty('products');
    expect(response.body).toHaveProperty('categories');
    expect(response.body).toHaveProperty('total');
  });

  it('/search (GET) - should respect filters', async () => {
    const response = await request(app.getHttpServer())
      .get('/search')
      .query({ 
        q: 'test', 
        categoryId: '123e4567-e89b-12d3-a456-426614174000',
        priceMin: 100,
        priceMax: 500,
        inStockOnly: true,
        limit: 10, 
        page: 1 
      })
      .expect(200);

    expect(response.body).toHaveProperty('products');
    expect(response.body).toHaveProperty('total');
  });

  it('/search (GET) - should handle facets', async () => {
    const response = await request(app.getHttpServer())
      .get('/search')
      .query({ 
        q: 'test', 
        includeFacets: true,
        limit: 10, 
        page: 1 
      })
      .expect(200);

    expect(response.body).toHaveProperty('facets');
  });

  it('/search (GET) - should handle different sort options', async () => {
    const sortOptions = [
      'relevance',
      'price_asc', 
      'price_desc',
      'name_asc',
      'name_desc',
      'newest',
      'popularity',
      'rating'
    ];

    for (const sortBy of sortOptions) {
      const response = await request(app.getHttpServer())
        .get('/search')
        .query({ 
          q: 'test', 
          sortBy,
          limit: 10, 
          page: 1 
        })
        .expect(200);

      expect(response.body).toHaveProperty('products');
      expect(response.body).toHaveProperty('total');
    }
  });

  it('/search (GET) - should handle pagination', async () => {
    const response = await request(app.getHttpServer())
      .get('/search')
      .query({ 
        q: 'test', 
        limit: 5, 
        page: 2 
      })
      .expect(200);

    expect(response.body.pagination).toMatchObject({
      page: 2,
      limit: 5,
    });
    expect(response.body.pagination).toHaveProperty('total');
    expect(response.body.pagination).toHaveProperty('totalPages');
    expect(response.body.pagination).toHaveProperty('hasNext');
    expect(response.body.pagination).toHaveProperty('hasPrev');
  });

  it('/search (GET) - should generate suggestions', async () => {
    const response = await request(app.getHttpServer())
      .get('/search')
      .query({ 
        q: 'laptop', 
        limit: 10, 
        page: 1 
      })
      .expect(200);

    expect(response.body).toHaveProperty('suggestions');
  });
});