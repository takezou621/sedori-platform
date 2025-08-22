import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as request from 'supertest';
import { ProductsModule } from './products.module';
import {
  Product,
  ProductStatus,
  ProductCondition,
} from './entities/product.entity';
import { Category } from '../categories/entities/category.entity';
import { CreateProductDto, UpdateProductDto } from './dto';

describe('ProductsController (e2e)', () => {
  let app: INestApplication;

  const mockJwtAuthGuard = { canActivate: jest.fn(() => true) };
  const mockRolesGuard = { canActivate: jest.fn(() => true) };

  const mockCategory = {
    id: '123e4567-e89b-12d3-a456-426614174001',
    name: 'Test Category',
    description: 'Test Category Description',
  };

  const mockProduct = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Test Product',
    description: 'Test Description',
    categoryId: mockCategory.id,
    wholesalePrice: 100,
    retailPrice: 150,
    currency: 'JPY',
    condition: ProductCondition.NEW,
    status: ProductStatus.ACTIVE,
    supplier: 'Test Supplier',
    viewCount: 0,
    averageRating: 0,
    reviewCount: 0,
    weightUnit: 'kg',
    createdAt: new Date(),
    updatedAt: new Date(),
    lastUpdatedAt: new Date(),
    category: mockCategory,
  };

  const mockProductRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
    increment: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockCategoryRepository = {
    findOne: jest.fn(),
  };

  const mockQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
    getMany: jest.fn(),
    getManyAndCount: jest.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ProductsModule],
    })
      .overrideProvider(getRepositoryToken(Product))
      .useValue(mockProductRepository)
      .overrideProvider(getRepositoryToken(Category))
      .useValue(mockCategoryRepository)
      .overrideGuard('JwtAuthGuard')
      .useValue(mockJwtAuthGuard)
      .overrideGuard('RolesGuard')
      .useValue(mockRolesGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /products', () => {
    it('should create a new product', async () => {
      const createProductDto: CreateProductDto = {
        name: 'Test Product',
        categoryId: mockCategory.id,
        wholesalePrice: 100,
        supplier: 'Test Supplier',
      };

      mockProductRepository.create.mockReturnValue(mockProduct);
      mockProductRepository.save.mockResolvedValue(mockProduct);

      const response = await request(app.getHttpServer())
        .post('/products')
        .send(createProductDto)
        .expect(201);

      expect(response.body.name).toBe(createProductDto.name);
      expect(response.body.wholesalePrice).toBe(
        createProductDto.wholesalePrice,
      );
    });

    it('should return 400 for invalid data', async () => {
      const invalidData = {
        name: '', // Empty name should fail validation
        wholesalePrice: -10, // Negative price should fail validation
      };

      await request(app.getHttpServer())
        .post('/products')
        .send(invalidData)
        .expect(400);
    });
  });

  describe('GET /products', () => {
    it('should return paginated products', async () => {
      mockProductRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockProduct], 1]);

      const response = await request(app.getHttpServer())
        .get('/products')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.pagination.total).toBe(1);
    });

    it('should accept query parameters', async () => {
      mockProductRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockProduct], 1]);

      await request(app.getHttpServer())
        .get('/products')
        .query({
          page: 1,
          limit: 10,
          search: 'test',
          status: ProductStatus.ACTIVE,
        })
        .expect(200);
    });
  });

  describe('GET /products/:id', () => {
    it('should return a product by id', async () => {
      const productId = '123e4567-e89b-12d3-a456-426614174000';

      mockProductRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );
      mockQueryBuilder.getOne.mockResolvedValue(mockProduct);
      mockProductRepository.increment.mockResolvedValue({ affected: 1 });

      const response = await request(app.getHttpServer())
        .get(`/products/${productId}`)
        .expect(200);

      expect(response.body.id).toBe(productId);
      expect(response.body.name).toBe(mockProduct.name);
    });

    it('should return 404 for non-existent product', async () => {
      const productId = '123e4567-e89b-12d3-a456-426614174999';

      mockProductRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );
      mockQueryBuilder.getOne.mockResolvedValue(null);

      await request(app.getHttpServer())
        .get(`/products/${productId}`)
        .expect(404);
    });

    it('should return 400 for invalid UUID', async () => {
      await request(app.getHttpServer())
        .get('/products/invalid-uuid')
        .expect(400);
    });
  });

  describe('PUT /products/:id', () => {
    it('should update a product', async () => {
      const productId = '123e4567-e89b-12d3-a456-426614174000';
      const updateProductDto: UpdateProductDto = {
        name: 'Updated Product',
        wholesalePrice: 120,
      };

      const updatedProduct = { ...mockProduct, ...updateProductDto };

      mockProductRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );
      mockQueryBuilder.getOne.mockResolvedValue(mockProduct);
      mockProductRepository.save.mockResolvedValue(updatedProduct);

      const response = await request(app.getHttpServer())
        .put(`/products/${productId}`)
        .send(updateProductDto)
        .expect(200);

      expect(response.body.name).toBe(updateProductDto.name);
      expect(response.body.wholesalePrice).toBe(
        updateProductDto.wholesalePrice,
      );
    });

    it('should return 404 for non-existent product', async () => {
      const productId = '123e4567-e89b-12d3-a456-426614174999';

      mockProductRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );
      mockQueryBuilder.getOne.mockResolvedValue(null);

      await request(app.getHttpServer())
        .put(`/products/${productId}`)
        .send({ name: 'Updated Name' })
        .expect(404);
    });
  });

  describe('DELETE /products/:id', () => {
    it('should delete a product', async () => {
      const productId = '123e4567-e89b-12d3-a456-426614174000';

      mockProductRepository.softDelete.mockResolvedValue({ affected: 1 });

      await request(app.getHttpServer())
        .delete(`/products/${productId}`)
        .expect(204);
    });

    it('should return 404 for non-existent product', async () => {
      const productId = '123e4567-e89b-12d3-a456-426614174999';

      mockProductRepository.softDelete.mockResolvedValue({ affected: 0 });

      await request(app.getHttpServer())
        .delete(`/products/${productId}`)
        .expect(404);
    });
  });

  describe('GET /products/category/:categoryId', () => {
    it('should return products by category', async () => {
      const categoryId = '123e4567-e89b-12d3-a456-426614174001';

      mockProductRepository.find.mockResolvedValue([mockProduct]);

      const response = await request(app.getHttpServer())
        .get(`/products/category/${categoryId}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body[0].categoryId).toBe(categoryId);
    });
  });

  describe('GET /products/sku/:sku', () => {
    it('should return product by SKU', async () => {
      const sku = 'TEST-SKU-001';
      const productWithSku = { ...mockProduct, sku };

      mockProductRepository.findOne.mockResolvedValue(productWithSku);

      const response = await request(app.getHttpServer())
        .get(`/products/sku/${sku}`)
        .expect(200);

      expect(response.body.sku).toBe(sku);
    });

    it('should return 404 for non-existent SKU', async () => {
      const sku = 'NON-EXISTENT-SKU';

      mockProductRepository.findOne.mockResolvedValue(null);

      await request(app.getHttpServer())
        .get(`/products/sku/${sku}`)
        .expect(404);
    });
  });

  describe('GET /products/supplier/:supplier', () => {
    it('should return products by supplier', async () => {
      const supplier = 'Test Supplier';

      mockProductRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );
      mockQueryBuilder.getMany.mockResolvedValue([mockProduct]);

      const response = await request(app.getHttpServer())
        .get(`/products/supplier/${supplier}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body[0].supplier).toBe(supplier);
    });
  });

  describe('PUT /products/:id/market-data', () => {
    it('should update market data', async () => {
      const productId = '123e4567-e89b-12d3-a456-426614174000';
      const marketData = {
        amazonPrice: 150,
        rakutenPrice: 145,
      };

      mockProductRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );
      mockQueryBuilder.getOne.mockResolvedValue(mockProduct);
      mockProductRepository.update.mockResolvedValue({ affected: 1 });

      await request(app.getHttpServer())
        .put(`/products/${productId}/market-data`)
        .send(marketData)
        .expect(204);
    });
  });

  describe('PUT /products/:id/profitability-data', () => {
    it('should update profitability data', async () => {
      const productId = '123e4567-e89b-12d3-a456-426614174000';
      const profitabilityData = {
        estimatedProfit: 50,
        profitMargin: 20,
      };

      mockProductRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );
      mockQueryBuilder.getOne.mockResolvedValue(mockProduct);
      mockProductRepository.update.mockResolvedValue({ affected: 1 });

      await request(app.getHttpServer())
        .put(`/products/${productId}/profitability-data`)
        .send(profitabilityData)
        .expect(204);
    });
  });
});
